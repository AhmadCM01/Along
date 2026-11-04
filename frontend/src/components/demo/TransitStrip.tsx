"use client";

import React from "react";
import { useAlongTrip } from "@/context/AlongTripContext";

export interface TransitStripProps {
  activeCorridorId?: string;
  onSelectCorridor?: (id: string) => void;
}

export const CORRIDORS_LIST = [
  { id: "BWR-DUT-WUS", name: "Bwari - Dutse - Oando - Berger - Wuse / Central Area", fare: "₦900", samplePrompt: "Abeg I dey Dutse first gate, two seats go Berger" },
  { id: "ZUB-KUB-WUS", name: "Zuba - Dei-Dei - Kubwa - Gwarinpa - Oando - Berger - Wuse / Central Area", fare: "₦900", samplePrompt: "I dey Zuba interchange, one seat to Wuse Zone 4" },
  { id: "ZUB-DEI-DUT", name: "Zuba - Dei-Dei - Kubwa - Dutse - Sokale - Bwari Connector", fare: "₦700", samplePrompt: "From Dei-Dei market, I need ride go Dutse Alhaji" },
  { id: "ZUB-KRM-JAB", name: "Zuba - Dei-Dei - Gwagwa - Karmo - Jabi - Utako - Wuse", fare: "₦700", samplePrompt: "Karmo market junction to Jabi park two seats" },
  { id: "GWL-LUG-AR1", name: "Gwagwalada - Airport Rd - Lugbe - Area 1 - Central Area", fare: "₦1,000", samplePrompt: "I dey Police signboard Lugbe, 1 seat go Area 1" },
  { id: "MRB-NYA-CEN", name: "Mararaba - Nyanya - Kugbo - AYA - Central Area - Wuse", fare: "₦600", samplePrompt: "Mararaba bridge to Area 10 Central business district" },
];

/**
 * Thin Transit Strip Diagram.
 * Sentence case, neutral grey lines, active line highlighted with brand green.
 * Clicking any line switches the active corridor and updates the live route map!
 */
export function TransitStrip({
  activeCorridorId,
  onSelectCorridor,
}: TransitStripProps) {
  const trip = useAlongTrip();
  const currentId = activeCorridorId || trip.activeCorridorId || "BWR-DUT-WUS";

  const handleSelect = (id: string) => {
    trip.setActiveCorridorId(id);
    if (onSelectCorridor) {
      onSelectCorridor(id);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-card)",
        padding: "14px 18px",
        boxShadow: "var(--shadow-soft)",
      }}
      aria-label="Active Abuja Transit Corridors"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-ink)" }}>
          Active Abuja Corridors
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          6 lines · 24 safe filling-station forecourts (tap to preview)
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 8,
        }}
      >
        {CORRIDORS_LIST.map((c) => {
          const isActive = c.id === currentId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "var(--radius-button)",
                background: isActive ? "var(--brand-soft)" : "var(--bg-paper)",
                border: `1px solid ${isActive ? "var(--brand-primary)" : "var(--border-subtle)"}`,
                cursor: "pointer",
                transition: "all 150ms ease",
                textAlign: "left",
              }}
              title={`Switch map to ${c.name} (${c.fare}/seat)`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 6,
                    height: 14,
                    borderRadius: 2,
                    background: isActive ? "var(--brand-primary)" : "var(--corridor-inactive)",
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "var(--brand-primary)" : "var(--text-ink)",
                  }}
                >
                  {c.name}
                </span>
              </div>
              <span
                className="tabular-nums"
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: isActive ? "var(--brand-primary)" : "var(--text-muted)",
                }}
              >
                {c.fare}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
