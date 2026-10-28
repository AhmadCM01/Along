"use client";

import React from "react";
import Link from "next/link";
import { AlongLogo } from "@/components/brand/AlongLogo";
import { ShieldCheckIcon, SosBeaconIcon } from "@/components/icons/AlongIcons";

const ANCHOR_TELEMETRY = [
  { id: "ANC-DUT-01", name: "A.A. Rano Filling Station (Dutse First Gate)", corridor: "BWR-DUT-WUS", queuedRiders: 12, activePods: 3, driversInBay: 4 },
  { id: "ANC-SOK-01", name: "Bovas Filling Station (Sokale Roundabout)", corridor: "BWR-DUT-WUS", queuedRiders: 8, activePods: 2, driversInBay: 3 },
  { id: "ANC-OAN-01", name: "Oando Filling Station (After Katampe Bridge)", corridor: "BWR-DUT-WUS", queuedRiders: 7, activePods: 2, driversInBay: 2 },
  { id: "ANC-KUB-01", name: "NNPC Mega Station (Kubwa Express)", corridor: "ZUB-KUB-WUS", queuedRiders: 11, activePods: 3, driversInBay: 4 },
  { id: "ANC-LUG-01", name: "Conoil Filling Station (Lugbe Police Signboard)", corridor: "GWL-LUG-AR1", queuedRiders: 15, activePods: 4, driversInBay: 5 },
  { id: "ANC-MRB-01", name: "Matrix Filling Station (Orange Market Mararaba)", corridor: "MRB-NYA-CEN", queuedRiders: 14, activePods: 4, driversInBay: 4 },
];

export default function OpsCommandCenterPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0A0F0D",
        color: "#F3F6F4",
        padding: "20px 28px 56px",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/">
            <AlongLogo variant="dark" size="md" />
          </Link>
          <span
            style={{
              background: "rgba(0,168,107,0.16)",
              color: "#00A86B",
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            ABUJA FCT 6-CORRIDOR OPERATIONS COMMAND CENTER
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/demo"
            style={{
              background: "#008751",
              color: "#FFFFFF",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Judge Cockpit (/demo)
          </Link>
          <Link
            href="/driver"
            style={{
              background: "#17221E",
              color: "#F3F6F4",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Driver PWA (/driver)
          </Link>
        </div>
      </header>

      {/* Top KPI Row */}
      <section
        className="tabular-nums"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div style={{ background: "#111916", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, color: "#9FB0A7" }}>ACTIVE CORRIDORS</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#00A86B", marginTop: 4 }}>6 / 6</div>
          <div style={{ fontSize: 11, color: "#9FB0A7" }}>20 Zones | 140 Landmarks</div>
        </div>
        <div style={{ background: "#111916", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, color: "#9FB0A7" }}>PRIVATE STATION ANCHORS</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#F3F6F4", marginTop: 4 }}>24 Bays</div>
          <div style={{ fontSize: 11, color: "#00A86B" }}>Zero FCTA Clampdown Risk</div>
        </div>
        <div style={{ background: "#111916", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, color: "#9FB0A7" }}>KOBO LEDGER AUDIT</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#00A86B", marginTop: 4 }}>0 Kobo</div>
          <div style={{ fontSize: 11, color: "#9FB0A7" }}>Double-Entry Balanced</div>
        </div>
        <div style={{ background: "#111916", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, color: "#9FB0A7" }}>AGBERO FEES AVOIDED</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#F59E0B", marginTop: 4 }}>₦52,500</div>
          <div style={{ fontSize: 11, color: "#9FB0A7" }}>₦1,250 Saved Per Pod Run</div>
        </div>
        <div style={{ background: "#111916", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, color: "#9FB0A7" }}>FAISS + MUSE LATENCY</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#00A86B", marginTop: 4 }}>4.2 ms</div>
          <div style={{ fontSize: 11, color: "#9FB0A7" }}>1,208 Vector Aliases</div>
        </div>
      </section>

      {/* Private Filling Station Anchor Pool Table */}
      <section
        style={{
          background: "#111916",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: 20,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
          Live Virtual Anchor Point Pools (Private Filling Station Forecourts)
        </h2>
        <table
          className="tabular-nums"
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "#9FB0A7" }}>
              <th style={{ padding: "10px 8px" }}>Anchor ID</th>
              <th style={{ padding: "10px 8px" }}>Private Filling Station Forecourt</th>
              <th style={{ padding: "10px 8px" }}>Corridor</th>
              <th style={{ padding: "10px 8px" }}>Queued Riders</th>
              <th style={{ padding: "10px 8px" }}>Active 4-Seat Pods</th>
              <th style={{ padding: "10px 8px" }}>Drivers in Bay</th>
            </tr>
          </thead>
          <tbody>
            {ANCHOR_TELEMETRY.map((a) => (
              <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "12px 8px", color: "#00A86B", fontWeight: 700 }}>{a.id}</td>
                <td style={{ padding: "12px 8px", fontWeight: 600 }}>{a.name}</td>
                <td style={{ padding: "12px 8px" }}>{a.corridor}</td>
                <td style={{ padding: "12px 8px", color: "#F59E0B", fontWeight: 700 }}>{a.queuedRiders}</td>
                <td style={{ padding: "12px 8px", color: "#00A86B", fontWeight: 700 }}>{a.activePods}</td>
                <td style={{ padding: "12px 8px" }}>{a.driversInBay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
