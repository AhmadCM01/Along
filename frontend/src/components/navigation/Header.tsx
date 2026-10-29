"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { useAlongTrip } from "@/context/AlongTripContext";

export interface HeaderProps {
  activeLocale?: "en" | "pcm" | "ha";
  onChangeLocale?: (locale: "en" | "pcm" | "ha") => void;
  activeShareToken?: string | null;
  onToggleBehindTheScenes?: () => void;
  behindTheScenesOpen?: boolean;
}

export function Header({
  activeLocale = "pcm",
  onChangeLocale,
  activeShareToken,
  onToggleBehindTheScenes,
  behindTheScenesOpen = false,
}: HeaderProps) {
  const pathname = usePathname();
  const trip = useAlongTrip();
  const [theme, setTheme] = useState<"light" | "dark">("light");

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

  const shareToken = activeShareToken || trip.activeShareToken || "share-bwr-4817";
  const trackerHref = `/t/${shareToken}`;

  return (
    <header
      style={{
        width: "100%",
        maxWidth: 1280,
        margin: "0 auto",
        padding: "14px 20px",
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
        <Link href="/" aria-label="Along Home" style={{ textDecoration: "none" }}>
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
            padding: "6px 18px",
            borderRadius: "var(--radius-chip)",
            fontSize: 13.5,
            fontWeight: pathname === "/" ? 700 : 500,
            background: pathname === "/" ? "var(--brand-primary)" : "transparent",
            color: pathname === "/" ? "var(--brand-ink)" : "var(--text-muted)",
            transition: "all 150ms ease",
            textDecoration: "none",
          }}
        >
          Ride
        </Link>
        <Link
          href="/driver"
          style={{
            padding: "6px 18px",
            borderRadius: "var(--radius-chip)",
            fontSize: 13.5,
            fontWeight: pathname === "/driver" ? 700 : 500,
            background: pathname === "/driver" ? "var(--brand-primary)" : "transparent",
            color: pathname === "/driver" ? "var(--brand-ink)" : "var(--text-muted)",
            transition: "all 150ms ease",
            textDecoration: "none",
            position: "relative",
          }}
        >
          Driver
        </Link>
        <Link
          href={trackerHref}
          style={{
            padding: "6px 18px",
            borderRadius: "var(--radius-chip)",
            fontSize: 13.5,
            fontWeight: pathname.startsWith("/t/") ? 700 : 500,
            background: pathname.startsWith("/t/") ? "var(--brand-primary)" : "transparent",
            color: pathname.startsWith("/t/") ? "var(--brand-ink)" : "var(--text-muted)",
            transition: "all 150ms ease",
            textDecoration: "none",
          }}
        >
          Tracker
        </Link>
      </nav>

      {/* Utilities: Language, Theme Toggle, Behind The Scenes */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Language Selector (Hidden on small mobile screens to prevent congestion; available in chat) */}
        {onChangeLocale && (
          <div
            className="along-header-lang"
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
                  minHeight: 28,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-chip)",
                  fontSize: 12,
                  fontWeight: activeLocale === loc ? 700 : 500,
                  background: activeLocale === loc ? "var(--brand-soft)" : "transparent",
                  color: activeLocale === loc ? "var(--brand-primary)" : "var(--text-muted)",
                  border: "none",
                  cursor: "pointer",
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
            width: 36,
            height: 36,
            minHeight: 36,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "50%",
            color: "var(--text-ink)",
            fontSize: 16,
            cursor: "pointer",
          }}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? "☼" : "☾"}
        </button>

        {/* Telemetry Toggle */}
        {onToggleBehindTheScenes && (
          <button
            onClick={onToggleBehindTheScenes}
            style={{
              padding: "6px 12px",
              minHeight: 36,
              borderRadius: "var(--radius-button)",
              background: behindTheScenesOpen ? "var(--brand-soft)" : "var(--bg-surface)",
              color: behindTheScenesOpen ? "var(--brand-primary)" : "var(--text-ink)",
              border: `1px solid ${behindTheScenesOpen ? "var(--brand-primary)" : "var(--border-subtle)"}`,
              fontSize: 12.5,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
            aria-label="Toggle live AI pipeline telemetry"
          >
            <span>Telemetry</span>
            <span style={{ fontSize: 10 }}>{behindTheScenesOpen ? "▲" : "▼"}</span>
          </button>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .along-nav-segmented {
            display: none !important;
          }
          .along-header-lang {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
