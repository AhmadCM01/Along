"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";

export interface HeaderProps {
  activeLocale?: "en" | "pcm" | "ha";
  onChangeLocale?: (locale: "en" | "pcm" | "ha") => void;
  activeShareToken?: string | null;
  onToggleBehindTheScenes?: () => void;
  behindTheScenesOpen?: boolean;
}

export function Header({
  activeLocale = "en",
  onChangeLocale,
  activeShareToken,
  onToggleBehindTheScenes,
  behindTheScenesOpen = false,
}: HeaderProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const current = document.documentElement.getAttribute("data-theme") as "light" | "dark";
      if (current) setTheme(current);
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("along-theme", next);
    } catch {}
  };

  const familyHref = activeShareToken ? `/t/${activeShareToken}` : "/t/tok_demo_family_123";

  return (
    <header
      style={{
        width: "100%",
        maxWidth: 1280,
        margin: "0 auto",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-paper)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Brand Wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/" aria-label="Along Home">
          <Wordmark size="md" />
        </Link>
      </div>

      {/* Primary Segmented Navigation (Desktop & Tablet) */}
      <nav
        className="along-nav-segmented"
        style={{
          display: "flex",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-chip)",
          padding: 3,
          gap: 2,
        }}
        aria-label="Main Navigation"
      >
        <Link
          href="/"
          style={{
            padding: "6px 16px",
            borderRadius: "var(--radius-chip)",
            fontSize: 14,
            fontWeight: pathname === "/" ? 700 : 500,
            background: pathname === "/" ? "var(--brand-primary)" : "transparent",
            color: pathname === "/" ? "var(--brand-ink)" : "var(--text-muted)",
            transition: "all 150ms ease",
          }}
        >
          Ride
        </Link>
        <Link
          href="/driver"
          style={{
            padding: "6px 16px",
            borderRadius: "var(--radius-chip)",
            fontSize: 14,
            fontWeight: pathname === "/driver" ? 700 : 500,
            background: pathname === "/driver" ? "var(--brand-primary)" : "transparent",
            color: pathname === "/driver" ? "var(--brand-ink)" : "var(--text-muted)",
            transition: "all 150ms ease",
          }}
        >
          Driver
        </Link>
        <Link
          href={familyHref}
          style={{
            padding: "6px 16px",
            borderRadius: "var(--radius-chip)",
            fontSize: 14,
            fontWeight: pathname.startsWith("/t/") ? 700 : 500,
            background: pathname.startsWith("/t/") ? "var(--brand-primary)" : "transparent",
            color: pathname.startsWith("/t/") ? "var(--brand-ink)" : "var(--text-muted)",
            transition: "all 150ms ease",
          }}
        >
          Family
        </Link>
      </nav>

      {/* Utilities: Language, Theme Toggle, Behind The Scenes */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Language Selector */}
        {onChangeLocale && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-chip)",
              padding: "2px 4px",
            }}
          >
            {(["en", "pcm", "ha"] as const).map((loc) => (
              <button
                key={loc}
                onClick={() => onChangeLocale(loc)}
                style={{
                  minHeight: 32,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-chip)",
                  fontSize: 12,
                  fontWeight: activeLocale === loc ? 700 : 500,
                  background: activeLocale === loc ? "var(--brand-soft)" : "transparent",
                  color: activeLocale === loc ? "var(--brand-primary)" : "var(--text-muted)",
                }}
                aria-label={`Switch to ${loc === "en" ? "English" : loc === "pcm" ? "Pidgin" : "Hausa"}`}
              >
                {loc === "en" ? "EN" : loc === "pcm" ? "Pidgin" : "Hausa"}
              </button>
            ))}
          </div>
        )}

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={toggleTheme}
          style={{
            width: 38,
            height: 38,
            minHeight: 38,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "50%",
            color: "var(--text-ink)",
            fontSize: 16,
          }}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? "☼" : "☾"}
        </button>

        {/* Behind The Scenes Toggle */}
        {onToggleBehindTheScenes && (
          <button
            onClick={onToggleBehindTheScenes}
            style={{
              padding: "6px 12px",
              minHeight: 38,
              borderRadius: "var(--radius-button)",
              background: behindTheScenesOpen ? "var(--brand-soft)" : "var(--bg-surface)",
              color: behindTheScenesOpen ? "var(--brand-primary)" : "var(--text-ink)",
              border: `1px solid ${behindTheScenesOpen ? "var(--brand-primary)" : "var(--border-subtle)"}`,
              fontSize: 13,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
            aria-label="Toggle behind the scenes AI inspector"
          >
            <span>Telemetry</span>
            <span style={{ fontSize: 11 }}>{behindTheScenesOpen ? "▲" : "▼"}</span>
          </button>
        )}

        {/* Overflow Menu */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: 38,
              height: 38,
              minHeight: 38,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "50%",
              color: "var(--text-ink)",
              fontSize: 16,
              fontWeight: 700,
            }}
            aria-label="Open menu"
          >
            ···
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: 44,
                right: 0,
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-card)",
                boxShadow: "var(--shadow-soft)",
                padding: "6px 0",
                minWidth: 180,
                zIndex: 50,
              }}
            >
              <Link
                href="/ops"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block",
                  padding: "8px 16px",
                  fontSize: 13,
                  color: "var(--text-ink)",
                }}
              >
                Operations (demo)
              </Link>
              <Link
                href="/demo"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block",
                  padding: "8px 16px",
                  fontSize: 13,
                  color: "var(--text-ink)",
                }}
              >
                Judge cockpit mode
              </Link>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .along-nav-segmented {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
