"use client";

import React, { useMemo, useState, useEffect } from "react";
import { CorridorNode } from "@/components/brand/CorridorNode";
import { RouteLine } from "@/components/brand/RouteLine";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { useAlongTrip } from "@/context/AlongTripContext";

export interface Waypoint {
  id: string;
  name: string;
  km: number;
  x: number;
  y: number;
  isAnchor: boolean;
  partner?: string;
}

export interface CorridorDefinition {
  id: string;
  name: string;
  description: string;
  unitFare: string;
  waypoints: Waypoint[];
  secondaryLines?: string[];
}

export const CORRIDOR_DATA: Record<string, CorridorDefinition> = {
  "BWR-DUT-WUS": {
    id: "BWR-DUT-WUS",
    name: "Bwari to Wuse",
    description: "Bwari · Dutse · Sokale · Katampe · Mabushi · Berger · Wuse",
    unitFare: "₦900",
    waypoints: [
      { id: "BWR", name: "Bwari", km: 0.0, x: 50, y: 50, isAnchor: true, partner: "NIPCO" },
      { id: "DUT", name: "Dutse First Gate", km: 15.1, x: 150, y: 85, isAnchor: true, partner: "A.A. Rano" },
      { id: "SOK", name: "Sokale", km: 18.2, x: 235, y: 125, isAnchor: true, partner: "Bovas" },
      { id: "KAT", name: "Katampe", km: 26.1, x: 350, y: 165, isAnchor: true, partner: "Oando" },
      { id: "MAB", name: "Mabushi", km: 29.4, x: 440, y: 205, isAnchor: false, partner: "Bridge" },
      { id: "BER", name: "Berger", km: 32.5, x: 520, y: 240, isAnchor: false, partner: "Flyover" },
      { id: "WUS", name: "Wuse", km: 36.5, x: 610, y: 275, isAnchor: true, partner: "Total" },
    ],
    secondaryLines: [
      "50,140 150,155 300,180 440,205 520,240",
      "120,270 240,250 350,230 520,240 610,275",
    ],
  },
  "ZUB-KUB-WUS": {
    id: "ZUB-KUB-WUS",
    name: "Zuba to Wuse",
    description: "Zuba · Dei-Dei · Kubwa FO1 · Gwarinpa · Mabushi · Wuse Zone 4",
    unitFare: "₦900",
    waypoints: [
      { id: "ZUB", name: "Zuba", km: 0.0, x: 50, y: 70, isAnchor: true, partner: "Conoil" },
      { id: "DEI", name: "Dei-Dei", km: 8.5, x: 155, y: 105, isAnchor: true, partner: "NNPC" },
      { id: "KUB", name: "Kubwa FO1", km: 18.0, x: 270, y: 145, isAnchor: true, partner: "TotalEnergies" },
      { id: "GWA", name: "Gwarinpa", km: 26.4, x: 385, y: 185, isAnchor: true, partner: "A.A. Rano" },
      { id: "MAB", name: "Mabushi", km: 33.1, x: 495, y: 225, isAnchor: false, partner: "Expressway" },
      { id: "WUS", name: "Wuse Zone 4", km: 38.2, x: 610, y: 265, isAnchor: true, partner: "Total" },
    ],
    secondaryLines: ["50,180 270,145 495,225 610,265"],
  },
  "ZUB-DEI-DUT": {
    id: "ZUB-DEI-DUT",
    name: "Zuba to Dutse",
    description: "Zuba · Dei-Dei Market · Dawaki · Dutse Alhaji · Dutse First Gate",
    unitFare: "₦700",
    waypoints: [
      { id: "ZUB", name: "Zuba", km: 0.0, x: 50, y: 90, isAnchor: true, partner: "Conoil" },
      { id: "DEI", name: "Dei-Dei Mkt", km: 8.2, x: 180, y: 130, isAnchor: true, partner: "NNPC" },
      { id: "DAW", name: "Dawaki", km: 15.0, x: 310, y: 170, isAnchor: false, partner: "Flyover" },
      { id: "ALH", name: "Dutse Alhaji", km: 20.3, x: 440, y: 210, isAnchor: true, partner: "Bovas" },
      { id: "DUT", name: "Dutse 1st Gate", km: 24.0, x: 580, y: 250, isAnchor: true, partner: "A.A. Rano" },
    ],
  },
  "ZUB-KRM-JAB": {
    id: "ZUB-KRM-JAB",
    name: "Zuba to Jabi",
    description: "Zuba · Karmo Market · Life Camp Junction · Jabi Lake · Jabi Park",
    unitFare: "₦700",
    waypoints: [
      { id: "ZUB", name: "Zuba", km: 0.0, x: 50, y: 65, isAnchor: true, partner: "Conoil" },
      { id: "KRM", name: "Karmo Market", km: 14.5, x: 190, y: 115, isAnchor: true, partner: "A.A. Rano" },
      { id: "LIF", name: "Life Camp", km: 22.0, x: 330, y: 165, isAnchor: true, partner: "Oando" },
      { id: "LAK", name: "Jabi Lake", km: 28.5, x: 470, y: 215, isAnchor: false, partner: "Roundabout" },
      { id: "JAB", name: "Jabi Park", km: 32.0, x: 600, y: 260, isAnchor: true, partner: "Mobil" },
    ],
  },
  "GWL-LUG-AR1": {
    id: "GWL-LUG-AR1",
    name: "Gwagwalada to Area 1",
    description: "Gwagwalada · Giri Junction · Lugbe Total · City Gate · Area 1",
    unitFare: "₦1,000",
    waypoints: [
      { id: "GWL", name: "Gwagwalada", km: 0.0, x: 50, y: 60, isAnchor: true, partner: "NNPC Mega" },
      { id: "GIR", name: "Giri Junction", km: 12.0, x: 180, y: 110, isAnchor: false, partner: "Interchange" },
      { id: "LUG", name: "Lugbe Total", km: 27.5, x: 330, y: 165, isAnchor: true, partner: "Total" },
      { id: "CIT", name: "City Gate", km: 38.0, x: 470, y: 215, isAnchor: false, partner: "Monument" },
      { id: "AR1", name: "Area 1", km: 45.0, x: 600, y: 265, isAnchor: true, partner: "Roundabout" },
    ],
  },
  "MRB-NYA-CEN": {
    id: "MRB-NYA-CEN",
    name: "Mararaba to Central",
    description: "Mararaba · Nyanya · Karu · AYA Roundabout · Area 10 Central",
    unitFare: "₦600",
    waypoints: [
      { id: "MRB", name: "Mararaba", km: 0.0, x: 50, y: 65, isAnchor: true, partner: "A.A. Rano" },
      { id: "NYA", name: "Nyanya", km: 6.2, x: 180, y: 115, isAnchor: false, partner: "Bridge" },
      { id: "KAR", name: "Karu", km: 11.5, x: 310, y: 165, isAnchor: true, partner: "Bovas" },
      { id: "AYA", name: "AYA Roundabout", km: 18.0, x: 450, y: 215, isAnchor: true, partner: "Total" },
      { id: "CEN", name: "Area 10 Central", km: 23.5, x: 600, y: 260, isAnchor: true, partner: "NNPC" },
    ],
  },
};

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
  isLoading = false,
  elapsedSeconds = 0,
}: AbujaCorridorMapProps) {
  const trip = useAlongTrip();
  const currentCorridorId = trip.activeCorridorId || corridorId;
  const corridor = CORRIDOR_DATA[currentCorridorId] || CORRIDOR_DATA["BWR-DUT-WUS"];

  const [carProgress, setCarProgress] = useState(0.35);

  const isInTransit = trip.journeyStage === "IN_TRANSIT";

  // If in transit, simulate continuous vehicle progression along the corridor
  useEffect(() => {
    if (!isInTransit) return;
    const interval = setInterval(() => {
      setCarProgress((prev) => (prev >= 0.9 ? 0.25 : prev + 0.015));
    }, 400);
    return () => clearInterval(interval);
  }, [isInTransit]);

  // SVG points string for active corridor
  const activePoints = useMemo(() => {
    return corridor.waypoints.map((w) => `${w.x},${w.y}`).join(" ");
  }, [corridor]);

  // Compute interpolated car position
  const carPos = useMemo(() => {
    const wps = corridor.waypoints;
    const totalSegments = wps.length - 1;
    const globalProgress = Math.min(1, Math.max(0, carProgress));
    const scaled = globalProgress * totalSegments;
    const segIndex = Math.min(Math.floor(scaled), totalSegments - 1);
    const segFraction = scaled - segIndex;

    const p1 = wps[segIndex];
    const p2 = wps[segIndex + 1];

    const cx = p1.x + (p2.x - p1.x) * segFraction;
    const cy = p1.y + (p2.y - p1.y) * segFraction;

    return { cx, cy };
  }, [corridor, carProgress]);

  // Identify matching origin and destination waypoints
  const pickupWp = useMemo(() => {
    const term = (trip.currentQuote?.anchorName || anchorName || originName).toLowerCase();
    return (
      corridor.waypoints.find((w) => term.includes(w.name.toLowerCase()) || w.name.toLowerCase().includes("dutse")) ||
      corridor.waypoints[1] ||
      corridor.waypoints[0]
    );
  }, [corridor, trip.currentQuote, anchorName, originName]);

  const dropWp = useMemo(() => {
    const term = (trip.currentQuote?.destName || destName).toLowerCase();
    return (
      corridor.waypoints.find((w) => term.includes(w.name.toLowerCase()) || w.name.toLowerCase().includes("berger") || w.name.toLowerCase().includes("wuse")) ||
      corridor.waypoints[corridor.waypoints.length - 2] ||
      corridor.waypoints[corridor.waypoints.length - 1]
    );
  }, [corridor, trip.currentQuote, destName]);

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
      aria-label="Abuja Corridor Map"
      role="region"
    >
      {/* Map Header */}
      <div
        style={{
          padding: "12px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-paper)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CorridorNode size={16} variant="pickup" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-ink)" }}>
            Abuja Corridor Map ({corridor.id})
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            {corridor.name} · {corridor.unitFare}/seat
          </span>
          {isInTransit && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 12,
                background: "var(--brand-soft)",
                color: "var(--brand-primary)",
                border: "1px solid rgba(11, 110, 79, 0.3)",
              }}
            >
              ● IN TRANSIT
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas with Transit Canvas Warm Styling */}
      <div
        className="along-map-canvas"
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "48%", // 660x320 aspect ratio
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 660 320"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
          aria-hidden="true"
        >
          {/* Subtle grid coordinate dots */}
          <defs>
            <pattern id="mapGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="var(--border-subtle)" opacity="0.6" />
            </pattern>
          </defs>
          <rect width="660" height="320" fill="url(#mapGrid)" />

          {/* Secondary background lines */}
          {corridor.secondaryLines?.map((pts, idx) => (
            <polyline
              key={idx}
              points={pts}
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
          ))}

          {/* Active Corridor Spine */}
          <RouteLine points={activePoints} isActive={true} />

          {/* Waypoint Stations & Forecourt Anchors */}
          {corridor.waypoints.map((wp) => {
            const isPickup = wp.id === pickupWp.id;
            const isDrop = wp.id === dropWp.id;
            const isHighlighted = isPickup || isDrop;

            return (
              <g key={wp.id} transform={`translate(${wp.x}, ${wp.y})`}>
                {/* Station Node Indicator */}
                <circle
                  cx="0"
                  cy="0"
                  r={isHighlighted ? 9 : wp.isAnchor ? 6 : 4.5}
                  fill={isPickup ? "var(--brand-primary)" : isDrop ? "var(--signal-amber)" : "var(--bg-surface)"}
                  stroke={isHighlighted ? "#fff" : "var(--corridor-active)"}
                  strokeWidth={isHighlighted ? 2.5 : 2}
                />

                {isPickup && (
                  <circle
                    cx="0"
                    cy="0"
                    r="15"
                    fill="none"
                    stroke="var(--brand-primary)"
                    strokeWidth="1.5"
                    opacity="0.4"
                    className="along-pulse-ring"
                  />
                )}

                {/* Waypoint Label */}
                <text
                  x="0"
                  y={wp.y > 180 ? 18 : -14}
                  textAnchor="middle"
                  style={{
                    fontSize: isHighlighted ? 11.5 : 10,
                    fontWeight: isHighlighted ? 800 : 600,
                    fill: isHighlighted ? "var(--text-ink)" : "var(--text-muted)",
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  {wp.name}
                </text>

                {/* Forecourt Partner Label */}
                {wp.partner && (
                  <text
                    x="0"
                    y={wp.y > 180 ? 29 : -4}
                    textAnchor="middle"
                    style={{
                      fontSize: 8.5,
                      fontWeight: 500,
                      fill: "var(--text-faint)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {wp.partner}
                  </text>
                )}
              </g>
            );
          })}

          {/* In-Transit Pod Vehicle Marker */}
          {isInTransit && (
            <g transform={`translate(${carPos.cx}, ${carPos.cy})`} style={{ transition: "transform 0.3s ease-out" }}>
              <circle cx="0" cy="0" r="14" fill="var(--brand-primary)" opacity="0.25" />
              <circle cx="0" cy="0" r="8" fill="var(--brand-primary)" stroke="#fff" strokeWidth="2" />
              <text
                x="0"
                y="-12"
                textAnchor="middle"
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  fill: "var(--brand-primary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                POD-842A
              </text>
            </g>
          )}
        </svg>

        {/* Loading overlay */}
        {isLoading && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 12,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 20,
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <CorridorNode size={10} variant="loading" />
            <span>Resolving ({elapsedSeconds}s)</span>
          </div>
        )}
      </div>

      {/* Map Footer with Safe Forecourt Summary */}
      <div
        style={{
          padding: "10px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-paper)",
          fontSize: 12,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <span style={{ color: "var(--text-muted)" }}>Safe Forecourt Pickup: </span>
          <strong style={{ color: "var(--text-ink)" }}>{pickupWp.partner} {pickupWp.name}</strong>
        </div>

        <div>
          <span style={{ color: "var(--text-muted)" }}>Destination: </span>
          <strong style={{ color: "var(--text-ink)" }}>{dropWp.name}</strong>
        </div>
      </div>

      <style jsx global>{`
        [data-theme="light"] .along-map-canvas {
          background-color: #F8F9FA !important;
        }
        [data-theme="dark"] .along-map-canvas {
          background-color: #161C20 !important;
        }

        @keyframes pulseRing {
          0% {
            r: 9;
            opacity: 0.8;
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
