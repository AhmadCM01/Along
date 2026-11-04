import React, { useState } from "react";
import Link from "next/link";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { CorridorNode } from "@/components/brand/CorridorNode";

export interface RideCardProps {
  step?: "ASK" | "CONFIRM" | "BOARD" | "SHARE";
  fareNaira?: number;
  boardingOtp?: string;
  shareToken?: string;
  podId?: string;
  anchorName?: string;
  vehicleMakeModel?: string;
  plateNumber?: string;
  onConfirmBoarding?: () => void;
  onTriggerSos?: () => void;
  isLoading?: boolean;
}

export function RideCard({
  fareNaira = 1800,
  boardingOtp = "4817",
  shareToken = "tok_demo_family_123",
  podId = "POD-842A",
  anchorName = "A.A. Rano Filling Station (Dutse First Gate)",
  vehicleMakeModel = "Volkswagen Golf 4",
  plateNumber = "ABJ-402-AL",
  onTriggerSos,
}: RideCardProps) {
  const [copied, setCopied] = useState(false);
  const [sosFired, setSosFired] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/t/${shareToken}`;
      if (typeof navigator !== "undefined" && navigator.share) {
        navigator.share({ title: "Along Live Trip", url }).catch(() => {
          navigator.clipboard.writeText(url);
        });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(url);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSos = () => {
    setSosFired(true);
    if (onTriggerSos) onTriggerSos();
  };

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-card)",
        padding: "20px",
        boxShadow: "var(--shadow-soft)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Safe Pickup Anchor Forecourt */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-paper)",
          padding: "10px 14px",
          borderRadius: "var(--radius-input)",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Safe Pickup Forecourt</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-ink)" }}>
            {anchorName}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Simulated Fare</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--brand-primary)" }}>
            ₦{fareNaira.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Boarding Code */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "14px",
          background: "var(--brand-soft)",
          borderRadius: "var(--radius-input)",
          border: "1px solid rgba(11, 110, 79, 0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--brand-primary)", fontWeight: 700 }}>
              Boarding Code
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Show this code to the driver upon entry
            </div>
          </div>
          <DepartureNumeral size="lg" variant="amber" ariaLabel={`Boarding code ${boardingOtp}`}>
            {boardingOtp.split("").join(" ")}
          </DepartureNumeral>
        </div>
      </div>

      {/* Three Actions in Exact Order */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* 1. Give this code to the driver */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-ink)" }}>
            1. Give this code to the driver
          </span>
          <Link
            href={`/driver?pod=${encodeURIComponent(podId)}&code=${encodeURIComponent(boardingOtp)}`}
            style={{
              textDecoration: "none",
              background: "var(--brand-primary)",
              color: "#FFFFFF",
              borderRadius: "var(--radius-button)",
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            Open driver view (demo shortcut)
          </Link>
        </div>

        {/* 2. Share your trip with family */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-ink)" }}>
            2. Share your trip with family
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              width: "100%",
              background: "var(--bg-paper)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-ink)",
              borderRadius: "var(--radius-button)",
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {copied ? "✓ Share link copied!" : "Copy share link"}
          </button>
        </div>

        {/* 3. Watch the live corridor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-ink)" }}>
            3. Watch the live corridor
          </span>
          <Link
            href={`/t/${encodeURIComponent(shareToken)}`}
            style={{
              textDecoration: "none",
              background: "var(--bg-paper)",
              border: "1px solid var(--brand-primary)",
              color: "var(--brand-primary)",
              borderRadius: "var(--radius-button)",
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            Watch the live corridor
          </Link>
        </div>
      </div>

      {/* Driver info & SOS */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 8,
          borderTop: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Demo driver profile · {plateNumber} ({vehicleMakeModel})
        </div>
        <button
          onClick={handleSos}
          style={{
            minHeight: 32,
            padding: "4px 10px",
            borderRadius: "var(--radius-chip)",
            background: sosFired ? "var(--danger-red)" : "transparent",
            color: sosFired ? "#FFFFFF" : "var(--danger-red)",
            border: "1px solid var(--danger-red)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
          aria-label="Trigger SOS emergency"
        >
          {sosFired ? "SOS Active" : "SOS"}
        </button>
      </div>

      {sosFired && (
        <div
          style={{
            fontSize: 11.5,
            color: "var(--danger-red)",
            background: "var(--danger-soft)",
            padding: "8px 12px",
            borderRadius: 6,
            lineHeight: 1.4,
          }}
        >
          Demo only. This marks the trip as an emergency in this demo. It does not contact any emergency service. In a real emergency call 112.
        </div>
      )}
    </div>
  );
}
