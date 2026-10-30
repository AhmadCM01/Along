"use client";

import React, { useMemo, useState, useEffect } from "react";
import { CorridorNode } from "@/components/brand/CorridorNode";
import { useAlongTrip } from "@/context/AlongTripContext";

export interface Waypoint {
  id: string;
  name: string;
  km: number;
  x: number;
  y: number;
  isAnchor: boolean;
  partner: string;
  labelPos: "top" | "bottom";
}

export interface CorridorDefinition {
  id: string;
  name: string;
  highway: string;
  unitFare: string;
  waypoints: Waypoint[];
}

export const CORRIDOR_DATA: Record<string, CorridorDefinition> = {
  "BWR-DUT-WUS": {
    id: "BWR-DUT-WUS",
    name: "Bwari to Wuse",
    highway: "Bwari-Dutse-Murtala Mohammed Expwy",
    unitFare: "₦900",
    waypoints: [
      { id: "BWR", name: "Bwari", km: 0.0, x: 65, y: 78, isAnchor: true, partner: "NIPCO", labelPos: "top" },
      { id: "DUT", name: "Dutse 1st Gate", km: 15.1, x: 165, y: 145, isAnchor: true, partner: "A.A. Rano", labelPos: "bottom" },
      { id: "SOK", name: "Sokale", km: 18.2, x: 265, y: 120, isAnchor: true, partner: "Bovas", labelPos: "top" },
      { id: "KAT", name: "Katampe", km: 26.1, x: 375, y: 168, isAnchor: true, partner: "Oando", labelPos: "bottom" },
      { id: "MAB", name: "Mabushi", km: 29.4, x: 475, y: 142, isAnchor: false, partner: "Bridge", labelPos: "top" },
      { id: "BER", name: "Berger", km: 32.5, x: 565, y: 205, isAnchor: false, partner: "Flyover", labelPos: "bottom" },
      { id: "WUS", name: "Wuse Mkt", km: 36.5, x: 655, y: 185, isAnchor: true, partner: "Total", labelPos: "top" },
    ],
  },
  "ZUB-KUB-WUS": {
    id: "ZUB-KUB-WUS",
    name: "Zuba to Wuse",
    highway: "Kubwa Expressway (Murtala Mohammed Way)",
    unitFare: "₦900",
    waypoints: [
      { id: "ZUB", name: "Zuba", km: 0.0, x: 65, y: 110, isAnchor: true, partner: "Conoil", labelPos: "top" },
      { id: "DEI", name: "Dei-Dei", km: 8.5, x: 175, y: 165, isAnchor: true, partner: "NNPC", labelPos: "bottom" },
      { id: "KUB", name: "Kubwa FO1", km: 18.0, x: 295, y: 125, isAnchor: true, partner: "TotalEnergies", labelPos: "top" },
      { id: "GWA", name: "Gwarinpa", km: 26.4, x: 415, y: 178, isAnchor: true, partner: "A.A. Rano", labelPos: "bottom" },
      { id: "MAB", name: "Mabushi", km: 33.1, x: 535, y: 145, isAnchor: false, partner: "Junction", labelPos: "top" },
      { id: "WUS", name: "Wuse Zone 4", km: 38.2, x: 650, y: 200, isAnchor: true, partner: "Total", labelPos: "bottom" },
    ],
  },
  "ZUB-DEI-DUT": {
    id: "ZUB-DEI-DUT",
    name: "Zuba to Dutse",
    highway: "Outer Northern Expressway",
    unitFare: "₦700",
    waypoints: [
      { id: "ZUB", name: "Zuba", km: 0.0, x: 70, y: 160, isAnchor: true, partner: "Conoil", labelPos: "bottom" },
      { id: "DEI", name: "Dei-Dei Mkt", km: 8.2, x: 215, y: 115, isAnchor: true, partner: "NNPC", labelPos: "top" },
      { id: "DAW", name: "Dawaki", km: 15.0, x: 360, y: 175, isAnchor: false, partner: "Flyover", labelPos: "bottom" },
      { id: "ALH", name: "Dutse Alhaji", km: 20.3, x: 505, y: 125, isAnchor: true, partner: "Bovas", labelPos: "top" },
      { id: "DUT", name: "Dutse 1st Gate", km: 24.0, x: 645, y: 180, isAnchor: true, partner: "A.A. Rano", labelPos: "bottom" },
    ],
  },
  "ZUB-KRM-JAB": {
    id: "ZUB-KRM-JAB",
    name: "Zuba to Jabi",
    highway: "Karmo-Life Camp Arterial",
    unitFare: "₦700",
    waypoints: [
      { id: "ZUB", name: "Zuba", km: 0.0, x: 70, y: 100, isAnchor: true, partner: "Conoil", labelPos: "top" },
      { id: "KRM", name: "Karmo Mkt", km: 14.5, x: 215, y: 165, isAnchor: true, partner: "A.A. Rano", labelPos: "bottom" },
      { id: "LIF", name: "Life Camp", km: 22.0, x: 365, y: 125, isAnchor: true, partner: "Oando", labelPos: "top" },
      { id: "LAK", name: "Jabi Lake", km: 28.5, x: 510, y: 185, isAnchor: false, partner: "Mall", labelPos: "bottom" },
      { id: "JAB", name: "Jabi Park", km: 32.0, x: 645, y: 145, isAnchor: true, partner: "Mobil", labelPos: "top" },
    ],
  },
  "GWL-LUG-AR1": {
    id: "GWL-LUG-AR1",
    name: "Gwagwalada to Area 1",
    highway: "Umaru Musa Yar'Adua Airport Expwy",
    unitFare: "₦1,000",
    waypoints: [
      { id: "GWL", name: "Gwagwalada", km: 0.0, x: 70, y: 205, isAnchor: true, partner: "NNPC Mega", labelPos: "bottom" },
      { id: "GIR", name: "Giri Jct", km: 12.0, x: 215, y: 150, isAnchor: false, partner: "Interchange", labelPos: "top" },
      { id: "LUG", name: "Lugbe", km: 27.5, x: 365, y: 185, isAnchor: true, partner: "Total", labelPos: "bottom" },
      { id: "CIT", name: "City Gate", km: 38.0, x: 510, y: 130, isAnchor: false, partner: "Monument", labelPos: "top" },
      { id: "AR1", name: "Area 1", km: 45.0, x: 645, y: 165, isAnchor: true, partner: "Roundabout", labelPos: "bottom" },
    ],
  },
  "MRB-NYA-CEN": {
    id: "MRB-NYA-CEN",
    name: "Mararaba to Central",
    highway: "Abuja-Keffi Expressway",
    unitFare: "₦600",
    waypoints: [
      { id: "MRB", name: "Mararaba", km: 0.0, x: 645, y: 195, isAnchor: true, partner: "A.A. Rano", labelPos: "bottom" },
      { id: "NYA", name: "Nyanya", km: 6.2, x: 505, y: 140, isAnchor: false, partner: "Bridge", labelPos: "top" },
      { id: "KAR", name: "Karu", km: 11.5, x: 365, y: 185, isAnchor: true, partner: "Bovas", labelPos: "bottom" },
      { id: "AYA", name: "AYA Asokoro", km: 18.0, x: 215, y: 125, isAnchor: true, partner: "Total", labelPos: "top" },
      { id: "CEN", name: "Area 10 Central", km: 23.5, x: 75, y: 165, isAnchor: true, partner: "NNPC", labelPos: "bottom" },
    ],
  },
};

/**
 * Build a smooth Catmull-Rom / Cubic Bezier SVG path through a list of waypoints.
 */
function buildSmoothCurvePath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX},${p0.y} ${midX},${p1.y} ${p1.x},${p1.y}`;
  }
  return d;
}

/**
 * Evaluate cubic bezier point between p0 and p1 at parameter t in [0, 1]
 */
function evalCubicSegment(p0: { x: number; y: number }, p1: { x: number; y: number }, t: number) {
  const midX = (p0.x + p1.x) / 2;
  const cx1 = midX;
  const cy1 = p0.y;
  const cx2 = midX;
  const cy2 = p1.y;

  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  const x = uuu * p0.x + 3 * uu * t * cx1 + 3 * u * tt * cx2 + ttt * p1.x;
  const y = uuu * p0.y + 3 * uu * t * cy1 + 3 * u * tt * cy2 + ttt * p1.y;
  return { x, y };
}

interface AbujaCorridorMapProps {
  corridorId?: string;
  originName?: string;
  destName?: string;
  anchorName?: string;
  isLoading?: boolean;
  elapsedSeconds?: number;
}

export function AbujaCorridorMap({
  corridorId = "BWR-DUT-WUS",
  originName = "Dutse First Gate",
  destName = "Berger Roundabout",
  anchorName = "A.A. Rano Dutse",
}: AbujaCorridorMapProps) {
  const trip = useAlongTrip();
  const currentCorridorId = trip.activeCorridorId || corridorId;
  const corridor = CORRIDOR_DATA[currentCorridorId] || CORRIDOR_DATA["BWR-DUT-WUS"];

  // Trip progress along the booked segment [0..1]
  const [segmentProgress, setSegmentProgress] = useState(0.42);
  const [isPaused, setIsPaused] = useState(false);

  // Identify pickup and drop-off waypoint indices
  const { pickupIdx, dropIdx } = useMemo(() => {
    const wps = corridor.waypoints;
    const pickupTerm = (trip.currentQuote?.anchorName || anchorName || originName).toLowerCase();
    const dropTerm = (trip.currentQuote?.destName || destName).toLowerCase();

    let pIdx = wps.findIndex(
      (w) =>
        pickupTerm.includes(w.name.toLowerCase()) ||
        pickupTerm.includes(w.id.toLowerCase()) ||
        (w.id === "DUT" && pickupTerm.includes("dutse")) ||
        (w.id === "SOK" && pickupTerm.includes("sokale")) ||
        (w.id === "LUG" && pickupTerm.includes("lugbe"))
    );
    if (pIdx < 0) pIdx = Math.min(1, wps.length - 2);

    let dIdx = wps.findIndex(
      (w) =>
        dropTerm.includes(w.name.toLowerCase()) ||
        dropTerm.includes(w.id.toLowerCase()) ||
        (w.id === "BER" && dropTerm.includes("berger")) ||
        (w.id === "KAT" && dropTerm.includes("katampe")) ||
        (w.id === "WUS" && dropTerm.includes("wuse")) ||
        (w.id === "AR1" && dropTerm.includes("area 1"))
    );
    if (dIdx <= pIdx) dIdx = Math.max(pIdx + 1, wps.length - 2);

    return { pickupIdx: pIdx, dropIdx: dIdx };
  }, [corridor, trip.currentQuote, anchorName, originName, destName]);

  const pickupWp = corridor.waypoints[pickupIdx];
  const dropWp = corridor.waypoints[dropIdx];

  // Smoothly animate the vehicle from Pickup to Drop-off
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setSegmentProgress((prev) => (prev >= 0.98 ? 0.04 : prev + 0.012));
    }, 180);
    return () => clearInterval(interval);
  }, [isPaused, currentCorridorId]);

  // Full corridor background path & active booked segment path
  const fullPathD = useMemo(() => buildSmoothCurvePath(corridor.waypoints), [corridor]);
  const bookedWaypoints = useMemo(
    () => corridor.waypoints.slice(pickupIdx, dropIdx + 1),
    [corridor, pickupIdx, dropIdx]
  );
  const bookedPathD = useMemo(() => buildSmoothCurvePath(bookedWaypoints), [bookedWaypoints]);

  // Interpolate vehicle position strictly along bookedWaypoints (Pickup -> Destination)
  const vehicleInfo = useMemo(() => {
    const segCount = Math.max(1, bookedWaypoints.length - 1);
    const scaled = Math.min(0.999, Math.max(0, segmentProgress)) * segCount;
    const segIdx = Math.min(Math.floor(scaled), segCount - 1);
    const localT = scaled - segIdx;

    const p0 = bookedWaypoints[segIdx];
    const p1 = bookedWaypoints[segIdx + 1] || p0;
    const pos = evalCubicSegment(p0, p1, localT);

    const totalKm = Math.max(1, Math.abs(dropWp.km - pickupWp.km));
    const remainingKm = Math.max(0.4, totalKm * (1 - segmentProgress)).toFixed(1);
    const etaMins = Math.max(1, Math.ceil(Number(remainingKm) * 0.65));

    return {
      x: pos.x,
      y: pos.y,
      nextStopName: p1.name,
      remainingKm,
      etaMins,
      pct: Math.round(segmentProgress * 100),
    };
  }, [bookedWaypoints, segmentProgress, pickupWp, dropWp]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--border-subtle)",
        overflow: "hidden",
        boxShadow: "var(--shadow-soft)",
      }}
      aria-label="Dynamic Abuja Corridor Telemetry Map"
      role="region"
    >
      {/* Top Map Telemetry Bar */}
      <div
        style={{
          padding: "14px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CorridorNode size={18} variant="pickup" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-ink)" }}>
              {corridor.name} Corridor ({corridor.id})
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              {corridor.highway} · Active Segment: <strong>{pickupWp.name} ➔ {dropWp.name}</strong>
            </div>
          </div>
        </div>

        {/* Live Speed & ETA Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
              background: "var(--brand-soft)",
              color: "var(--brand-primary)",
              border: "1px solid rgba(5, 150, 105, 0.25)",
              fontFamily: "var(--font-mono)",
            }}
          >
            ● Next: {vehicleInfo.nextStopName} ({vehicleInfo.etaMins} min · {vehicleInfo.remainingKm} km)
          </div>

          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-paper)",
              color: "var(--text-ink)",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isPaused ? "▶ Resume" : "❚❚ Pause"}
          </button>
        </div>
      </div>

      {/* SVG Geographic Transit Viewport */}
      <div
        className="along-map-canvas"
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "42%",
          minHeight: 270,
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 720 290"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
          aria-hidden="true"
        >
          <defs>
            <pattern id="abujaGrid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path
                d="M 36 0 L 0 0 0 36"
                fill="none"
                stroke="var(--border-subtle)"
                strokeWidth="0.6"
                opacity="0.55"
              />
            </pattern>
            <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Subtle Cartographic Grid & Topographic Contour Curves */}
          <rect width="720" height="290" fill="url(#abujaGrid)" />
          <path
            d="M 0,245 Q 220,210 420,250 T 720,225"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="12"
            opacity="0.25"
          />

          {/* 1. Full Corridor Spine (Dimmed outside booked segment) */}
          <path
            d={fullPathD}
            fill="none"
            stroke="var(--corridor-inactive)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="6 6"
            opacity="0.65"
          />

          {/* 2. Active Booked Route Segment (Pickup -> Drop-off) */}
          <path
            d={bookedPathD}
            fill="none"
            stroke="var(--brand-primary)"
            strokeWidth="7"
            strokeLinecap="round"
            filter="url(#emeraldGlow)"
            opacity="0.28"
          />
          <path
            d={bookedPathD}
            fill="none"
            stroke="var(--brand-primary)"
            strokeWidth="4.5"
            strokeLinecap="round"
          />

          {/* 3. Waypoint Stations (Alternating Top/Bottom Labels = Zero Overlap) */}
          {corridor.waypoints.map((wp, idx) => {
            const isPickup = idx === pickupIdx;
            const isDrop = idx === dropIdx;
            const isWithinTrip = idx >= pickupIdx && idx <= dropIdx;
            const labelY = wp.labelPos === "top" ? -18 : 24;
            const partnerY = wp.labelPos === "top" ? -31 : 37;

            return (
              <g
                key={wp.id}
                transform={`translate(${wp.x}, ${wp.y})`}
                style={{ opacity: isWithinTrip ? 1 : 0.48 }}
              >
                {/* Pulsing Halo for Pickup & Drop-off */}
                {(isPickup || isDrop) && (
                  <circle
                    cx="0"
                    cy="0"
                    r="16"
                    fill="none"
                    stroke={isPickup ? "var(--brand-primary)" : "var(--signal-amber)"}
                    strokeWidth="2"
                    className="along-pulse-ring"
                  />
                )}

                {/* Station Circle */}
                <circle
                  cx="0"
                  cy="0"
                  r={isPickup || isDrop ? 8.5 : wp.isAnchor ? 6 : 4.5}
                  fill={
                    isPickup
                      ? "var(--brand-primary)"
                      : isDrop
                      ? "var(--signal-amber)"
                      : "var(--bg-surface)"
                  }
                  stroke={
                    isPickup
                      ? "#FFFFFF"
                      : isDrop
                      ? "#FFFFFF"
                      : isWithinTrip
                      ? "var(--brand-primary)"
                      : "var(--border-strong)"
                  }
                  strokeWidth={isPickup || isDrop ? 2.5 : 2}
                />

                {/* Station Name */}
                <text
                  x="0"
                  y={labelY}
                  textAnchor="middle"
                  style={{
                    fontSize: isPickup || isDrop ? 12 : 10.5,
                    fontWeight: isPickup || isDrop ? 800 : 700,
                    fill: "var(--text-ink)",
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  {wp.name}
                </text>

                {/* Safe Forecourt Partner Sub-label */}
                <text
                  x="0"
                  y={partnerY}
                  textAnchor="middle"
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    fill: isPickup
                      ? "var(--brand-primary)"
                      : isDrop
                      ? "var(--signal-amber)"
                      : "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {isPickup ? `PICKUP · ${wp.partner}` : isDrop ? `DROP · ${wp.partner}` : wp.partner}
                </text>
              </g>
            );
          })}

          {/* 4. Moving Vehicle Pod Marker (Elevated Floating Badge with Leader Line) */}
          <g transform={`translate(${vehicleInfo.x}, ${vehicleInfo.y})`}>
            {/* Outer Radar Glow */}
            <circle cx="0" cy="0" r="14" fill="var(--brand-primary)" opacity="0.22" />
            {/* Vehicle Core Dot */}
            <circle cx="0" cy="0" r="7.5" fill="var(--brand-primary)" stroke="#FFFFFF" strokeWidth="2.5" />

            {/* Leader Line to Floating Pill so it NEVER overlaps station text */}
            <line x1="0" y1="-8" x2="0" y2="-38" stroke="var(--brand-primary)" strokeWidth="1.5" />
            <rect
              x="-44"
              y="-58"
              width="88"
              height="20"
              rx="10"
              fill="var(--brand-primary)"
            />
            <text
              x="0"
              y="-44.5"
              textAnchor="middle"
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                fill: "#FFFFFF",
                fontFamily: "var(--font-mono)",
              }}
            >
              POD-842A · {vehicleInfo.pct}%
            </text>
          </g>
        </svg>
      </div>

      {/* Interactive Progress Scrubber & Route Summary Footer */}
      <div
        style={{
          padding: "12px 18px",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-paper)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          fontSize: 12.5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Safe Pickup Anchor: </span>
            <strong style={{ color: "var(--brand-primary)" }}>
              {pickupWp.partner} ({pickupWp.name})
            </strong>
          </div>
          <span style={{ color: "var(--text-faint)" }}>➔</span>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Booked Destination: </span>
            <strong style={{ color: "var(--text-ink)" }}>{dropWp.name}</strong>
          </div>
        </div>

        {/* Interactive Scrubber to test Pod movement */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
            Scrub Trip:
          </span>
          <input
            type="range"
            min={0.02}
            max={0.98}
            step={0.01}
            value={segmentProgress}
            onChange={(e) => {
              setIsPaused(true);
              setSegmentProgress(parseFloat(e.target.value));
            }}
            style={{ width: 95, accentColor: "var(--brand-primary)", cursor: "pointer" }}
            aria-label="Scrub pod position along booked corridor"
          />
        </div>
      </div>

      <style jsx global>{`
        [data-theme="light"] .along-map-canvas {
          background-color: #F8FAFC !important;
        }
        [data-theme="dark"] .along-map-canvas {
          background-color: #141E24 !important;
        }

        @keyframes pulseRing {
          0% {
            r: 9;
            opacity: 0.85;
          }
          100% {
            r: 22;
            opacity: 0;
          }
        }
        .along-pulse-ring {
          animation: pulseRing 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
