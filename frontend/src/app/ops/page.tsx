"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/navigation/Header";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { CorridorNode } from "@/components/brand/CorridorNode";
import { getOpsOverview, getCorridorDrivers } from "@/lib/api";

interface OpsData {
  brand: string;
  city: string;
  network: {
    active_corridors: number;
    fare_zones: number;
    private_filling_station_anchors: number;
    indexed_landmarks: number;
    seeded_drivers: number;
    live_online_drivers: number;
  };
  ledger_audit: {
    trial_balance_kobo: number;
    is_balanced: boolean;
    agbero_extortion_avoided_naira: string;
  };
  active_sos_count: number;
  sos_alerts: Array<Record<string, unknown>>;
}

interface DriverRow {
  id: string;
  full_name: string;
  phone_e164: string;
  phone_mode: string;
  corridor_id: string;
  vehicle_make_model: string;
  vehicle_color: string;
  plate_number: string;
  seat_capacity: number;
  status: string;
}

export default function OpsPage() {
  const [ops, setOps] = useState<OpsData | null>(null);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getOpsOverview(), getCorridorDrivers()])
      .then(([opsRes, driversRes]) => {
        if (!cancelled) {
          setOps(opsRes as OpsData);
          setDrivers(driversRes.drivers || []);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg-paper)",
        color: "var(--text-ink)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header />

      <main
        style={{
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "24px 20px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Abuja operations command (demo)</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            6-corridor fleet telemetry and driver manifests
          </p>
        </div>

        {loading && (
          <div
            style={{
              padding: "20px",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            <CorridorNode size={16} variant="loading" />
            <span>Fetching operations overview...</span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "14px",
              background: "var(--danger-soft)",
              color: "var(--danger-red)",
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--danger-red)",
              fontSize: 13,
            }}
          >
            Failed to load operations data: {error}
          </div>
        )}

        {ops && (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px",
                borderRadius: "var(--radius-card)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Active Corridors</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                {ops.network.active_corridors} / 6
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                {ops.network.indexed_landmarks} indexed landmarks
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px",
                borderRadius: "var(--radius-card)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Safe Station Forecourts</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                {ops.network.private_filling_station_anchors}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--brand-primary)", marginTop: 2 }}>
                Zero roadside extortion
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px",
                borderRadius: "var(--radius-card)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Live Drivers Online</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                {ops.network.live_online_drivers} / {ops.network.seeded_drivers}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                Active in FCT
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px",
                borderRadius: "var(--radius-card)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Active SOS Alerts</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  marginTop: 4,
                  color: ops.active_sos_count > 0 ? "var(--danger-red)" : "var(--brand-primary)",
                }}
              >
                {ops.active_sos_count}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                Rapid response ready
              </div>
            </div>
          </section>
        )}

        {/* Fleet Manifest Table */}
        <section
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-card)",
            padding: "20px",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>
              Driver fleet manifest ({drivers.length} seeded)
            </h2>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    textAlign: "left",
                    color: "var(--text-muted)",
                  }}
                >
                  <th style={{ padding: "8px 6px" }}>Driver ID</th>
                  <th style={{ padding: "8px 6px" }}>Name</th>
                  <th style={{ padding: "8px 6px" }}>Corridor</th>
                  <th style={{ padding: "8px 6px" }}>Vehicle</th>
                  <th style={{ padding: "8px 6px" }}>Plate</th>
                  <th style={{ padding: "8px 6px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr
                    key={d.id}
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <td style={{ padding: "10px 6px", fontWeight: 700, color: "var(--brand-primary)" }}>
                      {d.id}
                    </td>
                    <td style={{ padding: "10px 6px", fontWeight: 600 }}>{d.full_name}</td>
                    <td style={{ padding: "10px 6px" }}>{d.corridor_id}</td>
                    <td style={{ padding: "10px 6px", color: "var(--text-muted)" }}>
                      {d.vehicle_color} {d.vehicle_make_model}
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      <DepartureNumeral size="sm" variant="neutral">
                        {d.plate_number}
                      </DepartureNumeral>
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: d.status === "ONLINE" ? "var(--brand-soft)" : "var(--bg-paper)",
                          color: d.status === "ONLINE" ? "var(--brand-primary)" : "var(--text-muted)",
                        }}
                      >
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <BottomTabBar activeShareToken="tok_demo_family_123" />
    </div>
  );
}
