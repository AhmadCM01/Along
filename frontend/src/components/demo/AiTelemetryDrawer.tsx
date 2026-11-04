"use client";

import React from "react";
import Link from "next/link";
import { useAlongTrip } from "@/context/AlongTripContext";
import { BehindTheScenes } from "@/components/demo/BehindTheScenes";
import { HonestyTable } from "@/components/demo/HonestyTable";
import { CorridorNode } from "@/components/brand/CorridorNode";

export function AiTelemetryDrawer() {
  const trip = useAlongTrip();

  if (!trip.aiDrawerOpen) return null;

  const formattedScores = trip.resolverScores
    ? [
        ...(trip.resolverScores.originScores
          ? [
              {
                candidate: trip.resolverScores.originName,
                score: trip.resolverScores.originScores.final_score,
                corridor: trip.activeCorridorId || "BWR-DUT-WUS",
              },
            ]
          : []),
        ...(trip.resolverScores.destScores
          ? [
              {
                candidate: trip.resolverScores.destName,
                score: trip.resolverScores.destScores.final_score,
                corridor: trip.activeCorridorId || "BWR-DUT-WUS",
              },
            ]
          : []),
      ]
    : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        justifyContent: "flex-end",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Meta AI Pipeline & Judge X-Ray Drawer"
    >
      {/* Backdrop */}
      <div
        onClick={() => trip.setAiDrawerOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Drawer Content */}
      <aside
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          height: "100%",
          background: "var(--bg-paper)",
          borderLeft: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-drawer)",
          display: "flex",
          flexDirection: "column",
          zIndex: 101,
          animation: "slideInRight 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Drawer Header */}
        <header
          style={{
            padding: "16px 20px",
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CorridorNode size={20} variant="pickup" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-ink)" }}>
                Meta AI Pipeline & Judge X-Ray
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Meta Muse Spark (muse-spark-open-1026) · Meta FAISS Gazetteer · Simulated Escrow Audit
              </div>
            </div>
          </div>

          <button
            onClick={() => trip.setAiDrawerOpen(false)}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-paper)",
              color: "var(--text-ink)",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close AI X-Ray Drawer"
          >
            ✕
          </button>
        </header>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <BehindTheScenes
            traces={trip.traces}
            resolverScores={formattedScores}
          />

          <HonestyTable />

          <div
            style={{
              padding: "14px 16px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-card)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-ink)" }}>
                Abuja Operations Command Center
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Inspect 6-corridor fleet & double-entry ledger trial balance
              </div>
            </div>
            <Link
              href="/ops"
              onClick={() => trip.setAiDrawerOpen(false)}
              style={{
                padding: "7px 14px",
                borderRadius: "var(--radius-chip)",
                background: "var(--brand-soft)",
                color: "var(--brand-primary)",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Open Ops ➔
            </Link>
          </div>
        </div>
      </aside>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
