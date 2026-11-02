"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/navigation/Header";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { CorridorNode } from "@/components/brand/CorridorNode";
import { LockShieldIcon, PodNavIcon } from "@/components/icons/AlongIcons";
import { useAlongTrip } from "@/context/AlongTripContext";
import {
  ActivePodData,
  ActivePodPassenger,
  dispatchPodEarly,
  fillPodCoRiders,
  getActivePod,
  getCorridorDrivers,
  resetActivePod,
  updateDriverStatus,
  verifyBoardingOtp,
} from "@/lib/api";

interface DriverSummary {
  id: string;
  full_name: string;
  plate_number: string;
  vehicle_make_model: string;
  corridor_id: string;
  status: string;
}

export default function DriverPage() {
  const trip = useAlongTrip();

  const [driver, setDriver] = useState<DriverSummary>({
    id: "DRV-001",
    full_name: trip.driverInfo.driverName || "Musa Bello",
    plate_number: trip.driverInfo.plateNumber || "ABJ-402-AL",
    vehicle_make_model: trip.driverInfo.vehicleDesc || "Volkswagen Golf 4",
    corridor_id: trip.activeCorridorId || "BWR-DUT-WUS",
    status: "ONLINE",
  });

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>("");
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [revealCodes, setRevealCodes] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get("code");
      if (codeParam) {
        setOtpCode(codeParam.trim());
        params.delete("code");
        const nextQuery = params.toString();
        const nextUrl = window.location.pathname + (nextQuery ? `?${nextQuery}` : "");
        window.history.replaceState({}, "", nextUrl);
      }
    }
  }, []);

  const [activePod, setActivePod] = useState<ActivePodData | null>(null);

  const fetchActivePod = React.useCallback(async () => {
    try {
      const corr = trip.currentQuote?.corridorId || trip.activeCorridorId || "BWR-DUT-WUS";
      const res = await getActivePod(corr, trip.driverInfo?.podCode);
      if (res && res.pod) {
        setActivePod(res.pod);
        if (res.pod.driver_name) {
          setDriver((prev) => ({
            ...prev,
            id: res.pod.driver_id,
            full_name: res.pod.driver_name,
            plate_number: res.pod.plate_number,
            vehicle_make_model: res.pod.vehicle_desc,
            corridor_id: res.pod.corridor_id,
          }));
        }
      }
    } catch {}
  }, [trip.currentQuote?.corridorId, trip.activeCorridorId, trip.driverInfo?.podCode]);

  useEffect(() => {
    fetchActivePod();
    const interval = setInterval(fetchActivePod, 2500);
    return () => clearInterval(interval);
  }, [fetchActivePod]);

  async function handleResetPod() {
    try {
      const corr = trip.currentQuote?.corridorId || trip.activeCorridorId || "BWR-DUT-WUS";
      await resetActivePod(corr, activePod?.pod_id || trip.driverInfo?.podCode);
      await fetchActivePod();
      trip.resetAll();
      setOtpSuccessMessage("Pod manifest reset to empty standby queue.");
      setOtpError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOtpError(msg);
    }
  }

  const livePassengers = activePod && activePod.passengers.length > 0 ? activePod.passengers : null;
  const hasActiveBooking =
    Boolean(livePassengers && livePassengers.length > 0) ||
    (Boolean(trip.currentQuote) && trip.passengers.length > 0);

  const boardedSeatsCount = livePassengers
    ? livePassengers.reduce((acc, p) => acc + (p.is_boarded ? p.seats : 0), 0)
    : trip.passengers.reduce((acc, p) => acc + (p.isBoarded ? p.seatsOccupied || 1 : 0), 0);

  const isPodFull = (activePod?.seats_occupied || 0) >= 4 || boardedSeatsCount >= 4;
  const isInTransit = activePod?.status === "IN_TRANSIT" || trip.journeyStage === "IN_TRANSIT";

  const totalPodEscrowNaira = livePassengers
    ? livePassengers.reduce((acc, p) => acc + p.fare_naira, 0)
    : hasActiveBooking
    ? trip.passengers.reduce((acc, p) => acc + p.fareNaira, 0)
    : 0;

  const capturedEscrowNaira = livePassengers
    ? livePassengers.reduce((acc, p) => acc + (p.is_boarded ? p.fare_naira : 0), 0)
    : hasActiveBooking
    ? trip.passengers.reduce((acc, p) => acc + (p.isBoarded ? p.fareNaira : 0), 0)
    : 0;

  const driverNetNaira = Math.round(capturedEscrowNaira * 0.9);
  const platformFeeNaira = capturedEscrowNaira - driverNetNaira;

  const commuterSeat = trip.passengers.find((p) => p.isCurrentUser);
  const commuterOtp = commuterSeat?.otpCode || trip.currentQuote?.otp || "";

  useEffect(() => {
    if (trip.driverInfo) {
      setDriver((prev) => ({
        ...prev,
        full_name: trip.driverInfo.driverName,
        plate_number: trip.driverInfo.plateNumber,
        vehicle_make_model: trip.driverInfo.vehicleDesc,
        corridor_id: trip.activeCorridorId,
      }));
    }
  }, [trip.driverInfo, trip.activeCorridorId]);

  useEffect(() => {
    let cancelled = false;
    getCorridorDrivers()
      .then((res) => {
        if (!cancelled && res.drivers && res.drivers.length > 0) {
          const first = res.drivers[0];
          setDriver((prev) => ({
            ...prev,
            id: first.id,
            corridor_id: trip.activeCorridorId || first.corridor_id,
            status: first.status,
          }));
          setIsOnline(first.status === "ONLINE");
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [trip.activeCorridorId]);

  async function handleStatusToggle() {
    if (statusLoading) return;
    setStatusLoading(true);
    const nextStatus = isOnline ? "OFFLINE" : "ONLINE";
    try {
      await updateDriverStatus(driver.id, nextStatus, {
        corridor_id: driver.corridor_id,
      });
      setIsOnline(!isOnline);
    } catch {
      setIsOnline(!isOnline);
    } finally {
      setStatusLoading(false);
    }
  }

  const [coRidersLoading, setCoRidersLoading] = useState<boolean>(false);
  const [dispatchLoading, setDispatchLoading] = useState<boolean>(false);

  async function handleVerifyOtp(codeToVerify?: string, requestId?: string) {
    const code = (codeToVerify || otpCode).trim();
    if (!code) {
      setOtpError("Enter the 4-digit passenger boarding code");
      return;
    }

    if (otpLoading) return;
    setOtpLoading(true);
    setOtpError(null);
    setOtpSuccessMessage(null);

    try {
      const podId = activePod?.pod_id || trip.driverInfo.podCode || "POD-842A";
      const driverId = activePod?.driver_id || driver.id || "DRV-001";
      const matchingPassenger = activePod?.passengers?.find((p) => p.otp_code === code);
      const targetReqId = requestId || matchingPassenger?.request_id || "auto";

      await verifyBoardingOtp(
        driverId,
        podId,
        code,
        targetReqId,
        activePod?.anchor_lat || 9.1779,
        activePod?.anchor_lng || 7.3736
      );

      await fetchActivePod();
      trip.boardPassengerByOtp(code);
      setOtpSuccessMessage(
        `Code ${code} verified via HMAC-SHA256. Atomic Escrow captured (90% Driver Net).`
      );
      setOtpCode("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleFillCoRiders() {
    if (coRidersLoading) return;
    setCoRidersLoading(true);
    setOtpError(null);
    setOtpSuccessMessage(null);
    try {
      const podId = activePod?.pod_id || trip.driverInfo.podCode || "POD-842A";
      const driverId = activePod?.driver_id || driver.id || "DRV-001";
      await fillPodCoRiders(driverId, podId);
      await fetchActivePod();
      setOtpSuccessMessage("Co-riders matched and boarded! 4/4 pod seats complete.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOtpError(msg);
    } finally {
      setCoRidersLoading(false);
    }
  }

  async function handleDispatchEarly() {
    if (dispatchLoading) return;
    setDispatchLoading(true);
    setOtpError(null);
    setOtpSuccessMessage(null);
    try {
      const podId = activePod?.pod_id || trip.driverInfo.podCode || "POD-842A";
      const driverId = activePod?.driver_id || driver.id || "DRV-001";
      await dispatchPodEarly(driverId, podId);
      await fetchActivePod();
      trip.startCorridorTrip();
      setOtpSuccessMessage("Pod dispatched into transit!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOtpError(msg);
    } finally {
      setDispatchLoading(false);
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
      <Header activeShareToken={trip.activeShareToken} />

      <main
        style={{
          width: "100%",
          maxWidth: 680,
          margin: "0 auto",
          padding: "24px 20px 90px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* Title & Online Toggle */}
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, margin: 0 }}>
              Driver Pod & OTP Terminal
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2, marginBottom: 0 }}>
              Corridor {trip.currentQuote?.corridorId || trip.activeCorridorId} · Pod {trip.driverInfo.podCode} ·{" "}
              {hasActiveBooking ? "Forecourt Boarding Active" : "Standby Queue"}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-muted)",
                cursor: "pointer",
                background: "var(--bg-paper)",
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
              <span>Judge shortcut: reveal codes (Demo shortcut)</span>
            </label>

            <button
              onClick={handleResetPod}
              title="Reset all booked passengers to fresh standby queue"
              style={{
                background: "var(--bg-paper)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
                padding: "7px 12px",
                borderRadius: "var(--radius-chip)",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Reset Pod
            </button>

            <button
              onClick={handleStatusToggle}
              disabled={statusLoading}
              style={{
                background: isOnline ? "var(--brand-primary)" : "var(--bg-surface)",
                color: isOnline ? "#fff" : "var(--text-muted)",
                border: `1px solid ${isOnline ? "var(--brand-primary)" : "var(--border-subtle)"}`,
                padding: "7px 15px",
                borderRadius: "var(--radius-chip)",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {statusLoading ? "Updating..." : isOnline ? "● Online" : "Offline"}
            </button>
          </div>
        </section>

        {/* Driver Summary Card */}
        <section
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-card)",
            padding: "16px 20px",
            boxShadow: "var(--shadow-soft)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{driver.full_name}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              {driver.vehicle_make_model} ·{" "}
              {hasActiveBooking && trip.currentQuote?.anchorName ? (
                <>
                  Safe Anchor: <strong style={{ color: "var(--brand-primary)" }}>{trip.currentQuote.anchorName}</strong>
                </>
              ) : (
                <span>Standby · Awaiting WhatsApp Forecourt Dispatch</span>
              )}
            </div>
          </div>
          <DepartureNumeral size="md" variant="neutral">
            {driver.plate_number}
          </DepartureNumeral>
        </section>

        {/* STATE A: Standby Empty Pod when no ride has been initiated on WhatsApp */}
        {!hasActiveBooking ? (
          <section
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-card)",
              padding: "24px 22px",
              boxShadow: "var(--shadow-soft)",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{ fontSize: 15.5, fontWeight: 800 }}>
                  4-Seat Pod Manifest (0/4 Boarded)
                </span>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
                  No ride has been dispatched yet. Book a ride on WhatsApp or simulate a live 4-rider corridor pod below.
                </div>
              </div>

              <DepartureNumeral size="sm" variant="neutral">
                STANDBY · 0/4
              </DepartureNumeral>
            </div>

            {/* 4 Empty Standby Seat Slots */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {["FRONT SEAT (SEAT 1)", "BACK LEFT (SEAT 2)", "BACK MIDDLE (SEAT 3)", "BACK RIGHT (SEAT 4)"].map(
                (label, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--bg-paper)",
                      borderRadius: "var(--radius-button)",
                      padding: "13px 14px",
                      border: "1px dashed var(--border-strong)",
                      opacity: 0.78,
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--text-muted)" }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginTop: 4 }}>
                      Empty Seat · Available
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                      OTP: ---- (Unassigned)
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Judge Actions: Book on WhatsApp or Simulate Live Pod */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                paddingTop: 4,
              }}
            >
              <Link
                href="/"
                style={{
                  flex: 1,
                  minWidth: 220,
                  background: "var(--brand-primary)",
                  color: "#FFFFFF",
                  textDecoration: "none",
                  padding: "12px 18px",
                  borderRadius: "var(--radius-button)",
                  fontSize: 13.5,
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <PodNavIcon size={16} color="#FFFFFF" />
                <span>Step 1: Book a Ride on WhatsApp</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setOtpError(null);
                  setOtpSuccessMessage(null);
                  trip.simulatePodDispatch();
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-button)",
                  background: "var(--bg-paper)",
                  color: "var(--text-ink)",
                  border: "1px solid var(--border-strong)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Simulate 4-Rider Pod Dispatch
              </button>
            </div>
          </section>
        ) : (
          /* STATE B: Active Dispatched 4-Seat Pod Manifest */
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 800 }}>
                  4-Seat Pod Manifest ({boardedSeatsCount}/4 Seats Secured)
                </span>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                  Tap any passenger seat to load or toggle its 4-digit boarding OTP
                </div>
              </div>

              <DepartureNumeral
                size="sm"
                variant={isPodFull || isInTransit ? "brand" : "amber"}
              >
                {isInTransit ? "IN TRANSIT" : isPodFull ? "POD FULL (4/4)" : "AWAITING OTP"}
              </DepartureNumeral>
            </div>

            {/* Live Atomic Escrow Split Bar */}
            <div
              style={{
                background: "var(--bg-paper)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <LockShieldIcon size={14} color="var(--brand-primary)" />
                <span>
                  Escrow Captured:{" "}
                  <strong style={{ color: "var(--brand-primary)", fontFamily: "var(--font-mono)" }}>
                    ₦{capturedEscrowNaira.toLocaleString()}
                  </strong>{" "}
                  / ₦{totalPodEscrowNaira.toLocaleString()}
                </span>
              </div>
              <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
                Driver 90%: <strong>₦{driverNetNaira.toLocaleString()}</strong> · Along 10%:{" "}
                <strong>₦{platformFeeNaira.toLocaleString()}</strong>
              </div>
            </div>

            {/* Pod Lifecycle & Fullness Bar */}
            <div
              style={{
                background: isInTransit ? "var(--brand-soft)" : "var(--signal-soft)",
                border: `1.5px solid ${isInTransit ? "rgba(5, 150, 105, 0.38)" : "var(--signal-amber)"}`,
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: isInTransit ? "var(--brand-primary)" : "var(--signal-ink)" }}>
                  {isInTransit
                    ? "● POD IN TRANSIT · DEPARTED FORECOURT"
                    : `● POD STANDBY AT FORECOURT · ${boardedSeatsCount}/4 SEATS BOARDED`}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                  {isInTransit
                    ? "En route to destination along corridor."
                    : isPodFull
                    ? "All 4 seats occupied! Verify boarding codes to depart."
                    : "Shared corridor pooling active: waiting for remaining co-riders."}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {!isPodFull && !isInTransit && (
                  <button
                    type="button"
                    onClick={handleFillCoRiders}
                    disabled={coRidersLoading}
                    title="Simulate co-riders matching and filling the empty seats to 4/4"
                    style={{
                      background: "var(--brand-primary)",
                      color: "#FFFFFF",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "var(--radius-chip)",
                      fontWeight: 700,
                      fontSize: 11.5,
                      cursor: "pointer",
                    }}
                  >
                    {coRidersLoading ? "Matching..." : "+ Simulate Co-Riders (Demo shortcut)"}
                  </button>
                )}
                {!isInTransit && boardedSeatsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDispatchEarly}
                    disabled={dispatchLoading}
                    title="Depart early with currently boarded seats"
                    style={{
                      background: "var(--bg-paper)",
                      color: "var(--text-ink)",
                      border: "1px solid var(--border-subtle)",
                      padding: "6px 12px",
                      borderRadius: "var(--radius-chip)",
                      fontWeight: 700,
                      fontSize: 11.5,
                      cursor: "pointer",
                    }}
                  >
                    {dispatchLoading ? "Departing..." : "Force Dispatch Pod (Demo shortcut)"}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {/* Driver Tile */}
              <div
                style={{
                  background: "var(--bg-paper)",
                  borderRadius: "var(--radius-button)",
                  padding: "12px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>
                  PILOT / DRIVER
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>
                  {driver.full_name}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  Registered Commercial Driver · {trip.currentQuote?.anchorName || "Safe Forecourt"}
                </div>
              </div>

              {/* Real Multi-Browser Live Passengers */}
              {livePassengers && livePassengers.length > 0 ? (
                <>
                  {livePassengers.map((p, pIdx) => {
                    const isBoarded = p.is_boarded;
                    const firstName = p.first_name || (p.display_name && !p.display_name.startsWith("Rider") ? p.display_name.split(" ")[0] : p.display_name || `Rider ${String.fromCharCode(65 + pIdx)}`);
                    return (
                      <div
                        key={p.request_id || pIdx}
                        style={{
                          gridColumn: p.seats > 1 ? "1 / -1" : undefined,
                          background: isBoarded ? "var(--brand-soft)" : "var(--signal-soft)",
                          borderRadius: "var(--radius-button)",
                          padding: "13px 15px",
                          border: `1.5px solid ${
                            isBoarded ? "rgba(5, 150, 105, 0.38)" : "var(--signal-amber)"
                          }`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: isBoarded ? "var(--brand-primary)" : "var(--signal-ink)",
                            }}
                          >
                            SEAT {p.seat_numbers.join(", ")} · {isBoarded ? "✓ BOARDED" : "AWAITING BOARDING"}
                          </span>
                          <DepartureNumeral size="sm" variant={isBoarded ? "brand" : "amber"}>
                            ₦{p.fare_naira.toLocaleString()}
                          </DepartureNumeral>
                        </div>

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-ink)" }}>
                              {firstName}
                            </span>
                            {(p.simulated || p.display_name?.toLowerCase().includes("simulated") || firstName.startsWith("Rider")) && (
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  background: "var(--bg-paper)",
                                  color: "var(--text-muted)",
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  border: "1px solid var(--border-subtle)",
                                }}
                              >
                                Simulated rider
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            {p.origin} ➔ <strong>{p.destination}</strong> ({p.seats} seat{p.seats > 1 ? "s" : ""})
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
                          <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                            OTP: {revealCodes ? (
                              <strong style={{ color: "var(--text-ink)", fontSize: 13 }}>{p.otp_code}</strong>
                            ) : (
                              <span>•••• (Protected)</span>
                            )}
                          </div>

                          {!isBoarded ? (
                            <button
                              type="button"
                              onClick={() => handleVerifyOtp(p.otp_code, p.request_id)}
                              disabled={otpLoading}
                              style={{
                                background: "var(--brand-primary)",
                                color: "#FFFFFF",
                                border: "none",
                                borderRadius: 6,
                                padding: "6px 14px",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Verify OTP {revealCodes ? `(${p.otp_code})` : ""}
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-primary)" }}>
                              Escrow Captured ✓
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Vacant Seats in 4-Seat Automobile Pod */}
                  {(() => {
                    const occupiedSeats = new Set<number>();
                    livePassengers.forEach((p) => p.seat_numbers.forEach((s) => occupiedSeats.add(Number(s))));
                    const vacantSeats = [1, 2, 3, 4].filter((s) => !occupiedSeats.has(s));
                    return vacantSeats.map((sNum) => (
                      <div
                        key={`vacant-${sNum}`}
                        style={{
                          background: "var(--bg-paper)",
                          borderRadius: "var(--radius-button)",
                          padding: "13px 15px",
                          border: "1.5px dashed var(--border-subtle)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                              SEAT {sNum} · VACANT
                            </span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Standby</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginTop: 4 }}>
                            Awaiting Corridor Co-Rider
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                            Corridor {trip.currentQuote?.corridorId || trip.activeCorridorId}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleFillCoRiders}
                          disabled={coRidersLoading}
                          style={{
                            background: "transparent",
                            color: "var(--brand-primary)",
                            border: "1px dashed var(--brand-primary)",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          + Match Co-Rider
                        </button>
                      </div>
                    ));
                  })()}
                </>
              ) : (
                <>
                  {/* Co-Riders (Non-current user seats) */}
                  {trip.passengers
                    .filter((p) => !p.isCurrentUser)
                    .map((p) => {
                      const firstName = p.passengerName.split(" ")[0];
                      return (
                        <div
                          key={p.seatNumber}
                          onClick={() => {
                            setOtpCode(p.otpCode);
                            if (!p.isBoarded) {
                              trip.boardPassengerBySeat(p.seatNumber, true);
                            }
                          }}
                          title="Click to load or verify co-rider OTP"
                          style={{
                            background: p.isBoarded ? "var(--brand-soft)" : "var(--signal-soft)",
                            borderRadius: "var(--radius-button)",
                            padding: "12px",
                            border: `1px solid ${p.isBoarded ? "rgba(5, 150, 105, 0.28)" : "var(--signal-amber)"}`,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span
                              style={{
                                fontSize: 12,
                                color: p.isBoarded ? "var(--brand-primary)" : "var(--signal-ink)",
                                fontWeight: 800,
                              }}
                            >
                              {p.seatLabel} · {p.isBoarded ? "SECURED ✓" : "AWAITING BOARDING"}
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                fontFamily: "var(--font-mono)",
                                color: "var(--text-muted)",
                              }}
                            >
                              OTP: {revealCodes ? p.otpCode : "••••"}
                            </span>
                          </div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>
                            {firstName}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            Route: {p.dropLocation} · ₦{p.fareNaira.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}

                  {/* Current Commuter Booking Seat(s) */}
                  {commuterSeat && (
                    <div
                      onClick={() => setOtpCode(commuterOtp)}
                      style={{
                        gridColumn: "1 / -1",
                        background: commuterSeat.isBoarded ? "var(--brand-soft)" : "var(--signal-soft)",
                        borderRadius: "var(--radius-button)",
                        padding: "14px 16px",
                        border: `1.5px solid ${
                          commuterSeat.isBoarded ? "var(--brand-primary)" : "var(--signal-amber)"
                        }`,
                        cursor: "pointer",
                        transition: "all 200ms ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: commuterSeat.isBoarded ? "var(--brand-primary)" : "var(--signal-ink)",
                          }}
                        >
                          {commuterSeat.seatLabel}:{" "}
                          {commuterSeat.isBoarded ? "BOARDED & ESCROW CAPTURED ✓" : "AWAITING BOARDING"}
                        </span>
                        <DepartureNumeral size="sm" variant={commuterSeat.isBoarded ? "brand" : "amber"}>
                          ₦{commuterSeat.fareNaira.toLocaleString()}
                        </DepartureNumeral>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          marginTop: 6,
                        }}
                      >
                        <div style={{ fontSize: 14.5, fontWeight: 800 }}>
                          Rider (You)
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 800,
                            fontFamily: "var(--font-mono)",
                            color: "var(--brand-primary)",
                          }}
                        >
                          OTP: {revealCodes ? commuterOtp : "•••• (Protected)"}
                        </div>
                      </div>

                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        Route: {trip.currentQuote?.anchorName} ➔ <strong>{commuterSeat.dropLocation}</strong>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 1-Tap Quick Verify Bar */}
            {commuterSeat && !commuterSeat.isBoarded && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--bg-paper)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: 12.5,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span>
                  Passenger Boarding Code from WhatsApp: <strong>{commuterOtp}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOtpCode(commuterOtp);
                    handleVerifyOtp(commuterOtp);
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "var(--radius-chip)",
                    background: "var(--brand-primary)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  ✓ 1-Tap Auto-Verify ({commuterOtp})
                </button>
              </div>
            )}

            {/* OTP Verification Input Form */}
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                maxLength={4}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder={commuterOtp || "OTP"}
                className="tabular-nums"
                style={{
                  width: 110,
                  padding: "10px",
                  fontSize: 18,
                  fontWeight: 800,
                  textAlign: "center",
                  borderRadius: "var(--radius-button)",
                  border: "1px solid var(--border-strong)",
                  background: "var(--bg-paper)",
                  color: "var(--text-ink)",
                  fontFamily: "var(--font-mono)",
                  outline: "none",
                }}
              />

              <button
                onClick={() => handleVerifyOtp()}
                disabled={otpLoading}
                style={{
                  flex: 1,
                  background: "var(--brand-primary)",
                  color: "var(--brand-ink)",
                  border: "none",
                  borderRadius: "var(--radius-button)",
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: otpLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {otpLoading ? (
                  <>
                    <CorridorNode size={14} variant="loading" />
                    <span>Verifying HMAC...</span>
                  </>
                ) : (
                  <span>Verify Boarding Code</span>
                )}
              </button>
            </div>

            {otpError && (
              <div
                style={{
                  background: "var(--danger-soft)",
                  border: "1px solid var(--danger-red)",
                  color: "var(--danger-red)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {otpError}
              </div>
            )}

            {/* Next Step CTA once Boarded */}
            {(otpSuccessMessage || commuterSeat?.isBoarded) && (
              <div
                style={{
                  background: "var(--brand-soft)",
                  border: "1.5px solid var(--brand-primary)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand-primary)" }}>
                  ✓ {otpSuccessMessage || `Passenger verified (OTP ${commuterOtp}). Atomic Escrow captured & locked.`}
                </div>

                <Link
                  href={`/t/${trip.activeShareToken}`}
                  onClick={() => trip.startCorridorTrip()}
                  style={{
                    background: "var(--brand-primary)",
                    color: "#fff",
                    textDecoration: "none",
                    padding: "11px 18px",
                    borderRadius: 10,
                    fontSize: 13.5,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                  }}
                >
                  <span>Initiate Corridor Trip & Launch Live Abuja Map</span>
                  <span>➔</span>
                </Link>
              </div>
            )}
          </section>
        )}
      </main>

      <BottomTabBar activeShareToken={trip.activeShareToken} />
    </div>
  );
}
