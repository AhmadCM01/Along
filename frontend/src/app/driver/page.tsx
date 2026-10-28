"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlongLogo } from "@/components/brand/AlongLogo";
import {
  CarPodIcon,
  ShieldCheckIcon,
  SteeringWheelIcon,
} from "@/components/icons/AlongIcons";

export default function DriverCompanionPage() {
  const [nightMode, setNightMode] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [phoneMode, setPhoneMode] = useState<"SMARTPHONE" | "FEATURE_PHONE">("SMARTPHONE");
  const [otpCode, setOtpCode] = useState<string>("4829");
  const [boardedCount, setBoardedCount] = useState<number>(3);
  const [samVerified, setSamVerified] = useState<boolean>(true);

  const bgCanvas = nightMode ? "#0A0F0D" : "#EEF2EF";
  const bgPhone = nightMode ? "#111916" : "#FFFFFF";
  const textPrimary = nightMode ? "#F3F6F4" : "#0A1410";
  const textSecondary = nightMode ? "#9FB0A7" : "#374740";
  const borderCol = nightMode ? "rgba(255,255,255,0.1)" : "rgba(10,20,16,0.12)";

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
      {/* Top Navigation & Mode Switcher Bar */}
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
          <AlongLogo variant={nightMode ? "dark" : "light"} size="sm" />
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() =>
              setPhoneMode(phoneMode === "SMARTPHONE" ? "FEATURE_PHONE" : "SMARTPHONE")
            }
            style={{
              background: "#008751",
              color: "#FFFFFF",
              border: "none",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {phoneMode === "SMARTPHONE" ? "Switch to 2G Nokia" : "Switch to Smartphone"}
          </button>
          <button
            onClick={() => setNightMode(!nightMode)}
            style={{
              background: bgPhone,
              color: textPrimary,
              border: `1px solid ${borderCol}`,
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {nightMode ? "Daylight Mode" : "Night Mode"}
          </button>
        </div>
      </div>

      {/* Realistic Mobile Device Frame */}
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: bgPhone,
          borderRadius: 28,
          border: nightMode ? "4px solid #1E2C27" : "4px solid #D6DFD9",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Mobile Device Status Bar */}
        <div
          style={{
            background: nightMode ? "#16221D" : "#E2E8E4",
            padding: "8px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: nightMode ? "#9FB0A7" : "#374740",
            borderBottom: `1px solid ${borderCol}`,
          }}
        >
          <span className="tabular-nums" style={{ fontWeight: 700, color: textPrimary }}>
            12:45
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>{phoneMode === "SMARTPHONE" ? "MTN-NG 4G" : "MTN 2G EDGE"}</span>
            <span>● 94%</span>
          </div>
        </div>

        {phoneMode === "FEATURE_PHONE" ? (
          /* 2G Nokia 105 USSD / IVR Interface */
          <div
            className="tabular-nums"
            style={{
              background: "#08140E",
              color: "#A7F3D0",
              padding: 20,
              minHeight: 460,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 11, color: "#6EE7B7", borderBottom: "1px solid #164E3D", paddingBottom: 6 }}>
              MTN-NG 2G • NOKIA 105 • USSD CODE: *384*247#
            </div>

            <div
              style={{
                background: "#051A10",
                padding: 12,
                borderRadius: 8,
                fontSize: 12.5,
                lineHeight: 1.55,
                border: "1px solid #059669",
              }}
            >
              <div style={{ color: "#FCD34D", fontWeight: 700 }}>[INCOMING VOICE CALL: ALONG DISPATCH]</div>
              <div style={{ marginTop: 4 }}>
                &ldquo;Sabon Pod a A.A. Rano Dutse zuwa Berger (N3,240 Net). Danna 1 don karba.&rdquo;
              </div>
              <div style={{ marginTop: 8, color: "#34D399", fontWeight: 700 }}>
                &gt; DTMF [1] PRESSED: POD ACCEPTED!
              </div>
            </div>

            <div
              style={{
                background: "#051A10",
                padding: 12,
                borderRadius: 8,
                fontSize: 12.5,
                lineHeight: 1.55,
                border: "1px solid #059669",
              }}
            >
              <div style={{ color: "#93C5FD", fontWeight: 700 }}>[SMS MANIFEST RECEIVED]</div>
              <div style={{ marginTop: 2 }}>
                Pod POD-842A: 4 Commuters inside A.A. Rano Dutse Forecourt. Dial *384*247*2*4829# to capture escrow.
              </div>
            </div>
          </div>
        ) : (
          /* Smartphone High-Sunlight Daylight Companion */
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Driver Identity Card & Online Toggle */}
            <div
              style={{
                background: nightMode ? "#16221D" : "#F7F8F6",
                borderRadius: 14,
                padding: 14,
                border: `1px solid ${borderCol}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Musa Danjuma</div>
                <div className="tabular-nums" style={{ fontSize: 12, color: textSecondary }}>
                  Plate: <strong>ABJ-412K</strong> (Toyota Corolla)
                </div>
                <div style={{ fontSize: 11.5, color: "#008751", fontWeight: 600, marginTop: 2 }}>
                  Queue: A.A. Rano Filling Station (Dutse First Gate)
                </div>
              </div>

              <button
                onClick={() => setIsOnline(!isOnline)}
                style={{
                  background: isOnline ? "#008751" : "#64756D",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                {isOnline ? "ONLINE" : "OFFLINE"}
              </button>
            </div>

            {/* Earnings & Agbero Savings Grid */}
            <div className="tabular-nums" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div
                style={{
                  background: nightMode ? "#16221D" : "#F7F8F6",
                  borderRadius: 12,
                  padding: 12,
                  border: `1px solid ${borderCol}`,
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 700, color: textSecondary }}>
                  TODAY NET (90%)
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#008751", marginTop: 2 }}>
                  ₦18,450
                </div>
                <div style={{ fontSize: 10.5, color: textSecondary }}>
                  6 Pods Completed
                </div>
              </div>

              <div
                style={{
                  background: nightMode ? "#16221D" : "#F7F8F6",
                  borderRadius: 12,
                  padding: 12,
                  border: `1px solid ${borderCol}`,
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 700, color: textSecondary }}>
                  AGBERO SAVED
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#D97706", marginTop: 2 }}>
                  ₦7,500
                </div>
                <div style={{ fontSize: 10.5, color: textSecondary }}>
                  Private Forecourts
                </div>
              </div>
            </div>

            {/* 4-Seat Cabin Schematic */}
            <div
              style={{
                background: nightMode ? "#16221D" : "#F7F8F6",
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
                  Active Pod POD-842A ({boardedCount}/4 Boarded)
                </span>
                <span className="tabular-nums" style={{ fontSize: 13, fontWeight: 800, color: "#008751" }}>
                  Net Payout: ₦3,240
                </span>
              </div>

              {/* 4-Seat Visual Diagram */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {/* Driver */}
                <div
                  style={{
                    background: nightMode ? "#111916" : "#FFFFFF",
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
                    <div style={{ fontSize: 11.5, fontWeight: 700 }}>Musa D.</div>
                  </div>
                </div>

                {/* Front Passenger: Furthest Drop */}
                <div
                  style={{
                    background: nightMode ? "#111916" : "#E8F5E9",
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
                  <div style={{ fontSize: 10, color: textSecondary }}>Furthest: Wuse Market</div>
                </div>

                {/* Back Left */}
                <div
                  style={{
                    background: nightMode ? "#111916" : "#FFFFFF",
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
                  <div style={{ fontSize: 10, color: textSecondary }}>Berger Roundabout</div>
                </div>

                {/* Back Middle */}
                <div
                  style={{
                    background: nightMode ? "#111916" : "#FFFFFF",
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
                  <div style={{ fontSize: 10, color: textSecondary }}>Mabushi Bridge</div>
                </div>

                {/* Back Right: Mid-Corridor Drop */}
                <div
                  style={{
                    gridColumn: "1 / -1",
                    background: boardedCount === 4 ? (nightMode ? "#111916" : "#E8F5E9") : "rgba(217,119,6,0.12)",
                    borderRadius: 8,
                    padding: 9,
                    border: boardedCount === 4 ? "1px solid #008751" : "2px solid #F59E0B",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: boardedCount === 4 ? "#008751" : "#D97706" }}>
                      BACK RIGHT: MID-CORRIDOR RELOAD SLOT
                    </span>
                    <span
                      className="tabular-nums"
                      style={{
                        background: boardedCount === 4 ? "#008751" : "#D97706",
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
                  <div style={{ fontSize: 11, color: textSecondary }}>Drop: Oando Katampe (km 26.1)</div>
                </div>
              </div>

              {/* Forecourt Boarding OTP Verification */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  maxLength={4}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
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
                  onClick={() => setBoardedCount(4)}
                  style={{
                    flex: 1,
                    background: boardedCount === 4 ? "#006B3F" : "#008751",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {boardedCount === 4
                    ? "✓ All 4 Boarded -> In Transit"
                    : "Verify OTP (150m Geofence Lock)"}
                </button>
              </div>
            </div>

            {/* SAM 3.1 Driver KYC Verification Card */}
            <div
              style={{
                background: nightMode ? "#16221D" : "#E8F0EC",
                borderRadius: 12,
                padding: 12,
                border: `1px solid ${borderCol}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 12.5, color: "#008751" }}>
                  Meta SAM 3.1 (sam-3.1) Certified Vehicle
                </div>
                <div className="tabular-nums" style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                  Cabin Mask IoU: 0.94 • Plate: ABJ-412K • 4 Passengers Approved
                </div>
              </div>
              <ShieldCheckIcon size={20} color="#008751" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
