import React, { useState } from "react";
import Link from "next/link";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { CorridorNode } from "@/components/brand/CorridorNode";

export interface RideCardProps {
  step?: "ASK" | "CONFIRM" | "BOARD" | "SHARE";
  fareNaira: number;
  boardingOtp?: string;
  shareToken?: string;
  vehicleMakeModel?: string;
  plateNumber?: string;
  onConfirmBoarding?: () => void;
  onTriggerSos?: () => void;
  isLoading?: boolean;
}

export function RideCard({
  step = "BOARD",
  fareNaira = 1800,
  boardingOtp = "4817",
  shareToken = "tok_demo_family_123",
  vehicleMakeModel = "Volkswagen Golf",
  plateNumber = "ABJ-402-AL",
  onConfirmBoarding,
  onTriggerSos,
  isLoading = false,
}: RideCardProps) {
  const [copied, setCopied] = useState(false);
  const [sosFired, setSosFired] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/t/${shareToken}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSos = () => {
    setSosFired(true);
    if (onTriggerSos) onTriggerSos();
  };

  const steps = [
    { id: "ASK", label: "Ask" },
    { id: "CONFIRM", label: "Confirm" },
    { id: "BOARD", label: "Board" },
    { id: "SHARE", label: "Share" },
  ];

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
      {/* 4-Step Stepper */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 14,
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {steps.map((s, idx) => {
          const isCurrent = s.id === step;
          const isDone = idx < steps.findIndex((x) => x.id === step);
          return (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: isCurrent ? 700 : 500,
                color: isCurrent
                  ? "var(--brand-primary)"
                  : isDone
                  ? "var(--text-ink)"
                  : "var(--text-faint)",
              }}
            >
              {isCurrent ? (
                <CorridorNode size={14} variant="stepper" />
              ) : isDone ? (
                <span style={{ color: "var(--brand-primary)" }}>✓</span>
              ) : (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--border-strong)",
                    display: "inline-block",
                  }}
                />
              )}
              <span>{s.label}</span>
              {idx < steps.length - 1 && (
                <span style={{ color: "var(--border-strong)", margin: "0 2px" }}>›</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Escrow Badge (Amber: strictly one per screen) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DepartureNumeral size="sm" variant="amber">
            Simulated escrow ₦{fareNaira.toLocaleString()}
          </DepartureNumeral>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Held until forecourt OTP scan
          </span>
        </div>
      </div>

      {/* Vehicle Info */}
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
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Assigned Pod</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-ink)" }}>
            {vehicleMakeModel}
          </div>
        </div>
        <DepartureNumeral size="md" variant="neutral">
          {plateNumber}
        </DepartureNumeral>
      </div>

      {/* Boarding Code & Actions */}
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
            <div style={{ fontSize: 12, color: "var(--brand-primary)", fontWeight: 600 }}>
              Boarding Verification Code
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Show this to driver on entry
            </div>
          </div>
          <DepartureNumeral size="lg" variant="amber" ariaLabel={`Boarding code ${boardingOtp}`}>
            {boardingOtp.split("").join(" ")}
          </DepartureNumeral>
        </div>

        {onConfirmBoarding && (
          <button
            onClick={onConfirmBoarding}
            disabled={isLoading}
            style={{
              width: "100%",
              background: "var(--brand-primary)",
              color: "var(--brand-ink)",
              borderRadius: "var(--radius-button)",
              padding: "12px 18px",
              fontSize: 14,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {isLoading ? (
              <>
                <CorridorNode size={16} variant="loading" />
                <span>Checking boarding code...</span>
              </>
            ) : (
              <span>I have entered (demo shortcut)</span>
            )}
          </button>
        )}
      </div>

      {/* Secondary Destination Links & SOS */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 8,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={handleCopyLink}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--brand-primary)",
              minHeight: 36,
            }}
          >
            {copied ? "Link copied" : "Copy family link"}
          </button>

          <Link
            href={`/driver?code=${boardingOtp}`}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-muted)",
              display: "inline-flex",
              alignItems: "center",
              minHeight: 36,
            }}
          >
            Open driver view ›
          </Link>
        </div>

        <button
          onClick={handleSos}
          style={{
            minHeight: 36,
            padding: "4px 10px",
            borderRadius: "var(--radius-chip)",
            background: sosFired ? "var(--danger-red)" : "transparent",
            color: sosFired ? "var(--danger-ink)" : "var(--danger-red)",
            border: "1px solid var(--danger-red)",
            fontSize: 12,
            fontWeight: 700,
          }}
          aria-label="Trigger SOS emergency"
        >
          {sosFired ? "SOS Active" : "SOS"}
        </button>
      </div>
    </div>
  );
}
