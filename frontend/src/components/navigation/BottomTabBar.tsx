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
  const realShareToken = activeShareToken || trip.activeShareToken || trip.currentQuote?.shareToken || "";
  const serverStage = trip.serverSnapshot?.stage || trip.journeyStage;
  const isBooked = Boolean(trip.currentQuote || realShareToken || (trip.serverSnapshot?.passengers && trip.serverSnapshot.passengers.length > 0));
  const isRiderBoarded = Boolean(
    trip.serverSnapshot?.passengers?.some((p) => (!p.simulated || p.display_name.includes("(you)")) && p.is_boarded) ||
    serverStage === "IN_TRANSIT" ||
    serverStage === "COMPLETED"
  );
  const isCompleted = serverStage === "COMPLETED";

  const rideDone = isBooked;
  const driverOtpDone = isRiderBoarded;
  const liveCorridorDone = isCompleted;

  const isRideActive = pathname === "/";
  const isDriverActive = pathname === "/driver";
  const isCorridorActive = pathname.startsWith("/t/");

  return (
    <nav
      className="along-bottom-tab-bar"
      style={{
        display: "none",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        boxSizing: "border-box",
        height: "calc(60px + env(safe-area-inset-bottom, 0px))",
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        paddingTop: 6,
        paddingBottom: "max(8px, env(safe-area-inset-bottom, 8px))",
        paddingLeft: 8,
        paddingRight: 8,
        justifyContent: "space-between",
        alignItems: "stretch",
        zIndex: 50,
        boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
      }}
      aria-label="Mobile Navigation"
    >
      {/* 1. Ride */}
      <Link
        href="/"
        style={{
          flex: "1 1 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          padding: "4px 0",
          color: isRideActive ? "var(--brand-primary)" : "var(--text-muted)",
          fontWeight: isRideActive ? 600 : 500,
          fontSize: 11,
          lineHeight: 1.2,
          textDecoration: "none",
          minWidth: 0,
        }}
      >
        <div style={{ position: "relative", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PodNavIcon size={22} color={isRideActive ? "var(--brand-primary)" : "var(--text-muted)"} />
          {rideDone && !isRideActive && (
            <span
              style={{
                position: "absolute",
                top: -2,
                right: -6,
                fontSize: 10,
                color: "var(--brand-primary)",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              ✓
            </span>
          )}
        </div>
        <span style={{ whiteSpace: "nowrap" }}>Ride</span>
      </Link>

      {/* 2. Driver OTP */}
      {isBooked ? (
        <Link
          href="/driver"
          style={{
            flex: "1 1 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "4px 0",
            color: isDriverActive ? "var(--brand-primary)" : "var(--text-muted)",
            fontWeight: isDriverActive ? 600 : 500,
            fontSize: 11,
            lineHeight: 1.2,
            textDecoration: "none",
            minWidth: 0,
            position: "relative",
          }}
        >
          <div style={{ position: "relative", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SteeringNavIcon size={22} color={isDriverActive ? "var(--brand-primary)" : "var(--text-muted)"} />
            {driverOtpDone && !isDriverActive ? (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -6,
                  fontSize: 10,
                  color: "var(--brand-primary)",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                ✓
              </span>
            ) : !driverOtpDone && !isDriverActive ? (
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--signal-amber)",
                  border: "1.5px solid var(--bg-surface)",
                }}
              />
            ) : null}
          </div>
          <span style={{ whiteSpace: "nowrap" }}>Driver OTP</span>
        </Link>
      ) : (
        <div
          aria-disabled="true"
          title="Available after you book"
          style={{
            flex: "1 1 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "4px 0",
            color: "var(--text-muted)",
            opacity: 0.45,
            fontSize: 11,
            lineHeight: 1.2,
            cursor: "not-allowed",
            pointerEvents: "none",
            minWidth: 0,
          }}
        >
          <div style={{ position: "relative", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SteeringNavIcon size={22} color="currentColor" />
          </div>
          <span style={{ whiteSpace: "nowrap" }}>Driver OTP</span>
        </div>
      )}

      {/* 3. Live corridor */}
      {isBooked ? (
        <Link
          href={realShareToken ? `/t/${realShareToken}` : "/driver"}
          style={{
            flex: "1 1 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "4px 0",
            color: isCorridorActive ? "var(--brand-primary)" : "var(--text-muted)",
            fontWeight: isCorridorActive ? 600 : 500,
            fontSize: 11,
            lineHeight: 1.2,
            textDecoration: "none",
            minWidth: 0,
          }}
        >
          <div style={{ position: "relative", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RadarNavIcon size={22} color={isCorridorActive ? "var(--brand-primary)" : "var(--text-muted)"} />
            {liveCorridorDone && !isCorridorActive && (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -6,
                  fontSize: 10,
                  color: "var(--brand-primary)",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                ✓
              </span>
            )}
          </div>
          <span style={{ whiteSpace: "nowrap" }}>Live Corridor</span>
        </Link>
      ) : (
        <div
          aria-disabled="true"
          title="Available after you book"
          style={{
            flex: "1 1 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "4px 0",
            color: "var(--text-muted)",
            opacity: 0.45,
            fontSize: 11,
            lineHeight: 1.2,
            cursor: "not-allowed",
            pointerEvents: "none",
            minWidth: 0,
          }}
        >
          <div style={{ position: "relative", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RadarNavIcon size={22} color="currentColor" />
          </div>
          <span style={{ whiteSpace: "nowrap" }}>Live Corridor</span>
        </div>
      )}

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
