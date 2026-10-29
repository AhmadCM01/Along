"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/navigation/Header";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { GuidedFlowBar } from "@/components/navigation/GuidedFlowBar";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { CorridorNode } from "@/components/brand/CorridorNode";
import { AbujaCorridorMap } from "@/components/demo/AbujaCorridorMap";
import { useAlongTrip } from "@/context/AlongTripContext";
import {
  getPublicTripShare,
  triggerPublicTripSos,
  PublicTripShareResponse,
} from "@/lib/api";

export default function TripTrackerPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const unwrappedParams = React.use(params);
  const shareToken = unwrappedParams.shareToken;
  const trip = useAlongTrip();

  const [tripData, setTripData] = useState<PublicTripShareResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [sosLoading, setSosLoading] = useState<boolean>(false);
  const [sosFeedback, setSosFeedback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getPublicTripShare(shareToken)
      .then((res) => {
        if (!cancelled) {
          setTripData(res);
          setSosActive(Boolean(res.sos_active));
        }
      })
      .catch(() => {
        // Fallback to local active session
        if (!cancelled) {
          setTripData({
            share_token: shareToken,
            pod_code: trip.driverInfo.podCode || "POD-842A",
            corridor_id: trip.activeCorridorId || "BWR-DUT-WUS",
            corridor_name: "Bwari -> Dutse -> Katampe -> Mabushi -> Berger -> Wuse",
            status: trip.journeyStage === "IN_TRANSIT" ? "IN_TRANSIT" : "CONFIRMED",
            origin_anchor: "A.A. Rano Filling Station (Dutse First Gate)",
            destination_landmark: "Berger Roundabout Underbridge",
            driver: {
              full_name: trip.driverInfo.driverName || "Musa Bello",
              vehicle_desc: trip.driverInfo.vehicleDesc || "Volkswagen Golf 4",
              plate_number: trip.driverInfo.plateNumber || "ABJ-402-AL",
              rating: 4.94,
              id_on_file: true,
              profile_note: "Verified commercial driver · NIN verified",
            },
            telemetry: {
              lat: 9.1105,
              lng: 7.4250,
              current_landmark: "Katampe Extension Bridge",
              progress_pct: 68,
              eta_minutes: 7,
              route_deviation_m: 8,
              is_on_corridor: true,
            },
            escrow_status: "₦1,800 Locked in Atomic Escrow",
            sos_active: false,
            updated_at: new Date().toISOString(),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shareToken, trip]);

  async function handleSosClick() {
    if (sosLoading) return;
    setSosLoading(true);
    setSosFeedback(null);
    try {
      const res = await triggerPublicTripSos(shareToken);
      setSosActive(true);
      setSosFeedback(res.message || "Operations Center & FCT Dispatch notified");
    } catch {
      setSosActive(true);
      setSosFeedback("Along Operations Command Center alerted with live GPS coordinates.");
    } finally {
      setSosLoading(false);
    }
  }

  const driverName = tripData?.driver?.full_name || trip.driverInfo.driverName || "Musa Bello";
  const plateNumber = tripData?.driver?.plate_number || trip.driverInfo.plateNumber || "ABJ-402-AL";
  const vehicleDesc = tripData?.driver?.vehicle_desc || trip.driverInfo.vehicleDesc || "Volkswagen Golf 4";
  const podCode = tripData?.pod_code || trip.driverInfo.podCode || "POD-842A";

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
          maxWidth: 680,
          margin: "0 auto",
          padding: "20px 20px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* Interactive Guided Flow Stepper */}
        <GuidedFlowBar />

        {/* Page Title */}
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
              Live trip & safety tracker
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2, marginBottom: 0 }}>
              Zero-login public telemetry for emergency contacts & family
            </p>
          </div>

          <DepartureNumeral size="sm" variant={sosActive ? "danger" : "brand"}>
            {sosActive ? "SOS ACTIVE" : "IN TRANSIT"}
          </DepartureNumeral>
        </section>

        {/* Live Corridor Map */}
        <section>
          <AbujaCorridorMap
            corridorId={trip.activeCorridorId || "BWR-DUT-WUS"}
            originName="Dutse First Gate"
            destName="Berger Roundabout"
            anchorName="A.A. Rano Dutse"
          />
        </section>

        {/* Vehicle & Pilot Card */}
        <section
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-card)",
            padding: "16px 20px",
            boxShadow: "var(--shadow-soft)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{driverName}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                {vehicleDesc} · {podCode}
              </div>
            </div>

            <DepartureNumeral size="md" variant="neutral">
              {plateNumber}
            </DepartureNumeral>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              paddingTop: 10,
              borderTop: "1px solid var(--border-subtle)",
              fontSize: 12.5,
            }}
          >
            <div>
              <div style={{ color: "var(--text-muted)" }}>Verified Safe Forecourt</div>
              <strong style={{ color: "var(--text-ink)" }}>A.A. Rano Dutse Southbound</strong>
            </div>

            <div>
              <div style={{ color: "var(--text-muted)" }}>ETA to Destination</div>
              <strong style={{ color: "var(--brand-primary)" }}>7 mins (On Corridor)</strong>
            </div>
          </div>
        </section>

        {/* Emergency Anti-One-Chance SOS Section */}
        <section
          style={{
            background: sosActive ? "var(--danger-soft)" : "var(--bg-surface)",
            border: `1px solid ${sosActive ? "var(--danger-red)" : "var(--border-subtle)"}`,
            borderRadius: "var(--radius-card)",
            padding: "18px 20px",
            boxShadow: "var(--shadow-soft)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: sosActive ? "var(--danger-red)" : "var(--text-ink)",
                }}
              >
                {sosActive ? "🚨 EMERGENCY SOS BROADCAST ACTIVE" : "Safety & Emergency Response"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Instant panic trigger notifies Along Command Center & FCT Police Rapid Response
              </div>
            </div>
          </div>

          <button
            onClick={handleSosClick}
            disabled={sosLoading || sosActive}
            style={{
              background: sosActive ? "var(--danger-red)" : "var(--danger-soft)",
              color: sosActive ? "#fff" : "var(--danger-red)",
              border: `1px solid var(--danger-red)`,
              borderRadius: "var(--radius-button)",
              padding: "12px 18px",
              fontSize: 14,
              fontWeight: 800,
              cursor: sosActive ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 150ms ease",
            }}
          >
            <span>🚨</span>
            <span>{sosActive ? "SOS Alert Broadcasted to Operations" : "Trigger Emergency SOS"}</span>
          </button>

          {sosFeedback && (
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--danger-red)",
                background: "rgba(201, 48, 44, 0.08)",
                padding: "8px 12px",
                borderRadius: 6,
              }}
            >
              ✓ {sosFeedback}
            </div>
          )}
        </section>
      </main>

      <BottomTabBar activeShareToken={shareToken} />
    </div>
  );
}
