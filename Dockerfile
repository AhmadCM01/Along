FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    PORT=7860

WORKDIR /app

# Install basic runtime tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (appuser, uid 1000) for security
RUN useradd -m -u 1000 appuser

# Copy dependency definition and install packages
COPY backend/pyproject.toml /app/backend/pyproject.toml
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e "/app/backend[ai]"

# Copy backend application and required seed / data assets
COPY backend /app/backend
COPY supabase/seed /app/supabase/seed
COPY data/corridor /app/data/corridor
COPY data/faiss /app/data/faiss
COPY data/replays /app/data/replays

# Ensure ownership for non-root user
RUN chown -R appuser:appuser /app

USER appuser
WORKDIR /app/backend

EXPOSE 7860

CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
