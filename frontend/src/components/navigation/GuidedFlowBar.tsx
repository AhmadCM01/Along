"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAlongTrip } from "@/context/AlongTripContext";

export function GuidedFlowBar() {
  const pathname = usePathname();
  const trip = useAlongTrip();

  const isConfirmed = trip.journeyStage === "CONFIRMED" || trip.journeyStage === "IN_TRANSIT";
  const isInTransit = trip.journeyStage === "IN_TRANSIT";

  return (
    <div
      style={{
        width: "100%",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-card)",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "var(--shadow-soft)",
        flexWrap: "wrap",
        gap: 10,
      }}
      aria-label="Interactive End-to-End Flow Stepper"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--brand-primary)",
            background: "var(--brand-soft)",
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          Hackathon Demo Tour
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-ink)" }}>
          Test Rider & Driver Experience
        </span>
      </div>

      {/* Stepper Buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        {/* Step 1: Rider Voice / WhatsApp */}
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: "var(--radius-chip)",
            fontSize: 12,
            fontWeight: 700,
            background: pathname === "/" ? "var(--brand-primary)" : "var(--bg-paper)",
            color: pathname === "/" ? "#fff" : "var(--text-ink)",
            border: `1px solid ${pathname === "/" ? "var(--brand-primary)" : "var(--border-subtle)"}`,
          }}
        >
          <span style={{ opacity: 0.8 }}>1.</span>
          <span>Rider Voice</span>
          {isConfirmed && <span style={{ fontSize: 10 }}>✓</span>}
        </Link>

        <span style={{ color: "var(--text-faint)", fontSize: 11 }}>➔</span>

        {/* Step 2: Driver Manifest & Boarding */}
        <Link
          href="/driver"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: "var(--radius-chip)",
            fontSize: 12,
            fontWeight: 700,
            background: pathname === "/driver" ? "var(--brand-primary)" : "var(--bg-paper)",
            color: pathname === "/driver" ? "#fff" : "var(--text-ink)",
            border: `1px solid ${pathname === "/driver" ? "var(--brand-primary)" : "var(--border-subtle)"}`,
            position: "relative",
          }}
        >
          <span style={{ opacity: 0.8 }}>2.</span>
          <span>Driver Boarding (OTP)</span>
          {isInTransit ? (
            <span style={{ fontSize: 10 }}>✓</span>
          ) : isConfirmed ? (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--signal-amber)",
              }}
            />
          ) : null}
        </Link>

        <span style={{ color: "var(--text-faint)", fontSize: 11 }}>➔</span>

        {/* Step 3: Live Safety Tracker */}
        <Link
          href={`/t/${trip.activeShareToken}`}
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: "var(--radius-chip)",
            fontSize: 12,
            fontWeight: 700,
            background: pathname.startsWith("/t/") ? "var(--brand-primary)" : "var(--bg-paper)",
            color: pathname.startsWith("/t/") ? "#fff" : "var(--text-ink)",
            border: `1px solid ${pathname.startsWith("/t/") ? "var(--brand-primary)" : "var(--border-subtle)"}`,
          }}
        >
          <span style={{ opacity: 0.8 }}>3.</span>
          <span>Live Tracker & SOS</span>
          {isInTransit && <span style={{ fontSize: 10 }}>● LIVE</span>}
        </Link>
      </div>
    </div>
  );
}
