import React from "react";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { CorridorNode } from "@/components/brand/CorridorNode";

export interface QuoteCardProps {
  originName: string;
  destName: string;
  anchorName: string;
  fareNaira: number;
  seats?: number;
  walkMinutes?: number;
  savingsPct?: number;
  onBookRide: () => void;
  onReset?: () => void;
  isLoading?: boolean;
}

export function QuoteCard({
  originName,
  destName,
  anchorName,
  fareNaira,
  seats = 1,
  walkMinutes = 4,
  savingsPct = 75,
  onBookRide,
  onReset,
  isLoading = false,
}: QuoteCardProps) {
  const totalNaira = fareNaira * seats;

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-card)",
        padding: "18px 20px",
        boxShadow: "var(--shadow-soft)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Route Stops */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Origin / Safe Anchor */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ marginTop: 2 }}>
            <CorridorNode size={16} variant="pickup" />
          </div>
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Pickup anchor ({walkMinutes} min walk)
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-ink)" }}>
              {anchorName || originName}
            </div>
          </div>
        </div>

        {/* Destination */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ marginTop: 2 }}>
            <CorridorNode size={16} variant="default" />
          </div>
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Drop location</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-ink)" }}>
              {destName}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing & Station Numerals */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 12,
          borderTop: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <DepartureNumeral size="lg" variant="brand">
            ₦{totalNaira.toLocaleString()}
          </DepartureNumeral>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {seats > 1 ? `(₦${fareNaira} x ${seats} seats)` : "per seat"}
          </span>
        </div>

        <div
          style={{
            fontSize: 12.5,
            color: "var(--brand-primary)",
            fontWeight: 600,
            background: "var(--brand-soft)",
            padding: "4px 8px",
            borderRadius: "var(--radius-chip)",
          }}
        >
          Saves about {savingsPct}% vs solo ride
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onBookRide}
          disabled={isLoading}
          style={{
            flex: 1,
            background: "var(--brand-primary)",
            color: "var(--brand-ink)",
            borderRadius: "var(--radius-button)",
            padding: "12px 20px",
            fontSize: 15,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "opacity 150ms ease",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? (
            <>
              <CorridorNode size={16} variant="loading" />
              <span>Locking escrow...</span>
            </>
          ) : (
            <span>Book this ride</span>
          )}
        </button>

        {onReset && (
          <button
            onClick={onReset}
            disabled={isLoading}
            style={{
              padding: "12px 16px",
              background: "var(--bg-paper)",
              color: "var(--text-muted)",
              borderRadius: "var(--radius-button)",
              border: "1px solid var(--border-subtle)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Change
          </button>
        )}
      </div>
    </div>
  );
}
