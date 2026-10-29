"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlongLogo } from "@/components/brand/AlongLogo";
import { ShieldCheckIcon, SosBeaconIcon } from "@/components/icons/AlongIcons";
import {
  getPublicTripShare,
  triggerPublicTripSos,
  PublicTripShareResponse,
} from "@/lib/api";

export default function PublicTripSharePage({
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
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let cancelled = false;

    setLoading(true);
    setError(null);
    const start = Date.now();
    timer = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - start) / 100) / 10);
    }, 100);

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
          if (timer) clearInterval(timer);
        }
      });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
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
      setSosFeedback(`Error triggering SOS: ${msg}`);
    } finally {
      setSosLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F7F8F6",
        color: "#0A1410",
        padding: "24px 16px 56px",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Link href="/">
            <AlongLogo variant="light" size="md" />
          </Link>
          <span
            style={{
            background: "rgba(0,135,81,0.12)",
            color: "#008751",
            padding: "5px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
            LIVE FAMILY SAFETY TRACKER
          </span>
        </header>

        {loading && (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(10,20,16,0.1)",
              borderRadius: 16,
              padding: 24,
              textAlign: "center",
              marginBottom: 14,
              fontSize: 13,
              color: "#374740",
            }}
          >
            Fetching live trip telemetry ({elapsedSec.toFixed(1)}s elapsed)...
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #DC2626",
              color: "#DC2626",
              borderRadius: 16,
              padding: 16,
              marginBottom: 14,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Backend Error: {error}
          </div>
        )}

        {trip && (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(10,20,16,0.1)",
              borderRadius: 16,
              padding: 18,
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#008751" }}>
                  {trip.pod_code} | {trip.corridor_id}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
                  {trip.driver.full_name} ({trip.driver.plate_number})
                </div>
                <div style={{ fontSize: 13, color: "#374740" }}>
                  {trip.driver.vehicle_desc} | Escrow: {trip.escrow_status}
                </div>
              </div>
              <ShieldCheckIcon size={28} color="#008751" />
            </div>

            <div
              className="tabular-nums"
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid rgba(10,20,16,0.08)",
                fontSize: 13,
              }}
            >
              <div>
                Boarded At: <strong>{trip.origin_anchor}</strong>
              </div>
              <div style={{ marginTop: 4 }}>
                Current Location:{" "}
                <strong>
                  {trip.telemetry.current_landmark} ({trip.telemetry.is_on_corridor ? "On Corridor" : "Off Corridor"},{" "}
                  {trip.telemetry.route_deviation_m}m dev)
                </strong>
              </div>
              <div style={{ marginTop: 4 }}>
                Destination:{" "}
                <strong>
                  {trip.destination_landmark} (ETA: {trip.telemetry.eta_minutes} mins)
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* 1-Tap Emergency SOS Button */}
        <div
          style={{
            background: sosActive ? "#FEF2F2" : "#FFFFFF",
            border: sosActive ? "2px solid #DC2626" : "1px solid rgba(10,20,16,0.1)",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <SosBeaconIcon size={20} color="#DC2626" />
            <span style={{ fontWeight: 800, fontSize: 15, color: "#DC2626" }}>
              Anti-One-Chance Family Safety Guard
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#374740", marginBottom: 14 }}>
            If the vehicle deviates &gt;800m off the Abuja corridor or you need
            immediate assistance, tap below to alert Along Operations Command
            and FCT Rapid Response.
          </p>
          <button
            onClick={handleSosClick}
            disabled={sosLoading}
            style={{
              width: "100%",
              background: "#DC2626",
              color: "#FFFFFF",
              border: "none",
              padding: "14px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 15,
              cursor: sosLoading ? "not-allowed" : "pointer",
              opacity: sosLoading ? 0.7 : 1,
            }}
          >
            {sosLoading
              ? "DISPATCHING SOS ALERT..."
              : sosActive
              ? "SOS ALERT ACTIVE - FCT DISPATCH NOTIFIED"
              : "TRIGGER 1-TAP EMERGENCY SOS"}
          </button>
          {sosFeedback && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                fontWeight: 600,
                color: sosActive ? "#DC2626" : "#374740",
              }}
            >
              {sosFeedback}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
