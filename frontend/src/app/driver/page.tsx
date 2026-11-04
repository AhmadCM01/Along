"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/navigation/Header";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { PodNavIcon, LockShieldIcon } from "@/components/icons/AlongIcons";
import { useAlongTrip } from "@/context/AlongTripContext";
import {
  ActivePodData,
  ActivePodPassenger,
  dispatchPodEarly,
  getActivePod,
  resetActivePod,
  verifyBoardingOtp,
  ApiError,
} from "@/lib/api";

export default function DriverPage() {
  const trip = useAlongTrip();

  const [activePod, setActivePod] = useState<ActivePodData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [targetPodId, setTargetPodId] = useState<string | null>(null);

  const [otpCode, setOtpCode] = useState<string>("");
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [revealCodes, setRevealCodes] = useState<boolean>(false);
  const [dispatchLoading, setDispatchLoading] = useState<boolean>(false);

  const initializedCodeRef = useRef<boolean>(false);

  // Read URL query params once on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !initializedCodeRef.current) {
      initializedCodeRef.current = true;
      const params = new URLSearchParams(window.location.search);
      const podParam = params.get("pod");
      const codeParam = params.get("code");

      if (podParam) {
        setTargetPodId(podParam);
      }
      if (codeParam) {
        setOtpCode(codeParam.trim());
        // Remove ?code= from URL while preserving ?pod=
        params.delete("code");
        const nextQuery = params.toString();
        const nextUrl = window.location.pathname + (nextQuery ? `?${nextQuery}` : "");
        window.history.replaceState({}, "", nextUrl);
      }
    }
  }, []);

  // Poll pod every 2 seconds
  const fetchPod = useCallback(async () => {
    try {
      const res = await getActivePod("BWR-DUT-WUS", targetPodId || undefined);
      if (res && res.pod) {
        setActivePod(res.pod);
        // Also sync snapshot into AlongTripContext
        trip.setServerSnapshot({
          podId: res.pod.pod_id,
          stage: res.pod.stage || res.pod.status || "WAITING_FOR_DRIVER",
          stageLabel: res.pod.stage_label || res.pod.status || "Standing by",
          progress: res.pod.progress ?? 0.0,
          position: res.pod.anchor_lat && res.pod.anchor_lng ? { lat: res.pod.anchor_lat, lon: res.pod.anchor_lng } : null,
          previousWaypoint: "",
          nextWaypoint: "",
          etaSeconds: 0,
          boardedCount: res.pod.passengers.filter((x) => x.is_boarded).reduce((acc, x) => acc + (x.seats || 1), 0),
          passengers: res.pod.passengers,
          driver: {
            podCode: res.pod.pod_id,
            driverName: res.pod.driver_name || "Musa Bello",
            plateNumber: res.pod.plate_number || "ABJ-402-AL",
            vehicleDesc: res.pod.vehicle_desc || "Volkswagen Golf 4 (Emerald Green)",
            phoneMode: "SMARTPHONE_AND_2G_USSD",
            ussdShortcode: "*384*247#",
          },
          serverTime: Date.now() / 1000,
          departedAt: res.pod.departed_at || null,
          sosActive: false,
        });
      }
    } catch {
      // Network poll error
    } finally {
      setLoading(false);
    }
  }, [targetPodId, trip]);

  useEffect(() => {
    fetchPod();
    const interval = setInterval(fetchPod, 2000);
    return () => clearInterval(interval);
  }, [fetchPod]);

  // Verify OTP
  async function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode) {
      setOtpError("Enter the 4-digit boarding code");
      return;
    }
    if (!activePod) return;

    setOtpLoading(true);
    setOtpError(null);
    setOtpSuccessMessage(null);

    try {
      const res = await verifyBoardingOtp(
        activePod.driver_id || "DRV-001",
        activePod.pod_id,
        cleanCode,
        "auto"
      );
      setOtpSuccessMessage(res.message || "Code verified successfully! Passenger boarded.");
      setOtpCode("");
      await fetchPod();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setOtpError(err.message);
      } else if (err instanceof Error) {
        setOtpError(err.message);
      } else {
        setOtpError("Verification failed. Please retry.");
      }
    } finally {
      setOtpLoading(false);
    }
  }

  // Start demo drive (calls real dispatch endpoint)
  async function handleStartDemoDrive() {
    if (!activePod || dispatchLoading) return;
    setDispatchLoading(true);
    setOtpError(null);
    setOtpSuccessMessage(null);

    try {
      const res = await dispatchPodEarly(activePod.driver_id || "DRV-001", activePod.pod_id);
      setOtpSuccessMessage(res.message || "Pod dispatched into transit!");
      await fetchPod();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setOtpError(err.message);
      } else if (err instanceof Error) {
        setOtpError(err.message);
      } else {
        setOtpError("Failed to start demo drive.");
      }
    } finally {
      setDispatchLoading(false);
    }
  }

  async function handleReset() {
    try {
      await resetActivePod("BWR-DUT-WUS", targetPodId || undefined);
      setOtpSuccessMessage("Pod reset to standby.");
      setOtpError(null);
      await fetchPod();
    } catch {
      setOtpError("Reset failed.");
    }
  }

  const stage = (activePod?.stage || activePod?.status || "WAITING_FOR_DRIVER").toUpperCase();
  const passengers = activePod?.passengers || [];
  const hasPodRides = passengers.length > 0;
  const atLeastOneBoarded = passengers.some((p) => p.is_boarded);
  const isStageBoarding = stage === "BOARDING";
  const canStartDemoDrive = atLeastOneBoarded && isStageBoarding;
  const isDeparted = stage === "IN_TRANSIT" || stage === "COMPLETED" || Boolean(activePod?.departed_at);

  const trackerShareToken = trip.activeShareToken || trip.shareToken || (trip.currentQuote?.shareToken ?? "");

  // With no pod yet show "No ride yet" and a "Book a ride" button to the start page
  if (!loading && (!activePod || !hasPodRides)) {
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
        <Header activeShareToken={trackerShareToken} />

        <main
          style={{
            flex: 1,
            width: "100%",
            maxWidth: 580,
            margin: "0 auto",
            padding: "60px 20px 90px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--brand-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--brand-primary)",
            }}
          >
            <PodNavIcon size={28} color="var(--brand-primary)" />
          </div>

          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
              No ride yet
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0 }}>
              No active pod found for this session. Book a ride to populate the driver terminal.
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
            Book a ride
          </Link>
        </main>

        <BottomTabBar activeShareToken={trackerShareToken} />
      </div>
    );
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
      <Header activeShareToken={trackerShareToken} />

      <main
        style={{
          width: "100%",
          maxWidth: 680,
          margin: "0 auto",
          padding: "24px 20px 90px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Terminal Header */}
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
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
              Driver Pod & OTP Terminal
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2, marginBottom: 0 }}>
              Pod {activePod?.pod_id || "POD-842A"} · Stage: <strong style={{ color: "var(--brand-primary)" }}>{stage}</strong>
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Judge shortcut toggle */}
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-muted)",
                cursor: "pointer",
                background: "var(--bg-surface)",
                padding: "6px 10px",
                borderRadius: "var(--radius-chip)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <input
                type="checkbox"
                checked={revealCodes}
                onChange={(e) => setRevealCodes(e.target.checked)}
                style={{ cursor: "pointer", accentColor: "var(--brand-primary)" }}
              />
              <span>Judge shortcut: reveal codes</span>
            </label>

            <button
              type="button"
              onClick={handleReset}
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
                padding: "6px 12px",
                borderRadius: "var(--radius-chip)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </section>

        {/* Departure Banner: After departure show "Pod departed" with a button "Open the live tracker" */}
        {isDeparted && (
          <section
            style={{
              background: "var(--brand-soft)",
              border: "1.5px solid var(--brand-primary)",
              borderRadius: "var(--radius-card)",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--brand-primary)" }}>
                Pod departed
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-ink)", marginTop: 2 }}>
                The pod has departed into live transit. Follow real-time progression on the live corridor tracker.
              </div>
            </div>

            <Link
              href={trackerShareToken ? `/t/${trackerShareToken}` : "/"}
              style={{
                background: "var(--brand-primary)",
                color: "#FFFFFF",
                textDecoration: "none",
                padding: "9px 16px",
                borderRadius: "var(--radius-button)",
                fontSize: 13,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Open the live tracker
            </Link>
          </section>
        )}

        {/* Driver Profile */}
        <section
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-card)",
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              {activePod?.driver_name || "Musa Bello"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {activePod?.vehicle_desc || "Volkswagen Golf 4 (Emerald Green)"} · Demo driver profile
            </div>
          </div>
          <DepartureNumeral size="md" variant="neutral">
            {activePod?.plate_number || "ABJ-402-AL"}
          </DepartureNumeral>
        </section>

        {/* 4 Seats from Server */}
        <section
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-card)",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>
              Pod Manifest ({passengers.filter((p) => p.is_boarded).length}/4 Boarded)
            </span>
            <DepartureNumeral size="sm" variant={stage === "IN_TRANSIT" ? "brand" : "amber"}>
              {stage}
            </DepartureNumeral>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {passengers.map((p: ActivePodPassenger, idx: number) => {
              const isUser = !p.simulated || p.display_name.includes("(you)");
              const label = isUser ? "Rider A (you)" : p.display_name;
              return (
                <div
                  key={p.request_id || idx}
                  onClick={() => {
                    if (!p.is_boarded && p.otp_code) {
                      setOtpCode(p.otp_code);
                    }
                  }}
                  style={{
                    background: p.is_boarded ? "var(--brand-soft)" : "var(--bg-paper)",
                    border: `1.5px solid ${p.is_boarded ? "var(--brand-primary)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-button)",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    cursor: !p.is_boarded ? "pointer" : "default",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>
                      SEAT {p.seat_numbers?.join(", ") || idx + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: p.is_boarded ? "var(--brand-primary)" : "var(--signal-ink)",
                      }}
                    >
                      {p.is_boarded ? "✓ Boarded" : "Waiting"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 13.5 }}>{label}</strong>
                    {p.simulated && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border-subtle)",
                          padding: "1px 6px",
                          borderRadius: 4,
                          color: "var(--text-muted)",
                        }}
                      >
                        Simulated rider
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    To: {p.destination} · ₦{p.fare_naira.toLocaleString()}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-ink)",
                      fontWeight: 700,
                    }}
                  >
                    Code: {revealCodes ? p.otp_code : "••••"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Verify Code Box */}
        <section
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-card)",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800 }}>Verify Boarding Code</div>

          <form onSubmit={handleVerify} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 4-digit code"
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "var(--radius-input)",
                border: "1px solid var(--border-strong)",
                background: "var(--bg-paper)",
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.15em",
              }}
            />
            <button
              type="submit"
              disabled={otpLoading || !otpCode.trim()}
              style={{
                padding: "10px 20px",
                borderRadius: "var(--radius-button)",
                background: "var(--brand-primary)",
                color: "#FFFFFF",
                border: "none",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: otpLoading || !otpCode.trim() ? "not-allowed" : "pointer",
                opacity: otpLoading || !otpCode.trim() ? 0.6 : 1,
              }}
            >
              {otpLoading ? "Checking..." : "Verify Code"}
            </button>
          </form>

          {otpSuccessMessage && (
            <div
              style={{
                background: "var(--brand-soft)",
                color: "var(--brand-primary)",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              ✓ {otpSuccessMessage}
            </div>
          )}

          {otpError && (
            <div
              style={{
                background: "var(--danger-soft)",
                color: "var(--danger-red)",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              ⚠️ {otpError}
            </div>
          )}
        </section>

        {/* Start Demo Drive Button: enabled ONLY when at least 1 rider is boarded and stage is BOARDING */}
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={handleStartDemoDrive}
            disabled={!canStartDemoDrive || dispatchLoading}
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: "var(--radius-button)",
              background: canStartDemoDrive ? "var(--brand-primary)" : "var(--bg-surface)",
              color: canStartDemoDrive ? "#FFFFFF" : "var(--text-muted)",
              border: `1.5px solid ${canStartDemoDrive ? "var(--brand-primary)" : "var(--border-subtle)"}`,
              fontSize: 14,
              fontWeight: 800,
              cursor: canStartDemoDrive ? "pointer" : "not-allowed",
              boxShadow: canStartDemoDrive ? "var(--shadow-soft)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>Start demo drive</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: canStartDemoDrive ? "rgba(255,255,255,0.25)" : "var(--bg-paper)",
                padding: "2px 8px",
                borderRadius: 6,
              }}
            >
              Demo shortcut
            </span>
          </button>
          {!canStartDemoDrive && !isDeparted && (
            <span style={{ fontSize: 11.5, color: "var(--text-muted)", textAlign: "center" }}>
              Enabled when at least one rider is boarded and stage is BOARDING.
            </span>
          )}
        </section>
      </main>

      <BottomTabBar activeShareToken={trackerShareToken} />
    </div>
  );
}
