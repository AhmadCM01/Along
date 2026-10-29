import React from "react";

export interface TransitStripProps {
  activeCorridorId?: string;
  onSelectCorridor?: (id: string) => void;
}

const CORRIDORS = [
  { id: "BWR-DUT-WUS", name: "Bwari to Wuse", fare: "₦900" },
  { id: "ZUB-KUB-WUS", name: "Zuba to Wuse", fare: "₦900" },
  { id: "ZUB-DEI-DUT", name: "Zuba to Dutse", fare: "₦700" },
  { id: "ZUB-KRM-JAB", name: "Zuba to Jabi", fare: "₦700" },
  { id: "GWL-LUG-AR1", name: "Gwagwalada to Area 1", fare: "₦1,000" },
  { id: "MRB-NYA-CEN", name: "Mararaba to Central", fare: "₦600" },
];

/**
 * Thin Transit Strip Diagram.
 * Sentence case, neutral grey lines, active line highlighted with brand green.
 */
export function TransitStrip({
  activeCorridorId = "BWR-DUT-WUS",
  onSelectCorridor,
}: TransitStripProps) {
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
          6 lines · 24 safe filling-station forecourts
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 8,
        }}
      >
        {CORRIDORS.map((c) => {
          const isActive = c.id === activeCorridorId;
          return (
            <div
              key={c.id}
              onClick={() => onSelectCorridor && onSelectCorridor(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "var(--radius-button)",
                background: isActive ? "var(--brand-soft)" : "var(--bg-paper)",
                border: `1px solid ${isActive ? "var(--brand-primary)" : "var(--border-subtle)"}`,
                cursor: onSelectCorridor ? "pointer" : "default",
                transition: "all 150ms ease",
              }}
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
                    fontSize: 13,
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
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                {c.fare}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
