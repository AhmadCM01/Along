"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlongLogo } from "@/components/brand/AlongLogo";
import {
  getOpsOverview,
  getCorridorDrivers,
} from "@/lib/api";

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

export default function OpsCommandCenterPage() {
  const [ops, setOps] = useState<OpsData | null>(null);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let cancelled = false;

    setLoading(true);
    setError(null);
    const start = Date.now();
    timer = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - start) / 100) / 10);
    }, 100);

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
        if (!cancelled) {
          setLoading(false);
          if (timer) clearInterval(timer);
        }
      });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

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

      {loading && (
        <div
          style={{
            background: "#111916",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
            marginBottom: 20,
            color: "#9FB0A7",
            fontSize: 13,
          }}
        >
          Fetching live operations overview ({elapsedSec.toFixed(1)}s elapsed)...
        </div>
      )}

      {error && (
        <div
          style={{
            background: "rgba(220,38,38,0.1)",
            border: "1px solid #DC2626",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            color: "#EF4444",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Backend Error: {error}
        </div>
      )}

      {/* Real Top KPI Row from backend */}
      {ops && (
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
            <div style={{ fontSize: 26, fontWeight: 800, color: "#00A86B", marginTop: 4 }}>
              {ops.network.active_corridors} / 6
            </div>
            <div style={{ fontSize: 11, color: "#9FB0A7" }}>
              {ops.network.fare_zones} Zones | {ops.network.indexed_landmarks} Landmarks
            </div>
          </div>

          <div style={{ background: "#111916", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 11, color: "#9FB0A7" }}>PRIVATE STATION ANCHORS</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#F3F6F4", marginTop: 4 }}>
              {ops.network.private_filling_station_anchors} Forecourts
            </div>
            <div style={{ fontSize: 11, color: "#00A86B" }}>Zero FCTA Clampdown Risk</div>
          </div>

          <div style={{ background: "#111916", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 11, color: "#9FB0A7" }}>KOBO LEDGER AUDIT</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#00A86B", marginTop: 4 }}>
              {ops.ledger_audit.trial_balance_kobo} Kobo
            </div>
            <div style={{ fontSize: 11, color: "#9FB0A7" }}>
              {ops.ledger_audit.is_balanced ? "Double-Entry Balanced" : "Audit Discrepancy"}
            </div>
          </div>

          <div style={{ background: "#111916", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 11, color: "#9FB0A7" }}>LIVE ONLINE DRIVERS</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#00A86B", marginTop: 4 }}>
              {ops.network.live_online_drivers} / {ops.network.seeded_drivers}
            </div>
            <div style={{ fontSize: 11, color: "#9FB0A7" }}>Active on Abuja Corridors</div>
          </div>

          <div style={{ background: "#111916", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 11, color: "#9FB0A7" }}>ACTIVE SOS ALERTS</div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: ops.active_sos_count > 0 ? "#DC2626" : "#00A86B",
                marginTop: 4,
              }}
            >
              {ops.active_sos_count}
            </div>
            <div style={{ fontSize: 11, color: ops.active_sos_count > 0 ? "#DC2626" : "#9FB0A7" }}>
              {ops.active_sos_count > 0 ? "FCT Rapid Response Alerted" : "Zero Safety Incidents"}
            </div>
          </div>
        </section>
      )}

      {/* Real Driver Fleet Manifest from Backend */}
      <section
        style={{
          background: "#111916",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: 20,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
          Live Driver Fleet Manifest ({drivers.length} Seeded Drivers)
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table
            className="tabular-nums"
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "#9FB0A7" }}>
                <th style={{ padding: "10px 8px" }}>Driver ID</th>
                <th style={{ padding: "10px 8px" }}>Full Name</th>
                <th style={{ padding: "10px 8px" }}>Corridor</th>
                <th style={{ padding: "10px 8px" }}>Vehicle</th>
                <th style={{ padding: "10px 8px" }}>Plate Number</th>
                <th style={{ padding: "10px 8px" }}>Phone Mode</th>
                <th style={{ padding: "10px 8px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "12px 8px", color: "#00A86B", fontWeight: 700 }}>{d.id}</td>
                  <td style={{ padding: "12px 8px", fontWeight: 600 }}>{d.full_name}</td>
                  <td style={{ padding: "12px 8px" }}>{d.corridor_id}</td>
                  <td style={{ padding: "12px 8px" }}>
                    {d.vehicle_color} {d.vehicle_make_model}
                  </td>
                  <td style={{ padding: "12px 8px", fontWeight: 700 }}>{d.plate_number}</td>
                  <td style={{ padding: "12px 8px", color: "#9FB0A7" }}>{d.phone_mode}</td>
                  <td style={{ padding: "12px 8px" }}>
                    <span
                      style={{
                        background: d.status === "ONLINE" ? "rgba(0,168,107,0.16)" : "rgba(255,255,255,0.08)",
                        color: d.status === "ONLINE" ? "#00A86B" : "#9FB0A7",
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
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
  );
}
