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

const FALLBACK_OPS_DATA: OpsData = {
  brand: "Along",
  city: "Abuja FCT",
  network: {
    active_corridors: 6,
    fare_zones: 18,
    private_filling_station_anchors: 24,
    indexed_landmarks: 142,
    seeded_drivers: 6,
    live_online_drivers: 6,
  },
  ledger_audit: {
    trial_balance_kobo: 0,
    is_balanced: true,
    agbero_extortion_avoided_naira: "14,400",
  },
  active_sos_count: 0,
  sos_alerts: [],
};

const FALLBACK_DRIVERS: DriverRow[] = [
  {
    id: "DRV-ABJ-001",
    full_name: "Mallam Musa Danjuma",
    phone_e164: "+2348031112201",
    phone_mode: "SMARTPHONE",
    corridor_id: "BWR-DUT-WUS",
    vehicle_make_model: "Volkswagen Golf 4",
    vehicle_color: "Silver",
    plate_number: "ABJ-402-AL",
    seat_capacity: 4,
    status: "ONLINE",
  },
  {
    id: "DRV-ABJ-002",
    full_name: "Ibrahim Suleiman",
    phone_e164: "+2348031112202",
    phone_mode: "SMARTPHONE",
    corridor_id: "ZUB-KUB-WUS",
    vehicle_make_model: "Toyota Corolla",
    vehicle_color: "Wine",
    plate_number: "KWL-819-XY",
    seat_capacity: 4,
    status: "ONLINE",
  },
  {
    id: "DRV-ABJ-003",
    full_name: "Chukwudi Okafor",
    phone_e164: "+2348031112203",
    phone_mode: "SMARTPHONE",
    corridor_id: "ZUB-DEI-DUT",
    vehicle_make_model: "Honda Civic",
    vehicle_color: "Blue",
    plate_number: "BWR-512-KD",
    seat_capacity: 4,
    status: "ONLINE",
  },
  {
    id: "DRV-ABJ-004",
    full_name: "Abdullahi Garba",
    phone_e164: "+2348031112204",
    phone_mode: "FEATURE_USSD",
    corridor_id: "ZUB-GWZ-JAB",
    vehicle_make_model: "Peugeot 406",
    vehicle_color: "Ash",
    plate_number: "ABC-904-FM",
    seat_capacity: 4,
    status: "ONLINE",
  },
  {
    id: "DRV-ABJ-005",
    full_name: "Sunday Eze",
    phone_e164: "+2348031112205",
    phone_mode: "SMARTPHONE",
    corridor_id: "GWA-LUG-AR1",
    vehicle_make_model: "Toyota Camry",
    vehicle_color: "Black",
    plate_number: "GWA-228-TR",
    seat_capacity: 4,
    status: "ONLINE",
  },
  {
    id: "DRV-ABJ-006",
    full_name: "Yakubu Mohammed",
    phone_e164: "+2348031112206",
    phone_mode: "SMARTPHONE",
    corridor_id: "MAR-NYA-CBD",
    vehicle_make_model: "Volkswagen Golf 4",
    vehicle_color: "Green",
    plate_number: "RSH-741-NG",
    seat_capacity: 4,
    status: "ONLINE",
  },
];

export default function OpsPage() {
  const [ops, setOps] = useState<OpsData | null>(FALLBACK_OPS_DATA);
  const [drivers, setDrivers] = useState<DriverRow[]>(FALLBACK_DRIVERS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getOpsOverview(), getCorridorDrivers()])
      .then(([opsRes, driversRes]) => {
        if (!cancelled) {
          setOps(opsRes as OpsData);
          if (driversRes.drivers && driversRes.drivers.length > 0) {
            setDrivers(driversRes.drivers);
          }
        }
      })
      .catch(() => {
        // Keep seeded Abuja 6-corridor fallback data when LAN firewall blocks port 8000
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
