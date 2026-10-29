"use client";

import React from "react";
import { CorridorNode } from "@/components/brand/CorridorNode";
import { RouteLine } from "@/components/brand/RouteLine";
import { StageTrace } from "@/lib/api";

export interface ActiveResolverScores {
  corridor_id?: string;
  confidence?: number;
  origin?: {
    raw_query: string;
    resolved_canonical: string;
    corridor_id: string;
    score: number;
    anchor_id: string;
    anchor_name: string;
    confidence_tier: string;
    top_candidates?: Array<{ candidate: string; score: number; corridor: string }>;
  };
  destination?: {
    raw_query: string;
    resolved_canonical: string;
    corridor_id: string;
    score: number;
    confidence_tier: string;
    top_candidates?: Array<{ candidate: string; score: number; corridor: string }>;
  };
}

interface AbujaCorridorMapProps {
  corridorId?: string;
  originName?: string;
  destName?: string;
  anchorName?: string;
  midCorridorActive?: boolean;
  traces?: StageTrace[];
  resolverScores?: ActiveResolverScores | null;
  isLoading?: boolean;
  elapsedSeconds?: number;
  errorMessage?: string | null;
}

const WAYPOINTS = [
  { id: "BWR", name: "Bwari", km: 0.0, x: 60, y: 50, isAnchor: true, partner: "NIPCO" },
  { id: "DUT", name: "Dutse", km: 15.1, x: 160, y: 90, isAnchor: true, partner: "A.A. Rano" },
  { id: "SOK", name: "Sokale", km: 18.2, x: 240, y: 130, isAnchor: true, partner: "Bovas" },
  { id: "KAT", name: "Katampe", km: 26.1, x: 360, y: 170, isAnchor: true, partner: "Oando" },
  { id: "MAB", name: "Mabushi", km: 29.4, x: 440, y: 210, isAnchor: false, partner: "Bridge" },
  { id: "BER", name: "Berger", km: 32.5, x: 520, y: 245, isAnchor: false, partner: "Flyover" },
  { id: "WUS", name: "Wuse", km: 36.5, x: 600, y: 280, isAnchor: true, partner: "Total" },
];

export function AbujaCorridorMap({
  corridorId = "BWR-DUT-WUS",
  originName = "Dutse First Gate",
  destName = "Berger Roundabout",
  anchorName = "A.A. Rano Dutse",
  midCorridorActive = false,
  isLoading = false,
  elapsedSeconds = 0,
}: AbujaCorridorMapProps) {
  // SVG points along BWR-DUT-WUS
  const activePoints = "60,50 160,90 240,130 360,170 440,210 520,245 600,280";
  // Secondary background corridors
  const backgroundCorridor1 = "60,150 160,165 300,190 440,210 520,245";
  const backgroundCorridor2 = "120,280 240,260 360,240 520,245 600,280";

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
            Abuja Corridor Map ({corridorId})
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isLoading && (
            <span style={{ fontSize: 12, color: "var(--brand-primary)", fontWeight: 600 }}>
              Drawing route ({elapsedSeconds.toFixed(1)}s)...
            </span>
          )}
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            24 safe forecourts
          </span>
        </div>
      </div>

      {/* SVG Transit Map Canvas */}
      <div
        style={{
          position: "relative",
          background: "var(--bg-paper)",
          padding: "16px 8px",
        }}
      >
        <svg
          viewBox="0 0 660 330"
          style={{ width: "100%", height: "auto", display: "block" }}
          aria-hidden="true"
        >
          {/* Inactive Background Corridors */}
          <RouteLine points={backgroundCorridor1} isActive={false} strokeWidth={3} />
          <RouteLine points={backgroundCorridor2} isActive={false} strokeWidth={3} />

          {/* Active Hero Corridor Line (Animated in 700ms) */}
          <RouteLine points={activePoints} isActive={true} strokeWidth={5} />

          {/* Moving Pod Marker */}
          <g transform={midCorridorActive ? "translate(360, 170)" : "translate(240, 130)"}>
            <circle
              r="14"
              fill="var(--brand-primary)"
              opacity="0.18"
              className="along-pulse"
            />
            <circle
              r="7"
              fill="var(--brand-primary)"
              stroke="var(--bg-surface)"
              strokeWidth="2"
            />
          </g>

          {/* Waypoints & Safe Forecourts */}
          {WAYPOINTS.map((wp) => {
            const isAnchor = wp.isAnchor;
            const isSelected =
              originName.toLowerCase().includes(wp.name.toLowerCase()) ||
              destName.toLowerCase().includes(wp.name.toLowerCase());

            return (
              <g key={wp.id} transform={`translate(${wp.x}, ${wp.y})`}>
                <circle
                  r={isSelected ? 6 : isAnchor ? 4.5 : 3.5}
                  fill={isSelected ? "var(--brand-primary)" : "var(--bg-surface)"}
                  stroke={isSelected ? "var(--brand-primary)" : "var(--text-muted)"}
                  strokeWidth="2"
                />

                <text
                  x="0"
                  y={wp.y < 160 ? -12 : 18}
                  textAnchor="middle"
                  fill="var(--text-ink)"
                  fontSize="11"
                  fontWeight={isSelected ? "700" : "500"}
                  fontFamily="var(--font-heading)"
                >
                  {wp.name}
                </text>
                <text
                  x="0"
                  y={wp.y < 160 ? -2 : 28}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="9.5"
                  fontFamily="var(--font-mono)"
                >
                  {wp.partner}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer Corridor Detail Bar */}
      <div
        style={{
          padding: "10px 16px",
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12.5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--text-muted)" }}>Safe Pickup:</span>
          <strong style={{ color: "var(--text-ink)" }}>{anchorName || originName}</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--text-muted)" }}>Destination:</span>
          <strong style={{ color: "var(--text-ink)" }}>{destName}</strong>
        </div>
      </div>
    </div>
  );
}
