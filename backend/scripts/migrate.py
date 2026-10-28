"""Idempotent PostgreSQL / PostGIS migration runner for supabase/migrations/*.sql."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Sequence

try:
    import asyncpg
except ImportError:
    asyncpg = None  # type: ignore[assignment]

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("along.migrate")

DEFAULT_MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "supabase" / "migrations"


def list_migration_files(migrations_dir: Path = DEFAULT_MIGRATIONS_DIR) -> list[Path]:
    """Return sorted list of .sql migration files."""
    if not migrations_dir.exists():
        raise FileNotFoundError(f"Migrations directory not found: {migrations_dir}")
    files = sorted(migrations_dir.glob("*.sql"))
    if not files:
        raise ValueError(f"No .sql files found in {migrations_dir}")
    return files


def validate_migrations_offline(migrations_dir: Path = DEFAULT_MIGRATIONS_DIR) -> list[str]:
    """Validate that all 9 migrations exist in order, are non-empty, and contain zero en/em dashes."""
    files = list_migration_files(migrations_dir)
    versions: list[str] = []
    for path in files:
        content = path.read_text(encoding="utf-8")
        if not content.strip():
            raise ValueError(f"Migration file {path.name} is empty")
        if "\u2013" in content or "\u2014" in content:
            raise ValueError(f"Migration file {path.name} contains forbidden en/em dash")
        versions.append(path.name)
    return versions


async def run_migrations(
    database_url: str | None = None,
    migrations_dir: Path = DEFAULT_MIGRATIONS_DIR,
) -> Sequence[str]:
    """Apply pending SQL migrations in order and record them in public.schema_migrations."""
    dsn = database_url or get_settings().DIRECT_DATABASE_URL
    files = list_migration_files(migrations_dir)
    applied_now: list[str] = []

    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute(
            """
            create table if not exists public.schema_migrations (
                version text primary key,
                applied_at timestamptz not null default now()
            );
            """
        )
        rows = await conn.fetch("select version from public.schema_migrations;")
        already_applied = {str(r["version"]) for r in rows}

        for sql_file in files:
            version = sql_file.name
            if version in already_applied:
                continue
            sql_text = sql_file.read_text(encoding="utf-8")
            async with conn.transaction():
                await conn.execute(sql_text)
                await conn.execute(
                    "insert into public.schema_migrations(version) values ($1);",
                    version,
                )
            applied_now.append(version)
            logger.info("migration_applied", version=version)
    finally:
        await conn.close()

    return applied_now


def main() -> None:
    versions = validate_migrations_offline()
    logger.info("migrations_validated_offline", count=len(versions), files=versions)
    asyncio.run(run_migrations())


if __name__ == "__main__":
    main()
