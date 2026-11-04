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
      {/* 1. Ride */}
      <Link
        href="/"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          color: isRideActive ? "var(--brand-primary)" : "var(--text-muted)",
          fontWeight: isRideActive ? 700 : 500,
          fontSize: 11.5,
          textDecoration: "none",
        }}
      >
        <div style={{ position: "relative" }}>
          <PodNavIcon size={22} color={isRideActive ? "var(--brand-primary)" : "var(--text-muted)"} />
          {rideDone && !isRideActive && (
            <span
              style={{
                position: "absolute",
                top: -3,
                right: -6,
                fontSize: 10,
                color: "var(--brand-primary)",
                fontWeight: 700,
              }}
            >
              ✓
            </span>
          )}
        </div>
        <span>Ride</span>
      </Link>

      {/* 2. Driver OTP */}
      {isBooked ? (
        <Link
          href="/driver"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            color: isDriverActive ? "var(--brand-primary)" : "var(--text-muted)",
            fontWeight: isDriverActive ? 700 : 500,
            fontSize: 11.5,
            textDecoration: "none",
            position: "relative",
          }}
        >
          <div style={{ position: "relative" }}>
            <SteeringNavIcon size={22} color={isDriverActive ? "var(--brand-primary)" : "var(--text-muted)"} />
            {driverOtpDone && !isDriverActive ? (
              <span
                style={{
                  position: "absolute",
                  top: -3,
                  right: -6,
                  fontSize: 10,
                  color: "var(--brand-primary)",
                  fontWeight: 700,
                }}
              >
                ✓
              </span>
            ) : !driverOtpDone && !isDriverActive ? (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -4,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--signal-amber)",
                }}
              />
            ) : null}
          </div>
          <span>Driver OTP</span>
        </Link>
      ) : (
        <div
          aria-disabled="true"
          title="Available after you book"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            color: "var(--text-muted)",
            opacity: 0.45,
            fontSize: 11.5,
            cursor: "not-allowed",
            pointerEvents: "none",
          }}
        >
          <SteeringNavIcon size={22} color="currentColor" />
          <span>Driver OTP</span>
        </div>
      )}

      {/* 3. Live corridor */}
      {isBooked ? (
        <Link
          href={realShareToken ? `/t/${realShareToken}` : "/driver"}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            color: isCorridorActive ? "var(--brand-primary)" : "var(--text-muted)",
            fontWeight: isCorridorActive ? 700 : 500,
            fontSize: 11.5,
            textDecoration: "none",
          }}
        >
          <div style={{ position: "relative" }}>
            <RadarNavIcon size={22} color={isCorridorActive ? "var(--brand-primary)" : "var(--text-muted)"} />
            {liveCorridorDone && !isCorridorActive && (
              <span
                style={{
                  position: "absolute",
                  top: -3,
                  right: -6,
                  fontSize: 10,
                  color: "var(--brand-primary)",
                  fontWeight: 700,
                }}
              >
                ✓
              </span>
            )}
          </div>
          <span>Live corridor</span>
        </Link>
      ) : (
        <div
          aria-disabled="true"
          title="Available after you book"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            color: "var(--text-muted)",
            opacity: 0.45,
            fontSize: 11.5,
            cursor: "not-allowed",
            pointerEvents: "none",
          }}
        >
          <RadarNavIcon size={22} color="currentColor" />
          <span>Live corridor</span>
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
