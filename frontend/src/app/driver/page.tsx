"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/navigation/Header";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { CorridorNode } from "@/components/brand/CorridorNode";
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

export default function DriverPage() {
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
  const [otpCode, setOtpCode] = useState<string>("");
  const [boardedCount, setBoardedCount] = useState<number>(3);
  const [escrowState, setEscrowState] = useState<string>("PENDING_BOARDING");
  const [podStatus, setPodStatus] = useState<string>("BOARDING");
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
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
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

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

  async function handleVerifyOtp() {
    if (otpLoading) return;
    setOtpLoading(true);
    setOtpError(null);
    setOtpSuccessMessage(null);

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
        `Code verified. Escrow captured: 90% driver net guaranteed. Pod status: ${res.pod_status || "IN_TRANSIT"}.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
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
      <Header />

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
        {/* Title & Online Toggle */}
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Driver dispatch & manifest</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              Corridor {driver.corridor_id} · Pod POD-842A
            </p>
          </div>

          <button
            onClick={handleStatusToggle}
            disabled={statusLoading}
            style={{
              background: isOnline ? "var(--brand-primary)" : "var(--bg-surface)",
              color: isOnline ? "var(--brand-ink)" : "var(--text-muted)",
              border: `1px solid ${isOnline ? "var(--brand-primary)" : "var(--border-subtle)"}`,
              padding: "8px 16px",
              borderRadius: "var(--radius-chip)",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {statusLoading ? "Updating..." : isOnline ? "Online" : "Offline"}
          </button>
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
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{driver.full_name}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              {driver.vehicle_make_model}
            </div>
          </div>
          <DepartureNumeral size="md" variant="neutral">
            {driver.plate_number}
          </DepartureNumeral>
        </section>

        {/* 4-Seat Manifest Grid */}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              Seat manifest ({boardedCount}/4 boarded)
            </span>
            <DepartureNumeral size="sm" variant={escrowState === "CAPTURED" ? "brand" : "amber"}>
              {escrowState}
            </DepartureNumeral>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* Driver */}
            <div
              style={{
                background: "var(--bg-paper)",
                borderRadius: "var(--radius-button)",
                padding: "12px",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>
                DRIVER
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                {driver.full_name}
              </div>
            </div>

            {/* Passenger 1 */}
            <div
              style={{
                background: "var(--brand-soft)",
                borderRadius: "var(--radius-button)",
                padding: "12px",
                border: "1px solid rgba(11, 110, 79, 0.25)",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--brand-primary)", fontWeight: 700 }}>
                FRONT SEAT · BOARDED
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                Amina Bello
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Drop: Wuse Market</div>
            </div>

            {/* Passenger 2 */}
            <div
              style={{
                background: "var(--brand-soft)",
                borderRadius: "var(--radius-button)",
                padding: "12px",
                border: "1px solid rgba(11, 110, 79, 0.25)",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--brand-primary)", fontWeight: 700 }}>
                BACK LEFT · BOARDED
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                Emeka Nwosu
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Drop: Berger</div>
            </div>

            {/* Passenger 3 */}
            <div
              style={{
                background: "var(--brand-soft)",
                borderRadius: "var(--radius-button)",
                padding: "12px",
                border: "1px solid rgba(11, 110, 79, 0.25)",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--brand-primary)", fontWeight: 700 }}>
                BACK MIDDLE · BOARDED
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                Bello K.
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Drop: Mabushi</div>
            </div>

            {/* Passenger 4 (Pending or Boarded) */}
            <div
              style={{
                gridColumn: "1 / -1",
                background: boardedCount >= 4 ? "var(--brand-soft)" : "var(--signal-soft)",
                borderRadius: "var(--radius-button)",
                padding: "12px 14px",
                border: `1px solid ${boardedCount >= 4 ? "rgba(11, 110, 79, 0.3)" : "var(--signal-amber)"}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: boardedCount >= 4 ? "var(--brand-primary)" : "var(--signal-ink)",
                  }}
                >
                  BACK RIGHT: {boardedCount >= 4 ? "BOARDED" : "AWAITING BOARDING CODE"}
                </span>
                <DepartureNumeral size="sm" variant={boardedCount >= 4 ? "brand" : "amber"}>
                  ₦900
                </DepartureNumeral>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                Tunde A.
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Drop: Katampe Oando · Status: {boardedCount >= 4 ? "Boarded" : "Awaiting OTP"}
              </div>
            </div>
          </div>

          {/* OTP Verification Input Form */}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <input
              type="text"
              maxLength={4}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="OTP"
              className="tabular-nums"
              style={{
                width: 100,
                padding: "10px",
                fontSize: 18,
                fontWeight: 700,
                textAlign: "center",
                borderRadius: "var(--radius-button)",
                border: "1px solid var(--border-strong)",
                background: "var(--bg-paper)",
                color: "var(--text-ink)",
                outline: "none",
              }}
            />

            <button
              onClick={handleVerifyOtp}
              disabled={otpLoading}
              style={{
                flex: 1,
                background: "var(--brand-primary)",
                color: "var(--brand-ink)",
                borderRadius: "var(--radius-button)",
                fontSize: 14,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {otpLoading ? (
                <>
                  <CorridorNode size={16} variant="loading" />
                  <span>Verifying...</span>
                </>
              ) : boardedCount >= 4 ? (
                <span>All 4 passengers boarded</span>
              ) : (
                <span>Verify passenger code</span>
              )}
            </button>
          </div>

          {otpError && (
            <div
              style={{
                padding: "8px 12px",
                background: "var(--danger-soft)",
                border: "1px solid var(--danger-red)",
                color: "var(--danger-red)",
                borderRadius: "var(--radius-input)",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {otpError}
            </div>
          )}

          {otpSuccessMessage && (
            <div
              style={{
                padding: "8px 12px",
                background: "var(--brand-soft)",
                border: "1px solid var(--brand-primary)",
                color: "var(--brand-primary)",
                borderRadius: "var(--radius-input)",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {otpSuccessMessage}
            </div>
          )}
        </section>
      </main>

      <BottomTabBar activeShareToken="tok_demo_family_123" />
    </div>
  );
}
