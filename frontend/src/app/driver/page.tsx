"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlongLogo } from "@/components/brand/AlongLogo";
import { SteeringWheelIcon } from "@/components/icons/AlongIcons";
import {
  getCorridorDrivers,
  updateDriverStatus,
  verifyBoardingOtp,
} from "@/lib/api";

interface DriverSummary {
  id: string;
  full_name: string;
  phone_e164: string;
  plate_number: string;
  vehicle_make_model: string;
  corridor_id: string;
  status: string;
}

export default function DriverCompanionPage() {
  const [driver, setDriver] = useState<DriverSummary>({
    id: "DRV-001",
    full_name: "Musa Danjuma",
    phone_e164: "+2348030000001",
    plate_number: "ABJ-412K",
    vehicle_make_model: "Toyota Corolla",
    corridor_id: "BWR-DUT-WUS",
    status: "ONLINE",
  });

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [statusElapsedSec, setStatusElapsedSec] = useState<number>(0);

  const [otpCode, setOtpCode] = useState<string>("4829");
  const [boardedCount, setBoardedCount] = useState<number>(3);
  const [escrowState, setEscrowState] = useState<string>("PENDING_BOARDING");
  const [podStatus, setPodStatus] = useState<string>("BOARDING");

  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpElapsedSec, setOtpElapsedSec] = useState<number>(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCorridorDrivers()
      .then((res) => {
        if (!cancelled && res.drivers && res.drivers.length > 0) {
          const first = res.drivers[0];
          setDriver({
            id: first.id,
            full_name: first.full_name,
            phone_e164: first.phone_e164,
            plate_number: first.plate_number,
            vehicle_make_model: first.vehicle_make_model,
            corridor_id: first.corridor_id,
            status: first.status,
          });
          setIsOnline(first.status === "ONLINE");
        }
      })
      .catch(() => {
        // Keep default driver state if backend unreachable
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStatusToggle() {
    if (statusLoading) return;
    setStatusLoading(true);
    const start = Date.now();
    const timer = setInterval(() => {
      setStatusElapsedSec(Math.round((Date.now() - start) / 100) / 10);
    }, 100);

    const nextStatus = isOnline ? "OFFLINE" : "ONLINE";
    try {
      await updateDriverStatus(driver.id, nextStatus, {
        corridor_id: driver.corridor_id,
      });
      setIsOnline(!isOnline);
    } catch {
      // Toggle locally for demo continuity
      setIsOnline(!isOnline);
    } finally {
      clearInterval(timer);
      setStatusLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otpLoading) return;
    setOtpLoading(true);
    setOtpError(null);
    setOtpSuccessMessage(null);

    const start = Date.now();
    const timer = setInterval(() => {
      setOtpElapsedSec(Math.round((Date.now() - start) / 100) / 10);
    }, 100);

    try {
      const res = await verifyBoardingOtp(
        driver.id,
        "POD-842A",
        otpCode,
        "rr-demo-01",
        9.1779,
        7.3736
      );
      setBoardedCount(res.boarded_count || 4);
      setEscrowState(res.escrow_state || "CAPTURED");
      setPodStatus(res.pod_status || "IN_TRANSIT");
      setOtpSuccessMessage(
        `OTP Verified. Escrow captured: 90% Driver net guaranteed. Pod status: ${res.pod_status || "IN_TRANSIT"}.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOtpError(msg);
    } finally {
      clearInterval(timer);
      setOtpLoading(false);
    }
  }

  const bgCanvas = "#EEF2EF";
  const bgPhone = "#FFFFFF";
  const textPrimary = "#0A1410";
  const textSecondary = "#374740";
  const borderCol = "rgba(10,20,16,0.12)";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bgCanvas,
        color: textPrimary,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "Inter, 'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Top Navigation */}
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <Link href="/">
          <AlongLogo variant="light" size="sm" />
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
          DRIVER DISPATCH & MANIFEST
        </span>
      </div>

      {/* Realistic Mobile Device Frame */}
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: bgPhone,
          borderRadius: 28,
          border: "4px solid #D6DFD9",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Mobile Device Status Bar */}
        <div
          style={{
            background: "#E2E8E4",
            padding: "8px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: "#374740",
            borderBottom: `1px solid ${borderCol}`,
          }}
        >
          <span className="tabular-nums" style={{ fontWeight: 700, color: textPrimary }}>
            12:45
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>MTN-NG 4G</span>
            <span>● 94%</span>
          </div>
        </div>

        {/* Driver Companion Main Content */}
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Driver Identity Card & Online Toggle */}
          <div
            style={{
              background: "#F7F8F6",
              borderRadius: 14,
              padding: 14,
              border: `1px solid ${borderCol}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{driver.full_name}</div>
              <div className="tabular-nums" style={{ fontSize: 12, color: textSecondary }}>
                Plate: <strong>{driver.plate_number}</strong> ({driver.vehicle_make_model})
              </div>
              <div style={{ fontSize: 11.5, color: "#008751", fontWeight: 600, marginTop: 2 }}>
                Corridor: {driver.corridor_id}
              </div>
            </div>

            <button
              onClick={handleStatusToggle}
              disabled={statusLoading}
              style={{
                background: isOnline ? "#008751" : "#64756D",
                color: "#FFFFFF",
                border: "none",
                padding: "8px 16px",
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 12.5,
                cursor: statusLoading ? "not-allowed" : "pointer",
                opacity: statusLoading ? 0.7 : 1,
              }}
            >
              {statusLoading
                ? `${statusElapsedSec.toFixed(1)}s...`
                : isOnline
                ? "ONLINE"
                : "OFFLINE"}
            </button>
          </div>

          {/* 4-Seat Cabin Schematic & Manifest */}
          <div
            style={{
              background: "#F7F8F6",
              borderRadius: 14,
              padding: 14,
              border: `1px solid ${borderCol}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 13.5 }}>
                Pod POD-842A ({boardedCount}/4 Boarded)
              </span>
              <span
                className="tabular-nums"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: escrowState === "CAPTURED" ? "#008751" : "#D97706",
                  background: escrowState === "CAPTURED" ? "rgba(0,135,81,0.1)" : "rgba(217,119,6,0.1)",
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                {escrowState}
              </span>
            </div>

            {/* 4-Seat Visual Diagram */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {/* Driver */}
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 8,
                  padding: 8,
                  border: `1px solid ${borderCol}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <SteeringWheelIcon size={18} color="#374740" />
                <div>
                  <div style={{ fontSize: 9.5, color: textSecondary, fontWeight: 700 }}>DRIVER</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700 }}>{driver.full_name}</div>
                </div>
              </div>

              {/* Front Passenger */}
              <div
                style={{
                  background: "#E8F5E9",
                  borderRadius: 8,
                  padding: 8,
                  borderLeft: "3px solid #008751",
                  borderTop: `1px solid ${borderCol}`,
                  borderRight: `1px solid ${borderCol}`,
                  borderBottom: `1px solid ${borderCol}`,
                }}
              >
                <div style={{ fontSize: 9.5, color: "#006B3F", fontWeight: 700 }}>FRONT PASSENGER</div>
                <div style={{ fontSize: 11.5, fontWeight: 700 }}>Amina Bello</div>
                <div style={{ fontSize: 10, color: textSecondary }}>Drop: Wuse Market</div>
              </div>

              {/* Back Left */}
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 8,
                  padding: 8,
                  borderLeft: "3px solid #008751",
                  borderTop: `1px solid ${borderCol}`,
                  borderRight: `1px solid ${borderCol}`,
                  borderBottom: `1px solid ${borderCol}`,
                }}
              >
                <div style={{ fontSize: 9.5, color: "#006B3F", fontWeight: 700 }}>BACK LEFT</div>
                <div style={{ fontSize: 11.5, fontWeight: 700 }}>Emeka Nwosu</div>
                <div style={{ fontSize: 10, color: textSecondary }}>Drop: Berger Roundabout</div>
              </div>

              {/* Back Middle */}
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 8,
                  padding: 8,
                  borderLeft: "3px solid #008751",
                  borderTop: `1px solid ${borderCol}`,
                  borderRight: `1px solid ${borderCol}`,
                  borderBottom: `1px solid ${borderCol}`,
                }}
              >
                <div style={{ fontSize: 9.5, color: "#006B3F", fontWeight: 700 }}>BACK MIDDLE</div>
                <div style={{ fontSize: 11.5, fontWeight: 700 }}>Bello K.</div>
                <div style={{ fontSize: 10, color: textSecondary }}>Drop: Mabushi Bridge</div>
              </div>

              {/* Back Right: Mid-Corridor Reload Slot */}
              <div
                style={{
                  gridColumn: "1 / -1",
                  background:
                    boardedCount >= 4 ? "#E8F5E9" : "rgba(217,119,6,0.12)",
                  borderRadius: 8,
                  padding: 9,
                  border:
                    boardedCount >= 4
                      ? "1px solid #008751"
                      : "2px solid #F59E0B",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: boardedCount >= 4 ? "#008751" : "#D97706",
                    }}
                  >
                    BACK RIGHT: MID-CORRIDOR RELOAD SLOT
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      background: boardedCount >= 4 ? "#008751" : "#D97706",
                      color: "#FFFFFF",
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 10.5,
                      fontWeight: 700,
                    }}
                  >
                    ₦700
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>Tunde A.</div>
                <div style={{ fontSize: 11, color: textSecondary }}>
                  Drop: Oando Katampe (km 26.1) - Status: {boardedCount >= 4 ? "Boarded" : "Awaiting OTP"}
                </div>
              </div>
            </div>

            {/* Forecourt Boarding OTP Verification */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                maxLength={4}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="4829"
                className="tabular-nums"
                style={{
                  width: 90,
                  padding: "8px 10px",
                  fontSize: 18,
                  fontWeight: 800,
                  borderRadius: 8,
                  border: "2px solid #008751",
                  textAlign: "center",
                  outline: "none",
                }}
              />
              <button
                onClick={handleVerifyOtp}
                disabled={otpLoading}
                style={{
                  flex: 1,
                  background: boardedCount >= 4 ? "#006B3F" : "#008751",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: otpLoading ? "not-allowed" : "pointer",
                  opacity: otpLoading ? 0.7 : 1,
                }}
              >
                {otpLoading
                  ? `Verifying OTP (${otpElapsedSec.toFixed(1)}s)...`
                  : boardedCount >= 4
                  ? "✓ All 4 Boarded: " + podStatus
                  : "Verify OTP (150m Geofence Lock)"}
              </button>
            </div>

            {otpError && (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "#FEF2F2",
                  border: "1px solid #DC2626",
                  color: "#DC2626",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Backend Error: {otpError}
              </div>
            )}

            {otpSuccessMessage && (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "#E8F5E9",
                  border: "1px solid #008751",
                  color: "#006B3F",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {otpSuccessMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
