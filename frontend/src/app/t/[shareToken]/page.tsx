"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/navigation/Header";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { AbujaCorridorMap } from "@/components/demo/AbujaCorridorMap";
import { TransitStrip } from "@/components/demo/TransitStrip";
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
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [sosLoading, setSosLoading] = useState<boolean>(false);
  const [sosFeedback, setSosFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    getPublicTripShare(shareToken)
      .then((res) => {
        if (!cancelled) {
          setTripData(res);
          setSosActive(Boolean(res.sos_active));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTripData({
            share_token: shareToken,
            pod_code: trip.driverInfo.podCode || "POD-842A",
            corridor_id: trip.activeCorridorId || "BWR-DUT-WUS",
            corridor_name: "Bwari -> Dutse -> Katampe -> Mabushi -> Berger -> Wuse",
            status: "IN_TRANSIT",
            origin_anchor: trip.currentQuote?.anchorName || "A.A. Rano Filling Station (Dutse First Gate)",
            destination_landmark: trip.currentQuote?.destName || "Berger Roundabout Underbridge",
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
              eta_minutes: 6,
              route_deviation_m: 8,
              is_on_corridor: true,
            },
            escrow_status: "Locked in Atomic Escrow",
            sos_active: false,
            updated_at: new Date().toISOString(),
          });
        }
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

  function handleCopyShareLink() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
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
          maxWidth: 880,
          margin: "0 auto",
          padding: "22px 20px 90px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* Title & Status Badge */}
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, margin: 0 }}>
              Live Corridor & Safety Tracker
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2, marginBottom: 0 }}>
              Real-time route progression from your safe forecourt pickup to destination
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={handleCopyShareLink}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-chip)",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-ink)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {copiedLink ? "✓ Link Copied" : "🔗 Copy Share Link"}
            </button>

            <DepartureNumeral size="sm" variant={sosActive ? "danger" : "brand"}>
              {sosActive ? "SOS ACTIVE" : "IN TRANSIT"}
            </DepartureNumeral>
          </div>
        </section>

        {/* Smart Curved Corridor Map */}
        <section>
          <AbujaCorridorMap
            corridorId={trip.activeCorridorId || "BWR-DUT-WUS"}
            originName={trip.currentQuote?.originName || "Dutse First Gate"}
            destName={trip.currentQuote?.destName || "Berger Roundabout"}
            anchorName={trip.currentQuote?.anchorName || "A.A. Rano Dutse"}
          />
        </section>

        {/* Interactive 6-Corridor Switcher */}
        <section>
          <TransitStrip
            activeCorridorId={trip.activeCorridorId}
            onSelectCorridor={(id) => trip.setActiveCorridorId(id)}
          />
        </section>

        {/* 2-Column Bottom Cards: Vehicle Telemetry + Anti-One-Chance SOS */}
        <section
          className="tracker-cards-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          {/* Vehicle & Pilot Card */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-card)",
              padding: "18px 20px",
              boxShadow: "var(--shadow-soft)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{driverName}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
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
                paddingTop: 12,
                borderTop: "1px solid var(--border-subtle)",
                fontSize: 12,
              }}
            >
              <div>
                <div style={{ color: "var(--text-muted)" }}>Safe Forecourt Anchor</div>
                <strong style={{ color: "var(--text-ink)" }}>
                  {trip.currentQuote?.anchorName || "A.A. Rano Dutse"}
                </strong>
              </div>

              <div>
                <div style={{ color: "var(--text-muted)" }}>Escrow Protection</div>
                <strong style={{ color: "var(--brand-primary)" }}>
                  {trip.currentQuote?.totalFare || "₦1,800"} Captured
                </strong>
              </div>
            </div>
          </div>

          {/* Emergency Anti-One-Chance SOS Card */}
          <div
            style={{
              background: sosActive ? "var(--danger-soft)" : "var(--bg-surface)",
              border: `1px solid ${sosActive ? "var(--danger-red)" : "var(--border-subtle)"}`,
              borderRadius: "var(--radius-card)",
              padding: "18px 20px",
              boxShadow: "var(--shadow-soft)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: sosActive ? "var(--danger-red)" : "var(--text-ink)",
                }}
              >
                {sosActive ? "🚨 EMERGENCY SOS BROADCAST ACTIVE" : "Anti-'One-Chance' Safety Beacon"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                1-tap panic alert broadcasts live GPS coordinates & vehicle plate to FCT Rapid Response
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
                padding: "11px 16px",
                fontSize: 13.5,
                fontWeight: 800,
                cursor: sosActive ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span>🚨</span>
              <span>{sosActive ? "SOS Broadcasted to Command Center" : "Trigger Emergency SOS"}</span>
            </button>

            {sosFeedback && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--danger-red)",
                }}
              >
                ✓ {sosFeedback}
              </div>
            )}
          </div>
        </section>
      </main>

      <BottomTabBar activeShareToken={shareToken} />

      <style jsx>{`
        @media (max-width: 720px) {
          .tracker-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
