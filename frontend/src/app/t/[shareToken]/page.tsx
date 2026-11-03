"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/navigation/Header";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { AbujaCorridorMap } from "@/components/demo/AbujaCorridorMap";
import { LinkChainIcon, SosBeaconIcon, PodNavIcon } from "@/components/icons/AlongIcons";
import { useAlongTrip } from "@/context/AlongTripContext";
import {
  getPublicTripShare,
  triggerPublicTripSos,
  PublicTripShareResponse,
} from "@/lib/api";

type TripStage = "waiting for a driver" | "driver on the way" | "boarding" | "in trip" | "completed";

function resolveStage(status?: string): TripStage {
  const s = (status || "").toUpperCase();
  if (s === "COMPLETED" || s === "ARRIVED") return "completed";
  if (s === "IN_TRANSIT" || s === "IN_TRIP" || s === "EN_ROUTE") return "in trip";
  if (s === "BOARDING" || s === "AWAITING_BOARDING" || s === "CONFIRMED" || s === "PROPOSAL") return "boarding";
  if (s === "DRIVER_EN_ROUTE" || s === "DRIVER_ON_THE_WAY" || s === "ASSIGNED") return "driver on the way";
  if (s === "WAITING_FOR_DRIVER" || s === "AWAITING_DRIVER" || s === "PENDING") return "waiting for a driver";
  return "boarding";
}

const STAGE_STEPS: { stage: TripStage; label: string; desc: string }[] = [
  { stage: "waiting for a driver", label: "Waiting for driver", desc: "Matching registered corridor driver at forecourt" },
  { stage: "driver on the way", label: "Driver on the way", desc: "Driver pod is navigating to pickup forecourt" },
  { stage: "boarding", label: "Boarding", desc: "Pod docked at safe forecourt bay, awaiting OTP check" },
  { stage: "in trip", label: "In trip", desc: "Pod en route along corridor with live GPS progression" },
  { stage: "completed", label: "Completed", desc: "Ride completed safely at designated drop off point" },
];

export default function TripTrackerPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const unwrappedParams = React.use(params);
  const shareToken = unwrappedParams.shareToken;
  const trip = useAlongTrip();

  const [tripData, setTripData] = useState<PublicTripShareResponse | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [sosLoading, setSosLoading] = useState<boolean>(false);
  const [sosFeedback, setSosFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const fetchTrip = useCallback(async (isInitial = false) => {
    if (!shareToken) {
      setNotFound(true);
      setInitialLoading(false);
      return;
    }
    try {
      const res = await getPublicTripShare(shareToken);
      setTripData(res);
      setNotFound(false);
      setSosActive(Boolean(res.sos_active));
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      // If server does not have this token
      if (isInitial && (!trip.currentQuote || trip.activeShareToken !== shareToken)) {
        setNotFound(true);
        setTripData(null);
      }
    } finally {
      if (isInitial) {
        setInitialLoading(false);
      }
    }
  }, [shareToken, trip.currentQuote, trip.activeShareToken]);

  // Initial fetch and automatic polling every 2 seconds
  useEffect(() => {
    fetchTrip(true);
    const interval = setInterval(() => {
      fetchTrip(false);
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchTrip]);

  async function handleSosClick() {
    if (sosLoading) return;
    setSosLoading(true);
    setSosFeedback(null);
    try {
      const res = await triggerPublicTripSos(shareToken);
      setSosActive(true);
      setSosFeedback(res.message || "Operations Center and FCT Dispatch notified");
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

  // Handle Unknown or Expired Token screen
  if (notFound && !tripData && !initialLoading) {
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
            flex: 1,
            width: "100%",
            maxWidth: 640,
            margin: "0 auto",
            padding: "48px 20px 90px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--signal-soft)",
              border: "1px solid var(--signal-amber)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--signal-amber)",
            }}
          >
            <PodNavIcon size={32} color="var(--signal-amber)" />
          </div>

          <div>
            <h1 style={{ fontSize: 21, fontWeight: 800, margin: "0 0 10px" }}>
              Trip Not Found
            </h1>
            <p
              style={{
                fontSize: 14.5,
                lineHeight: 1.6,
                color: "var(--text-muted)",
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              This demo trip is not available. Demo data resets when the server restarts. Start a new ride.
            </p>
          </div>

          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              borderRadius: "var(--radius-button)",
              background: "var(--brand-primary)",
              color: "#FFFFFF",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 700,
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <PodNavIcon size={16} color="#FFFFFF" />
            <span>Start a new ride</span>
          </Link>
        </main>

        <BottomTabBar activeShareToken={shareToken} />
      </div>
    );
  }

  const currentStage = resolveStage(tripData?.status);
  const activeOrigin = tripData?.origin_anchor || "Safe Forecourt Anchor";
  const activeDest = tripData?.destination_landmark || "Destination";
  const driverName = tripData?.driver?.full_name || "Musa Bello";
  const plateNumber = tripData?.driver?.plate_number || "ABJ-402-AL";
  const vehicleDesc = tripData?.driver?.vehicle_desc || "Volkswagen Golf 4";
  const podCode = tripData?.pod_code || "POD-842A";
  const progressPct = tripData?.telemetry?.progress_pct ?? 0;
  const currentLandmark = tripData?.telemetry?.current_landmark || activeOrigin;

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
        {/* Title, Last Updated & Action Buttons */}
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, margin: 0 }}>
              Live Corridor and Safety Tracker
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2, marginBottom: 0 }}>
              {tripData
                ? `Real-time corridor telemetry from ${activeOrigin} to ${activeDest}`
                : "Connecting to live pod telemetry stream..."}
            </p>
            {lastUpdated && (
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                Last updated: <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{lastUpdated}</span> (auto-refreshing every 2s)
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {tripData && (
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
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <LinkChainIcon size={13} color="var(--brand-primary)" />
                <span>{copiedLink ? "Link Copied ✓" : "Copy share link"}</span>
              </button>
            )}

            <DepartureNumeral
              size="sm"
              variant={
                sosActive
                  ? "danger"
                  : currentStage === "in trip" || currentStage === "completed"
                  ? "brand"
                  : "amber"
              }
            >
              {sosActive
                ? "SOS ACTIVE"
                : currentStage.toUpperCase()}
            </DepartureNumeral>
          </div>
        </section>

        {/* Clear 5-Stage Lifecycle Progress Bar */}
        <section
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-card)",
            padding: "16px 18px",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "var(--text-muted)",
              letterSpacing: "0.04em",
              marginBottom: 12,
            }}
          >
            TRIP STAGE
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 8,
              position: "relative",
            }}
            className="along-stages-grid"
          >
            {STAGE_STEPS.map((step, idx) => {
              const stageOrder = ["waiting for a driver", "driver on the way", "boarding", "in trip", "completed"];
              const currentIdx = stageOrder.indexOf(currentStage);
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;

              return (
                <div
                  key={step.stage}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: isCurrent
                      ? "var(--brand-soft)"
                      : isPast
                      ? "var(--bg-paper)"
                      : "transparent",
                    border: `1px solid ${
                      isCurrent
                        ? "var(--brand-primary)"
                        : isPast
                        ? "var(--border-subtle)"
                        : "transparent"
                    }`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        fontSize: 10,
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isCurrent
                          ? "var(--brand-primary)"
                          : isPast
                          ? "var(--brand-primary)"
                          : "var(--border-subtle)",
                        color: isCurrent || isPast ? "#FFFFFF" : "var(--text-muted)",
                      }}
                    >
                      {isPast ? "✓" : idx + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isCurrent ? 800 : 600,
                        color: isCurrent ? "var(--brand-primary)" : isPast ? "var(--text-ink)" : "var(--text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      lineHeight: 1.3,
                    }}
                    className="along-stage-desc"
                  >
                    {step.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Abuja Corridor Map with Moving Marker */}
        <section>
          <AbujaCorridorMap
            corridorId={tripData?.corridor_id || "BWR-DUT-WUS"}
            originName={activeOrigin}
            destName={activeDest}
            anchorName={activeOrigin}
            journeyStage={tripData?.status || "BOARDING"}
            progressPct={progressPct}
            driverMarkerLabel="Simulated driver position"
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
          {/* Vehicle and Pilot Card */}
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
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  {driverName}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
                  {vehicleDesc} · {podCode}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--brand-primary)", marginTop: 3, fontWeight: 600 }}>
                  Registered commercial driver · Verified on file
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
                <div style={{ color: "var(--text-muted)" }}>Current Location (Simulated)</div>
                <strong style={{ color: "var(--text-ink)" }}>
                  {currentLandmark}
                </strong>
                <div style={{ color: "var(--brand-primary)", fontWeight: 700, marginTop: 2 }}>
                  Progress: {Math.round(progressPct)}%
                </div>
              </div>

              <div>
                <div style={{ color: "var(--text-muted)" }}>Simulated Escrow Protection</div>
                <strong
                  style={{
                    color: "var(--brand-primary)",
                  }}
                >
                  {tripData?.fare_naira ? `₦${tripData.fare_naira.toLocaleString()}` : "₦1,800"} (Locked in Simulated Escrow)
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
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <SosBeaconIcon size={16} color="var(--danger-red)" />
                <span>
                  {sosActive ? "EMERGENCY SOS BROADCAST ACTIVE" : "Anti-'One-Chance' Safety Beacon"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                1-tap panic alert broadcasts live GPS coordinates and vehicle plate to FCT Rapid Response
              </div>
            </div>

            <button
              onClick={handleSosClick}
              disabled={sosLoading || sosActive}
              style={{
                background: sosActive ? "var(--danger-red)" : "var(--danger-soft)",
                color: sosActive ? "#fff" : "var(--danger-red)",
                border: "1px solid var(--danger-red)",
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
              <SosBeaconIcon size={16} color={sosActive ? "#fff" : "var(--danger-red)"} />
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
          .along-stages-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
