"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { useAlongTrip } from "@/context/AlongTripContext";
import { AiTelemetryDrawer } from "@/components/demo/AiTelemetryDrawer";
import { MultiRiderDrawer } from "@/components/demo/MultiRiderDrawer";
import { PodNavIcon, SteeringNavIcon, RadarNavIcon } from "@/components/icons/AlongIcons";

export interface HeaderProps {
  activeLocale?: "en" | "pcm" | "ha";
  onChangeLocale?: (locale: "en" | "pcm" | "ha") => void;
  activeShareToken?: string | null;
  onToggleBehindTheScenes?: () => void;
  behindTheScenesOpen?: boolean;
}

export function Header({ activeShareToken }: HeaderProps) {
  const pathname = usePathname();
  const trip = useAlongTrip();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("along-theme");
      let activeTheme = stored;
      if (!activeTheme) {
        activeTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      setTheme(activeTheme === "dark" ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", activeTheme);
    } catch {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  // Close Multi-Rider Lab drawer automatically on navigation
  useEffect(() => {
    trip.setMultiRiderDrawerOpen(false);
  }, [pathname]);

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

  const isConfirmed = trip.journeyStage === "CONFIRMED" || trip.journeyStage === "IN_TRANSIT";
  const isInTransit = trip.journeyStage === "IN_TRANSIT";

  return (
    <>
      <header
        style={{
          width: "100%",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-subtle)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Brand Wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/" aria-label="Along Home" style={{ textDecoration: "none" }}>
              <Wordmark size="md" />
            </Link>
          </div>

          {/* 3-Step Progressive Journey Navigation (Desktop & Tablet) */}
          <nav
            className="along-nav-segmented"
            style={{
              display: "flex",
              background: "var(--bg-paper)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-chip)",
              padding: 3,
              gap: 4,
            }}
            aria-label="Main Journey Navigation"
          >
            <Link
              href="/"
              style={{
                padding: "6px 16px",
                borderRadius: "var(--radius-chip)",
                fontSize: 13,
                fontWeight: pathname === "/" ? 700 : 600,
                background: pathname === "/" ? "var(--brand-primary)" : "transparent",
                color: pathname === "/" ? "#FFFFFF" : "var(--text-muted)",
                transition: "all 150ms ease",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <PodNavIcon size={15} color={pathname === "/" ? "#FFFFFF" : "currentColor"} />
              <span>1. Ride</span>
              {isConfirmed && pathname !== "/" && (
                <span style={{ fontSize: 11, color: "var(--brand-primary)" }}>✓</span>
              )}
            </Link>

            <Link
              href="/driver"
              style={{
                padding: "6px 16px",
                borderRadius: "var(--radius-chip)",
                fontSize: 13,
                fontWeight: pathname === "/driver" ? 700 : 600,
                background: pathname === "/driver" ? "var(--brand-primary)" : "transparent",
                color: pathname === "/driver" ? "#FFFFFF" : "var(--text-muted)",
                transition: "all 150ms ease",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                position: "relative",
              }}
            >
              <SteeringNavIcon size={15} color={pathname === "/driver" ? "#FFFFFF" : "currentColor"} />
              <span>2. Driver OTP</span>
              {trip.journeyStage === "CONFIRMED" && pathname !== "/driver" && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--signal-amber)",
                  }}
                />
              )}
              {isInTransit && pathname !== "/driver" && (
                <span style={{ fontSize: 11, color: "var(--brand-primary)" }}>✓</span>
              )}
            </Link>

            <Link
              href={trackerHref}
              style={{
                padding: "6px 16px",
                borderRadius: "var(--radius-chip)",
                fontSize: 13,
                fontWeight: pathname.startsWith("/t/") ? 700 : 600,
                background: pathname.startsWith("/t/") ? "var(--brand-primary)" : "transparent",
                color: pathname.startsWith("/t/") ? "#FFFFFF" : "var(--text-muted)",
                transition: "all 150ms ease",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RadarNavIcon size={15} color={pathname.startsWith("/t/") ? "#FFFFFF" : "currentColor"} />
              <span>3. Live Corridor</span>
              {isInTransit && !pathname.startsWith("/t/") && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--brand-primary)",
                  }}
                />
              )}
            </Link>
          </nav>

          {/* Right Utilities: Multi-Rider Lab, AI X-Ray Drawer Trigger & Theme Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => trip.setMultiRiderDrawerOpen(!trip.multiRiderDrawerOpen)}
              style={{
                padding: "6px 12px",
                minHeight: 36,
                borderRadius: "var(--radius-chip)",
                background: trip.multiRiderDrawerOpen
                  ? "var(--brand-primary)"
                  : "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.2) 100%)",
                color: trip.multiRiderDrawerOpen ? "#FFFFFF" : "var(--brand-primary)",
                border: `1px solid ${trip.multiRiderDrawerOpen ? "var(--brand-primary)" : "rgba(16, 185, 129, 0.4)"}`,
                fontSize: 12.5,
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
              aria-label="Open Multi-Rider Lab Conveyor Simulator"
            >
              <span>🧪 Multi-Rider Lab</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "1px 5px",
                  borderRadius: 6,
                  background: trip.multiRiderDrawerOpen ? "rgba(255,255,255,0.25)" : "var(--brand-primary)",
                  color: "#FFFFFF",
                }}
              >
                4/4
              </span>
            </button>

            <button
              onClick={() => trip.setAiDrawerOpen(!trip.aiDrawerOpen)}
              style={{
                padding: "6px 12px",
                minHeight: 36,
                borderRadius: "var(--radius-chip)",
                background: trip.aiDrawerOpen ? "var(--brand-soft)" : "var(--bg-paper)",
                color: trip.aiDrawerOpen ? "var(--brand-primary)" : "var(--text-ink)",
                border: `1px solid ${trip.aiDrawerOpen ? "var(--brand-primary)" : "var(--border-subtle)"}`,
                fontSize: 12.5,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
              aria-label="Open Meta AI X-Ray & Telemetry Drawer"
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--brand-primary)",
                }}
              />
              <span>AI X-Ray</span>
            </button>

            <button
              onClick={toggleTheme}
              style={{
                width: 36,
                height: 36,
                minHeight: 36,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-paper)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "50%",
                color: "var(--text-ink)",
                fontSize: 15,
                cursor: "pointer",
              }}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? "☾" : "☼"}
            </button>
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

      {/* Slide-Over AI Telemetry & Honesty Drawer */}
      <AiTelemetryDrawer />

      {/* Slide-Over Multi-Rider Lab & Conveyor Simulator Drawer */}
      <MultiRiderDrawer />
    </>
  );
}
