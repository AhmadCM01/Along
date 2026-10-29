"use client";

import React, { useState } from "react";
import { AlongLogo } from "@/components/brand/AlongLogo";
import {
  CarPodIcon,
  ShieldCheckIcon,
  SteeringWheelIcon,
} from "@/components/icons/AlongIcons";

interface DriverCabinSimulatorProps {
  corridorId: string;
  anchorName: string;
  midCorridorActive: boolean;
  onToggleMidCorridor: () => void;
  driverMode: "SMARTPHONE" | "FEATURE_PHONE_2G";
  onToggleDriverMode: () => void;
}

export function DriverCabinSimulator({
  corridorId,
  anchorName,
  midCorridorActive,
  onToggleMidCorridor,
  driverMode,
  onToggleDriverMode,
}: DriverCabinSimulatorProps) {
  const [otpInput, setOtpInput] = useState("4829");
  const [otpCaptured, setOtpCaptured] = useState(false);

  // Dynamic Back-Right seat state based on mid-corridor reload
  const reloadSeat = midCorridorActive
    ? {
        rider: "Chidinma Okafor",
        dest: "Wuse Market (km 36.5)",
        fare: "+₦500",
        badge: "RELOAD MATCH",
        isReloaded: true,
      }
    : {
        rider: "Chijioke Eze",
        dest: "Oando Katampe (km 26.1)",
        fare: "₦700",
        badge: "MID-CORRIDOR DROP",
        isReloaded: false,
      };

  const calculatedDriverNet = midCorridorActive ? "₦3,740" : "₦3,240";
  const totalRiders = midCorridorActive ? 5 : 4;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: driverMode === "FEATURE_PHONE_2G" ? "#0F1A15" : "#F7F8F6",
        color: driverMode === "FEATURE_PHONE_2G" ? "#F3F6F4" : "#0A1410",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
        boxShadow: "0 18px 48px rgba(0,0,0,0.4)",
        height: "100%",
      }}
    >
      {/* Mobile Top Status Bar */}
      <div
        style={{
          background: driverMode === "FEATURE_PHONE_2G" ? "#1B2A23" : "#E2E8E4",
          padding: "6px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: driverMode === "FEATURE_PHONE_2G" ? "#A7F3D0" : "#374740",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <span className="tabular-nums" style={{ fontWeight: 700 }}>
          12:45
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>{driverMode === "FEATURE_PHONE_2G" ? "MTN 2G EDGE" : "4G LTE"}</span>
          <span>● 92%</span>
        </div>
      </div>

      {/* Driver Header */}
      <header
        style={{
          background: driverMode === "FEATURE_PHONE_2G" ? "#16241E" : "#FFFFFF",
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <AlongLogo variant={driverMode === "FEATURE_PHONE_2G" ? "dark" : "light"} size="sm" />

        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={onToggleDriverMode}
            style={{
              background: driverMode === "FEATURE_PHONE_2G" ? "#008751" : "#17221E",
              color: "#FFFFFF",
              border: "none",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {driverMode === "FEATURE_PHONE_2G" ? "Switch to Smartphone" : "Switch to 2G Nokia"}
          </button>
        </div>
      </header>

      {/* Driver Body */}
      <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
        {driverMode === "FEATURE_PHONE_2G" ? (
          /* 2G Nokia 105 USSD / IVR Interface */
          <div
            className="tabular-nums"
            style={{
              background: "#08140E",
              border: "4px solid #374740",
              borderRadius: 14,
              padding: 14,
              color: "#A7F3D0",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, color: "#6EE7B7", borderBottom: "1px solid #164E3D", paddingBottom: 4 }}>
              MTN-NG 2G • NOKIA 105 • DIAL *384*247#
            </div>
            <div
              style={{
                background: "#051A10",
                padding: 10,
                borderRadius: 6,
                fontSize: 11.5,
                lineHeight: 1.5,
                border: "1px solid #059669",
              }}
            >
              <div style={{ color: "#FCD34D", fontWeight: 700 }}>[INCOMING CALL: ALONG AUTOMATED VOICE]</div>
              <div style={{ marginTop: 4 }}>
                &ldquo;Sabon Pod a {anchorName} zuwa Wuse (N{midCorridorActive ? "3,740" : "3,240"} Net). Danna 1 don karba.&rdquo;
              </div>
              <div style={{ marginTop: 6, color: "#34D399", fontWeight: 700 }}>
                &gt; KEYPAD [1] PRESSED: ACCEPTED!
              </div>
            </div>

            <div
              style={{
                background: "#051A10",
                padding: 10,
                borderRadius: 6,
                fontSize: 11.5,
                lineHeight: 1.5,
                border: "1px solid #059669",
              }}
            >
              <div style={{ color: "#93C5FD", fontWeight: 700 }}>[SMS DISPATCH MANIFEST]</div>
              <div style={{ marginTop: 2 }}>
                Pod POD-842A [Demo data]: {totalRiders} Seats. Pickup: {anchorName}. Dial *384*247*2*4829# to capture escrow (Simulated escrow).
              </div>
            </div>
          </div>
        ) : (
          /* Smartphone High-Contrast Daylight HUD */
          <>
            {/* Active Driver Profile & Payout Card */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: 12,
                border: "1px solid rgba(10,20,16,0.1)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#008751" }}>
                    ONLINE CORRIDOR DRIVER [Demo driver profile]
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0A1410" }}>
                    Demo driver profile: Musa Danjuma (Toyota Corolla)
                  </div>
                  <div className="tabular-nums" style={{ fontSize: 12, color: "#374740" }}>
                    Plate: <strong>ABJ-412K</strong> [Demo data] • Corridor: {corridorId}
                  </div>
                </div>

                <div
                  className="tabular-nums"
                  style={{
                    background: "rgba(0,135,81,0.1)",
                    border: "1px solid #008751",
                    borderRadius: 8,
                    padding: "6px 10px",
                    textAlign: "right",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#006B3F", fontWeight: 700 }}>
                    NET PAYOUT (90%)
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#008751" }}>
                    {calculatedDriverNet}
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Cabin Schematic (Isometric Top-Down 4-Seat Layout) */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: 12,
                border: "1px solid rgba(10,20,16,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#008751" }}>
                  CABIN SEAT MANIFEST ({totalRiders} FARES SERVED)
                </div>
                <button
                  onClick={onToggleMidCorridor}
                  style={{
                    background: midCorridorActive ? "#D97706" : "rgba(217,119,6,0.12)",
                    color: midCorridorActive ? "#FFFFFF" : "#D97706",
                    border: "1px solid #D97706",
                    padding: "3px 8px",
                    borderRadius: 6,
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {midCorridorActive ? "Reload Triggered ✓" : "Simulate Seat Reload"}
                </button>
              </div>

              {/* 4-Seat Automobile Cabin Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {/* Driver Seat */}
                <div
                  style={{
                    background: "#EEF2EF",
                    borderRadius: 8,
                    padding: 8,
                    border: "1px solid rgba(10,20,16,0.08)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <SteeringWheelIcon size={20} color="#374740" />
                  <div>
                    <div style={{ fontSize: 10, color: "#64756D", fontWeight: 700 }}>DRIVER</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700 }}>Musa D.</div>
                  </div>
                </div>

                {/* Front Passenger: Furthest Stop */}
                <div
                  style={{
                    background: "#E8F5E9",
                    borderRadius: 8,
                    padding: 8,
                    borderLeft: "3px solid #008751",
                    borderTop: "1px solid rgba(10,20,16,0.06)",
                    borderRight: "1px solid rgba(10,20,16,0.06)",
                    borderBottom: "1px solid rgba(10,20,16,0.06)",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#006B3F", fontWeight: 700 }}>FRONT PASSENGER</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700 }}>Amina Bello</div>
                  <div style={{ fontSize: 10.5, color: "#374740" }}>Furthest: Wuse Market</div>
                </div>

                {/* Back Left */}
                <div
                  style={{
                    background: "#EEF2EF",
                    borderRadius: 8,
                    padding: 8,
                    borderLeft: "3px solid #008751",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#006B3F", fontWeight: 700 }}>BACK LEFT</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700 }}>Emeka Nwosu</div>
                  <div style={{ fontSize: 10.5, color: "#64756D" }}>Drop: Berger (km 32.5)</div>
                </div>

                {/* Back Middle */}
                <div
                  style={{
                    background: "#EEF2EF",
                    borderRadius: 8,
                    padding: 8,
                    borderLeft: "3px solid #008751",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#006B3F", fontWeight: 700 }}>BACK MIDDLE</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700 }}>Amina Garba</div>
                  <div style={{ fontSize: 10.5, color: "#64756D" }}>Drop: Mabushi (km 29.4)</div>
                </div>

                {/* Back Right: DYNAMIC MID-CORRIDOR RELOAD SEAT */}
                <div
                  style={{
                    gridColumn: "1 / -1",
                    background: midCorridorActive ? "rgba(245,158,11,0.12)" : "#EEF2EF",
                    borderRadius: 8,
                    padding: 9,
                    border: midCorridorActive ? "2px solid #F59E0B" : "1px solid rgba(10,20,16,0.1)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: midCorridorActive ? "#D97706" : "#006B3F" }}>
                      BACK RIGHT: {reloadSeat.badge}
                    </span>
                    <span
                      className="tabular-nums"
                      style={{
                        background: midCorridorActive ? "#D97706" : "#008751",
                        color: "#FFFFFF",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 10.5,
                        fontWeight: 700,
                      }}
                    >
                      {reloadSeat.fare}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>{reloadSeat.rider}</div>
                  <div style={{ fontSize: 11, color: "#374740" }}>Dest: {reloadSeat.dest}</div>
                </div>
              </div>
            </div>

            {/* Forecourt Boarding OTP Entry Box */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: 12,
                border: "1px solid rgba(10,20,16,0.1)",
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0A1410", marginBottom: 6 }}>
                Forecourt OTP Verification (150m Geofence Lock)
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  maxLength={4}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="tabular-nums"
                  style={{
                    width: 80,
                    padding: "7px 8px",
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: "0.15em",
                    borderRadius: 8,
                    border: "2px solid #008751",
                    textAlign: "center",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => setOtpCaptured(true)}
                  style={{
                    flex: 1,
                    background: otpCaptured ? "#006B3F" : "#008751",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {otpCaptured ? "✓ OTP Verified: Simulated Escrow Captured!" : "Verify OTP & Capture Simulated Escrow"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Driver Vehicle Verification Badge */}
        <div
          style={{
            background: driverMode === "FEATURE_PHONE_2G" ? "#16241E" : "#E8F0EC",
            padding: 10,
            borderRadius: 10,
            fontSize: 11,
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ShieldCheckIcon size={16} color="#008751" />
          <div>
            <div style={{ fontWeight: 700, color: "#008751" }}>
              [Glimmer vision check] Plate Verified: ABJ-412K [Demo data]
            </div>
            <div className="tabular-nums" style={{ color: driverMode === "FEATURE_PHONE_2G" ? "#9FB0A7" : "#374740" }}>
              Plate &amp; Color Check • 4 Passengers Approved (Demo driver profile)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
