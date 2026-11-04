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
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.removeItem("along-theme");
      localStorage.removeItem("along-theme-v2");
      const params = new URLSearchParams(window.location.search);
      const urlTheme = params.get("theme");
      const stored = localStorage.getItem("along-theme-v3");
      const activeTheme = (urlTheme === "dark" || urlTheme === "light") ? urlTheme : (stored === "dark" ? "dark" : "light");
      setTheme(activeTheme);
      document.documentElement.setAttribute("data-theme", activeTheme);
    } catch {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  // Close drawers and mobile menu automatically on navigation
  useEffect(() => {
    trip.setMultiRiderDrawerOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("along-theme-v3", next);
    } catch {}
  };

  const realShareToken = activeShareToken || trip.activeShareToken || trip.currentQuote?.shareToken || "";
  const serverStage = trip.serverSnapshot?.stage || trip.journeyStage;
  const isBooked = Boolean(trip.currentQuote || realShareToken || (trip.serverSnapshot?.passengers && trip.serverSnapshot.passengers.length > 0));
  const isRiderBoarded = Boolean(
    trip.serverSnapshot?.passengers?.some((p) => (!p.simulated || p.display_name.includes("(you)")) && p.is_boarded) ||
    serverStage === "IN_TRANSIT" ||
    serverStage === "COMPLETED"
  );
  const isInTransit = serverStage === "IN_TRANSIT";
  const isCompleted = serverStage === "COMPLETED";

  const rideDone = isBooked;
  const driverOtpDone = isRiderBoarded;
  const liveCorridorActive = isInTransit;
  const liveCorridorDone = isCompleted;

  const isRideActive = pathname === "/";
  const isDriverActive = pathname === "/driver";
  const isCorridorActive = pathname.startsWith("/t/");

  return (
    <>
      <header
        className="along-main-header"
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
          className="along-header-inner"
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 16px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Logo on Left */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <Link href="/" aria-label="Along Home" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              <Wordmark size="md" />
            </Link>
          </div>

          {/* Desktop Navigation: Up to 5 inline links */}
          <nav
            className="along-desktop-nav"
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg-paper)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-chip)",
              padding: 3,
              gap: 4,
            }}
            aria-label="Main Navigation"
          >
            {/* 1. Ride */}
            <Link
              href="/"
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-chip)",
                fontSize: 13,
                fontWeight: isRideActive ? 700 : 600,
                background: isRideActive ? "var(--brand-primary)" : "transparent",
                color: isRideActive ? "#FFFFFF" : "var(--text-muted)",
                transition: "all 150ms ease",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <PodNavIcon size={15} color={isRideActive ? "#FFFFFF" : "currentColor"} />
              <span>Ride</span>
              {rideDone && !isRideActive && (
                <span style={{ fontSize: 11, color: "var(--brand-primary)" }}>✓</span>
              )}
            </Link>

            {/* 2. Driver OTP */}
            {isBooked ? (
              <Link
                href="/driver"
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-chip)",
                  fontSize: 13,
                  fontWeight: isDriverActive ? 700 : 600,
                  background: isDriverActive ? "var(--brand-primary)" : "transparent",
                  color: isDriverActive ? "#FFFFFF" : "var(--text-muted)",
                  transition: "all 150ms ease",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <SteeringNavIcon size={15} color={isDriverActive ? "#FFFFFF" : "currentColor"} />
                <span>Driver OTP</span>
                {driverOtpDone && !isDriverActive && (
                  <span style={{ fontSize: 11, color: "var(--brand-primary)" }}>✓</span>
                )}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                title="Available after you book"
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-chip)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-muted)",
                  opacity: 0.45,
                  cursor: "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  pointerEvents: "none",
                }}
              >
                <SteeringNavIcon size={15} color="currentColor" />
                <span>Driver OTP</span>
              </span>
            )}

            {/* 3. Live corridor */}
            {isBooked ? (
              <Link
                href={realShareToken ? `/t/${realShareToken}` : "/driver"}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-chip)",
                  fontSize: 13,
                  fontWeight: isCorridorActive ? 700 : 600,
                  background: isCorridorActive ? "var(--brand-primary)" : "transparent",
                  color: isCorridorActive ? "#FFFFFF" : "var(--text-muted)",
                  transition: "all 150ms ease",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <RadarNavIcon size={15} color={isCorridorActive ? "#FFFFFF" : "currentColor"} />
                <span>Live corridor</span>
                {liveCorridorDone && !isCorridorActive && (
                  <span style={{ fontSize: 11, color: "var(--brand-primary)" }}>✓</span>
                )}
                {liveCorridorActive && !liveCorridorDone && !isCorridorActive && (
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
            ) : (
              <span
                aria-disabled="true"
                title="Available after you book"
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-chip)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-muted)",
                  opacity: 0.45,
                  cursor: "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  pointerEvents: "none",
                }}
              >
                <RadarNavIcon size={15} color="currentColor" />
                <span>Live corridor</span>
              </span>
            )}

            {/* Visual separator separating Stepper from Multi-rider lab and AI X-ray */}
            <div
              style={{
                width: 1,
                height: 18,
                background: "var(--border-subtle)",
                margin: "0 4px",
              }}
            />

            {/* 4. Multi-rider lab */}
            <button
              type="button"
              onClick={() => trip.setMultiRiderDrawerOpen(!trip.multiRiderDrawerOpen)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-chip)",
                fontSize: 13,
                fontWeight: trip.multiRiderDrawerOpen ? 700 : 600,
                background: trip.multiRiderDrawerOpen ? "var(--brand-primary)" : "transparent",
                color: trip.multiRiderDrawerOpen ? "#FFFFFF" : "var(--text-muted)",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 150ms ease",
              }}
              aria-label="Open multi-rider lab simulator"
            >
              <span>Multi-rider lab</span>
            </button>

            {/* 5. AI X-ray */}
            <button
              type="button"
              onClick={() => trip.setAiDrawerOpen(!trip.aiDrawerOpen)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-chip)",
                fontSize: 13,
                fontWeight: trip.aiDrawerOpen ? 700 : 600,
                background: trip.aiDrawerOpen ? "var(--brand-primary)" : "transparent",
                color: trip.aiDrawerOpen ? "#FFFFFF" : "var(--text-muted)",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 150ms ease",
              }}
              aria-label="Open AI X-ray telemetry"
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: trip.aiDrawerOpen ? "#FFFFFF" : "var(--brand-primary)",
                }}
              />
              <span>AI X-ray</span>
            </button>
          </nav>

          {/* Right Area: Theme Toggle (44px) + Mobile Menu Button */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Theme Toggle (44px touch target) */}
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-paper)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "50%",
                color: "var(--text-ink)",
                fontSize: 17,
                cursor: "pointer",
                transition: "transform 150ms ease",
              }}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? "☾" : "☼"}
            </button>

            {/* Mobile Menu Button (44px, visible <= 767px) */}
            <button
              type="button"
              className="along-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                background: mobileMenuOpen ? "var(--brand-primary)" : "var(--bg-paper)",
                border: `1px solid ${mobileMenuOpen ? "var(--brand-primary)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-chip)",
                color: mobileMenuOpen ? "#FFFFFF" : "var(--text-ink)",
                fontSize: 18,
                cursor: "pointer",
                padding: 0,
              }}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (<= 767px) */}
        {mobileMenuOpen && (
          <div
            className="along-mobile-dropdown"
            style={{
              position: "absolute",
              top: 56,
              left: 0,
              right: 0,
              background: "var(--bg-surface)",
              borderBottom: "1px solid var(--border-subtle)",
              padding: "12px 16px 16px",
              boxShadow: "var(--shadow-elevated)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              zIndex: 45,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                trip.setMultiRiderDrawerOpen(true);
              }}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: "var(--radius-chip)",
                background: "var(--bg-paper)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-ink)",
                fontSize: 14,
                fontWeight: 700,
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>🧪 Multi-rider lab</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Simulate 4 riders →</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                trip.setAiDrawerOpen(true);
              }}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: "var(--radius-chip)",
                background: "var(--bg-paper)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-ink)",
                fontSize: 14,
                fontWeight: 700,
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>✨ AI X-ray</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Model telemetry →</span>
            </button>

            <Link
              href="/ops"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: "var(--radius-chip)",
                background: "var(--bg-paper)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-ink)",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxSizing: "border-box",
              }}
            >
              <span>📊 Operations</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Command center →</span>
            </Link>
          </div>
        )}

        <style jsx>{`
          @media (max-width: 767px) {
            .along-desktop-nav {
              display: none !important;
            }
            .along-mobile-menu-btn {
              display: inline-flex !important;
            }
          }
          @media (min-width: 768px) {
            .along-mobile-menu-btn {
              display: none !important;
            }
            .along-mobile-dropdown {
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
