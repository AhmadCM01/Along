"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PodNavIcon, SteeringNavIcon, RadarNavIcon } from "@/components/icons/AlongIcons";
import { useAlongTrip } from "@/context/AlongTripContext";

export interface BottomTabBarProps {
  activeShareToken?: string | null;
}

export function BottomTabBar({ activeShareToken }: BottomTabBarProps) {
  const pathname = usePathname();
  const trip = useAlongTrip();
  const shareToken = activeShareToken || trip.activeShareToken || "share-bwr-4817";
  const trackerHref = `/t/${shareToken}`;

  const hasUnboardedCommuter = trip.passengers.some((p) => p.isCurrentUser && !p.isBoarded) && trip.journeyStage === "CONFIRMED";

  return (
    <nav
      className="along-bottom-tab-bar"
      style={{
        display: "none",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        padding: "8px 16px max(8px, env(safe-area-inset-bottom))",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 50,
        boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
      }}
      aria-label="Mobile Navigation"
    >
      {/* 1. Ride (Commuter Booking) */}
      <Link
        href="/"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          color: pathname === "/" ? "var(--brand-primary)" : "var(--text-muted)",
          fontWeight: pathname === "/" ? 700 : 500,
          fontSize: 11.5,
          textDecoration: "none",
        }}
      >
        <PodNavIcon size={22} color={pathname === "/" ? "var(--brand-primary)" : "var(--text-muted)"} />
        <span>Ride</span>
      </Link>

      {/* 2. Driver (Manifest & Escrow) */}
      <Link
        href="/driver"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          color: pathname === "/driver" ? "var(--brand-primary)" : "var(--text-muted)",
          fontWeight: pathname === "/driver" ? 700 : 500,
          fontSize: 11.5,
          textDecoration: "none",
          position: "relative",
        }}
      >
        <div style={{ position: "relative" }}>
          <SteeringNavIcon size={22} color={pathname === "/driver" ? "var(--brand-primary)" : "var(--text-muted)"} />
          {hasUnboardedCommuter && (
            <span
              style={{
                position: "absolute",
                top: -2,
                right: -4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--signal-amber)",
                border: "1.5px solid var(--bg-surface)",
              }}
            />
          )}
        </div>
        <span>Driver</span>
      </Link>

      {/* 3. Tracker (Live Route & Safety) */}
      <Link
        href={trackerHref}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          color: pathname.startsWith("/t/") ? "var(--brand-primary)" : "var(--text-muted)",
          fontWeight: pathname.startsWith("/t/") ? 700 : 500,
          fontSize: 11.5,
          textDecoration: "none",
        }}
      >
        <RadarNavIcon size={22} color={pathname.startsWith("/t/") ? "var(--brand-primary)" : "var(--text-muted)"} />
        <span>Tracker</span>
      </Link>

      <style jsx>{`
        @media (max-width: 768px) {
          .along-bottom-tab-bar {
            display: flex !important;
          }
        }
      `}</style>
    </nav>
  );
}
