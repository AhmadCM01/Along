"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/navigation/Header";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { AbujaCorridorMap } from "@/components/demo/AbujaCorridorMap";
import { LinkChainIcon, SosBeaconIcon, PodNavIcon } from "@/components/icons/AlongIcons";
import {
  getPublicTripShare,
  triggerPublicTripSos,
  PublicTripShareResponse,
  ApiError,
} from "@/lib/api";

const STAGES = [
  { key: "WAITING_FOR_DRIVER", label: "Waiting for driver", shortLabel: "Waiting" },
  { key: "DRIVER_ON_THE_WAY", label: "Driver on the way", shortLabel: "On way" },
  { key: "BOARDING", label: "Boarding", shortLabel: "Boarding" },
  { key: "IN_TRANSIT", label: "In transit", shortLabel: "In transit" },
  { key: "COMPLETED", label: "Completed", shortLabel: "Completed" },
];

export default function TripTrackerPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const unwrappedParams = React.use(params);
  const shareToken = unwrappedParams.shareToken;

  const [tripData, setTripData] = useState<PublicTripShareResponse | null>(null);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [consecutiveErrors, setConsecutiveErrors] = useState<number>(0);
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [sosLoading, setSosLoading] = useState<boolean>(false);
  const [sosFeedback, setSosFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const pollIntervalRef = useRef<number>(2000);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTrip = useCallback(async () => {
    if (!shareToken) {
      setNotFoundMessage("This trip is no longer available. The demo server may have restarted. Book a new ride.");
      setInitialLoading(false);
      return;
    }
    try {
      const res = await getPublicTripShare(shareToken);
      setTripData(res);
      setNotFoundMessage(null);
      setConsecutiveErrors(0);
      pollIntervalRef.current = 2000;
      if (res.sos_active) {
        setSosActive(true);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.status === 404 || err.code === "TRIP_NOT_FOUND")) {
        setNotFoundMessage(
          err.message || "This trip is no longer available. The demo server may have restarted. Book a new ride."
        );
        return;
      }
      setConsecutiveErrors((prev) => prev + 1);
      // Exponential backoff up to 16 seconds on network errors
      pollIntervalRef.current = Math.min(16000, pollIntervalRef.current * 2);
    } finally {
      setInitialLoading(false);
    }
  }, [shareToken]);

  // Polling loop with visibility pause and error backoff
  useEffect(() => {
    let active = true;

    const scheduleNext = () => {
      if (!active) return;
      if (document.hidden) {
        // Paused while hidden, wait for visibilitychange
        return;
      }
      timerRef.current = setTimeout(async () => {
        if (!active) return;
        await fetchTrip();
        scheduleNext();
      }, pollIntervalRef.current);
    };

    fetchTrip().then(() => {
      scheduleNext();
    });

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (timerRef.current) clearTimeout(timerRef.current);
        fetchTrip().then(() => scheduleNext());
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchTrip]);

  async function handleSosClick() {
    if (sosLoading || sosActive) return;
    setSosLoading(true);
    setSosFeedback(null);
    try {
      const res = await triggerPublicTripSos(shareToken);
      setSosActive(true);
      setSosFeedback(res.message);
    } catch {
      setSosActive(true);
      setSosFeedback(
        "Demo only. This marks the trip as an emergency in this demo. It does not contact any emergency service. In a real emergency call 112."
      );
    } finally {
      setSosLoading(false);
    }
  }

  function handleShareLink() {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/t/${encodeURIComponent(shareToken)}`;
      if (typeof navigator !== "undefined" && navigator.share) {
        navigator.share({ title: "Along Live Trip", url }).catch(() => {
          navigator.clipboard.writeText(url);
        });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(url);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  }

  // Calm page for TRIP_NOT_FOUND
  if (notFoundMessage && !tripData && !initialLoading) {
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
            maxWidth: 600,
            margin: "0 auto",
            padding: "60px 20px 90px",
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
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--signal-soft)",
              border: "1px solid var(--signal-amber)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--signal-amber)",
            }}
          >
            <PodNavIcon size={28} color="var(--signal-amber)" />
          </div>

          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>
              Trip Not Found
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "var(--text-muted)",
                margin: "0 auto",
              }}
            >
              {notFoundMessage}
            </p>
          </div>

          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: "var(--radius-button)",
              background: "var(--brand-primary)",
              color: "#FFFFFF",
              textDecoration: "none",
              fontSize: 13.5,
              fontWeight: 700,
            }}
          >
            Book a new ride
          </Link>
        </main>

        <BottomTabBar activeShareToken={shareToken} />
      </div>
    );
  }

  const currentStage = (tripData?.stage || "WAITING_FOR_DRIVER").toUpperCase();
  const currentStageIdx = Math.max(0, STAGES.findIndex((s) => s.key === currentStage));
  const progressClamped = Math.min(1.0, Math.max(0.0, tripData?.progress ?? 0.0));
  const progressPct = Math.round(progressClamped * 100);

  // Formatted ETA from eta_seconds using server_time
  const etaMinutes = tripData ? Math.floor(tripData.eta_seconds / 60) : 0;
  const etaSeconds = tripData ? tripData.eta_seconds % 60 : 0;

  // Last updated formatted strictly from server_time
  const lastUpdatedText = tripData?.server_time
    ? new Date(tripData.server_time * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

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
          padding: "20px 20px 90px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Title, Telemetry Header, and Prominent Share Link */}
        <section
          className="tracker-header-section"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div style={{ flex: "1 1 280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
                Live Corridor Tracker
              </h1>
              {consecutiveErrors >= 2 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--signal-ink)",
                    background: "var(--signal-soft)",
                    padding: "2px 8px",
                    borderRadius: 12,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--signal-amber)",
                    }}
                  />
                  Reconnecting...
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--brand-primary)",
                    background: "var(--brand-soft)",
                    padding: "2px 8px",
                    borderRadius: 12,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--brand-primary)",
                    }}
                  />
                  Live
                </span>
              )}
            </div>

            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>
              {tripData
                ? `${tripData.pickup} to ${tripData.drop}`
                : "Connecting to live telemetry..."}
            </p>

            {lastUpdatedText && (
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                Last updated: <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{lastUpdatedText}</span>
              </div>
            )}
          </div>

          {/* Prominent Copy Share Link Button & Guidance */}
          <div
            className="tracker-share-container"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <button
              type="button"
              onClick={handleShareLink}
              className="tracker-share-btn"
              style={{
                padding: "10px 18px",
                borderRadius: "var(--radius-button)",
                background: "var(--brand-primary)",
                color: "#FFFFFF",
                border: "none",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <LinkChainIcon size={15} color="#FFFFFF" />
              <span>{copiedLink ? "Link Copied ✓" : "Copy share link"}</span>
            </button>
            <span
              className="tracker-share-hint"
              style={{
                fontSize: 11.5,
                color: "var(--text-muted)",
                lineHeight: 1.4,
              }}
            >
              Share with family or loved ones to track your live ride in real time.
            </span>
          </div>
        </section>

        {/* 5-Stage Server Indicator */}
        <section
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-card)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-soft)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
              fontWeight: 800,
              color: "var(--text-muted)",
              letterSpacing: "0.04em",
            }}
          >
            <span>CORRIDOR LIFECYCLE</span>
            <span style={{ color: "var(--brand-primary)", fontWeight: 700, fontSize: 12 }}>
              {tripData?.stage_label || currentStage}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              position: "relative",
              width: "100%",
            }}
          >
            {/* Connecting line */}
            <div
              style={{
                position: "absolute",
                top: 11,
                left: "10%",
                right: "10%",
                height: 2,
                background: "var(--border-subtle)",
                zIndex: 0,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 11,
                left: "10%",
                width: `${Math.min(100, Math.max(0, (currentStageIdx / 4) * 80))}%`,
                height: 2,
                background: "var(--brand-primary)",
                zIndex: 0,
                transition: "width 0.3s ease",
              }}
            />

            {STAGES.map((s, idx) => {
              const isPast = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;

              return (
                <div
                  key={s.key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    zIndex: 1,
                    flex: 1,
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      fontSize: 11,
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isCurrent || isPast ? "var(--brand-primary)" : "var(--bg-paper)",
                      border: `1.5px solid ${isCurrent || isPast ? "var(--brand-primary)" : "var(--border-subtle)"}`,
                      color: isCurrent || isPast ? "#FFFFFF" : "var(--text-muted)",
                      boxShadow: isCurrent ? "0 0 0 3px var(--brand-soft)" : "none",
                    }}
                  >
                    {isPast ? "✓" : idx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: isCurrent ? 800 : isPast ? 700 : 500,
                      color: isCurrent
                        ? "var(--brand-primary)"
                        : isPast
                        ? "var(--text-ink)"
                        : "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.shortLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Corridor Map and Live Marker */}
        <section>
          <AbujaCorridorMap
            corridorId="BWR-DUT-WUS"
            originName={tripData?.pickup || "Pickup"}
            destName={tripData?.drop || "Destination"}
            anchorName={tripData?.pickup || "Pickup Anchor"}
            journeyStage={currentStage}
            progressPct={progressPct}
            podId={tripData?.pod_code || tripData?.pod_id}
          />
        </section>

        {/* Server Waypoint & ETA Strip */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-card)",
            padding: "14px 16px",
          }}
        >
          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Previous Waypoint</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-ink)", marginTop: 2 }}>
              {tripData?.previous_waypoint || "Origin anchor forecourt"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Next Waypoint</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--brand-primary)", marginTop: 2 }}>
              {tripData?.next_waypoint || "Approaching stop"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Estimated Time Remaining</div>
            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--font-mono)", marginTop: 2 }}>
              {currentStage === "COMPLETED" ? "0m 0s (Arrived)" : `${etaMinutes}m ${etaSeconds}s`}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Route Progress</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--brand-primary)", marginTop: 2 }}>
              {progressPct}% ({tripData?.boarded_count ?? 0}/{tripData?.pod_seats_total ?? 4} Boarded)
            </div>
          </div>
        </section>

        {/* Driver Profile & Honest SOS Card */}
        <section
          className="tracker-cards-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          {/* Driver Profile */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-card)",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>
                  {tripData?.driver?.full_name || "Musa Bello"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {tripData?.driver?.vehicle_desc || "Volkswagen Golf 4 (Emerald Green)"}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--brand-primary)", marginTop: 2, fontWeight: 600 }}>
                  Demo driver profile
                </div>
              </div>
              <DepartureNumeral size="md" variant="neutral">
                {tripData?.plate || "ABJ-402-AL"}
              </DepartureNumeral>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 8,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              Simulated Escrow: <strong style={{ color: "var(--brand-primary)" }}>{tripData?.escrow_status || "Simulated"}</strong>
            </div>
          </div>

          {/* Honest SOS Emergency Card */}
          <div
            style={{
              background: sosActive ? "var(--danger-soft)" : "var(--bg-surface)",
              border: `1px solid ${sosActive ? "var(--danger-red)" : "var(--border-subtle)"}`,
              borderRadius: "var(--radius-card)",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: sosActive ? "var(--danger-red)" : "var(--text-ink)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <SosBeaconIcon size={16} color="var(--danger-red)" />
                <span>{sosActive ? "EMERGENCY MARKED IN DEMO" : "Emergency SOS"}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                Demo only. This marks the trip as an emergency in this demo. It does not contact any emergency service. In a real emergency call 112.
              </div>
            </div>

            <button
              type="button"
              onClick={handleSosClick}
              disabled={sosLoading || sosActive}
              style={{
                background: sosActive ? "var(--danger-red)" : "var(--danger-soft)",
                color: sosActive ? "#FFFFFF" : "var(--danger-red)",
                border: "1px solid var(--danger-red)",
                borderRadius: "var(--radius-button)",
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 700,
                cursor: sosActive ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <SosBeaconIcon size={14} color={sosActive ? "#FFFFFF" : "var(--danger-red)"} />
              <span>{sosActive ? "Emergency Marked in Demo" : "Trigger Emergency SOS"}</span>
            </button>

            {sosFeedback && (
              <div style={{ fontSize: 11.5, color: "var(--danger-red)", fontWeight: 600 }}>
                {sosFeedback}
              </div>
            )}
          </div>
        </section>
      </main>

      <BottomTabBar activeShareToken={shareToken} />

      <style jsx>{`
        @media (max-width: 640px) {
          .tracker-header-section {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .tracker-share-container {
            align-items: stretch !important;
            width: 100% !important;
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-card);
            padding: 12px 14px;
            box-shadow: var(--shadow-soft);
          }
          .tracker-share-btn {
            width: 100% !important;
            padding: 12px 16px !important;
            font-size: 14px !important;
          }
          .tracker-share-hint {
            text-align: center !important;
          }
        }
        @media (min-width: 641px) {
          .tracker-share-container {
            align-items: flex-end !important;
            max-width: 280px !important;
            text-align: right !important;
          }
        }
        @media (max-width: 720px) {
          .tracker-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
