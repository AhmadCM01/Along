"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/navigation/Header";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { CorridorNode } from "@/components/brand/CorridorNode";
import {
  getPublicTripShare,
  triggerPublicTripSos,
  PublicTripShareResponse,
} from "@/lib/api";

export default function FamilyTrackingPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const unwrappedParams = React.use(params);
  const shareToken = unwrappedParams.shareToken;

  const [trip, setTrip] = useState<PublicTripShareResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [sosLoading, setSosLoading] = useState<boolean>(false);
  const [sosFeedback, setSosFeedback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPublicTripShare(shareToken)
      .then((res) => {
        if (!cancelled) {
          setTrip(res);
          setSosActive(Boolean(res.sos_active));
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
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  async function handleSosClick() {
    if (sosLoading) return;
    setSosLoading(true);
    setSosFeedback(null);
    try {
      const res = await triggerPublicTripSos(shareToken);
      setSosActive(true);
      setSosFeedback(res.message || "FCT Dispatch and Operations notified");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSosFeedback(`Error: ${msg}`);
    } finally {
      setSosLoading(false);
    }
  }

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
      <Header activeShareToken={shareToken} />

      <main
        style={{
          width: "100%",
          maxWidth: 600,
          margin: "0 auto",
          padding: "24px 20px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Live family trip tracker</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            Real-time Abuja corridor safety monitoring
          </p>
        </div>

        {loading && (
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-card)",
              padding: "24px",
              textAlign: "center",
              fontSize: 13,
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <CorridorNode size={16} variant="loading" />
            <span>Connecting to live trip telemetry...</span>
          </div>
        )}

        {error && (
          <div
            style={{
              background: "var(--danger-soft)",
              border: "1px solid var(--danger-red)",
              color: "var(--danger-red)",
              borderRadius: "var(--radius-card)",
              padding: "16px",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Failed to load trip: {error}
          </div>
        )}

        {trip && (
          <section
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-primary)" }}>
                  Corridor {trip.corridor_id} · Pod {trip.pod_code}
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4 }}>
                  {trip.driver.full_name}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {trip.driver.vehicle_desc}
                </div>
              </div>

              <DepartureNumeral size="md" variant="neutral">
                {trip.driver.plate_number}
              </DepartureNumeral>
            </div>

            <div
              style={{
                paddingTop: 12,
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CorridorNode size={14} variant="pickup" />
                <span style={{ color: "var(--text-muted)" }}>Boarded:</span>
                <strong>{trip.origin_anchor}</strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CorridorNode size={14} variant="driver" />
                <span style={{ color: "var(--text-muted)" }}>Current position:</span>
                <strong>
                  {trip.telemetry.current_landmark} ({trip.telemetry.is_on_corridor ? "On corridor" : "Off corridor"})
                </strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CorridorNode size={14} variant="default" />
                <span style={{ color: "var(--text-muted)" }}>Destination:</span>
                <strong>
                  {trip.destination_landmark} (ETA {trip.telemetry.eta_minutes} mins)
                </strong>
              </div>
            </div>
          </section>
        )}

        {/* 1-Tap Emergency Guard */}
        <section
          style={{
            background: "var(--bg-surface)",
            border: sosActive ? "2px solid var(--danger-red)" : "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-card)",
            padding: "20px",
            boxShadow: "var(--shadow-soft)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--danger-red)" }}>
              One-tap emergency alert
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              Alerts Along Operations Command and FCT Rapid Response if vehicle deviates off the corridor.
            </p>
          </div>

          <button
            onClick={handleSosClick}
            disabled={sosLoading}
            style={{
              width: "100%",
              background: "var(--danger-red)",
              color: "var(--danger-ink)",
              borderRadius: "var(--radius-button)",
              padding: "14px",
              fontSize: 14,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {sosLoading ? (
              <>
                <CorridorNode size={16} variant="loading" />
                <span>Alerting dispatch...</span>
              </>
            ) : sosActive ? (
              <span>SOS alert active · Dispatch notified</span>
            ) : (
              <span>Trigger emergency SOS</span>
            )}
          </button>

          {sosFeedback && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--danger-red)",
              }}
            >
              {sosFeedback}
            </div>
          )}
        </section>
      </main>

      <BottomTabBar activeShareToken={shareToken} />
    </div>
  );
}
