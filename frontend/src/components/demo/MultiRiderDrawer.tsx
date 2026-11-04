"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAlongTrip } from "@/context/AlongTripContext";

export interface ConveyorStage {
  id: number;
  label: string;
  location: string;
  description: string;
  podFill: string;
  grossEscrow: number;
  seats: {
    seat1: {
      passenger: string;
      route: string;
      fare: number;
      otp: string;
      status: "BOARDED" | "AWAITING" | "ALIGHTED" | "RELOADED";
    };
    seat2: {
      passenger: string;
      route: string;
      fare: number;
      otp: string;
      status: "BOARDED" | "AWAITING" | "ALIGHTED";
    };
    seat3: {
      passenger: string;
      route: string;
      fare: number;
      otp: string;
      status: "BOARDED" | "AWAITING" | "ALIGHTED";
    };
    seat4: {
      passenger: string;
      route: string;
      fare: number;
      otp: string;
      status: "VACANT" | "BOARDED" | "ALIGHTED";
    };
  };
}

const CONVEYOR_STAGES: ConveyorStage[] = [
  {
    id: 1,
    label: "1. Board Dutse",
    location: "Dutse First Gate Forecourt (Km 0)",
    description: "Rider B books 1 seat to Gwarinpa. Rider C books Seat 2 and Fatima books Seat 3 to Berger. 3/4 seats filled.",
    podFill: "3/4 Seats Secured",
    grossEscrow: 1800,
    seats: {
      seat1: {
        passenger: "Rider B",
        route: "Dutse First Gate ➔ Gwarinpa Setraco",
        fare: 600,
        otp: "2639",
        status: "BOARDED",
      },
      seat2: {
        passenger: "Rider C",
        route: "Dutse First Gate ➔ Berger Underbridge",
        fare: 600,
        otp: "0930",
        status: "BOARDED",
      },
      seat3: {
        passenger: "Fatima Garba",
        route: "Dutse First Gate ➔ Berger Underbridge",
        fare: 600,
        otp: "3812",
        status: "BOARDED",
      },
      seat4: {
        passenger: "Awaiting Feeder Hop",
        route: "Sokale ➔ Dutse Market",
        fare: 0,
        otp: "----",
        status: "VACANT",
      },
    },
  },
  {
    id: 2,
    label: "2. Feeder Sokale",
    location: "Sokale Roundabout (Km 2.1)",
    description: "Ibrahim boards Seat 4 for short feeder hop to Dutse Market. Pod is fully boarded (4/4)!",
    podFill: "4/4 Seats FULL (Full Load)",
    grossEscrow: 2200,
    seats: {
      seat1: {
        passenger: "Rider B",
        route: "Dutse First Gate ➔ Gwarinpa Setraco",
        fare: 600,
        otp: "2639",
        status: "BOARDED",
      },
      seat2: {
        passenger: "Rider C",
        route: "Dutse First Gate ➔ Berger Underbridge",
        fare: 600,
        otp: "0930",
        status: "BOARDED",
      },
      seat3: {
        passenger: "Fatima Garba",
        route: "Dutse First Gate ➔ Berger Underbridge",
        fare: 600,
        otp: "3812",
        status: "BOARDED",
      },
      seat4: {
        passenger: "Ibrahim Sani",
        route: "Sokale ➔ Dutse Market (Feeder)",
        fare: 400,
        otp: "4581",
        status: "BOARDED",
      },
    },
  },
  {
    id: 3,
    label: "3. Hot-Swap Gwarinpa",
    location: "Gwarinpa 3rd Avenue Setraco (Km 12.0)",
    description: "Rider B alights at Gwarinpa. Grace immediately hot-swaps into vacant Seat 1 to Banex/Wuse!",
    podFill: "4/4 Seats Reloaded (Conveyor)",
    grossEscrow: 2800,
    seats: {
      seat1: {
        passenger: "Grace Eze (HOT-SWAP)",
        route: "Gwarinpa Setraco ➔ Banex Junction / Wuse",
        fare: 600,
        otp: "7140",
        status: "RELOADED",
      },
      seat2: {
        passenger: "Rider C",
        route: "Dutse First Gate ➔ Berger Underbridge",
        fare: 600,
        otp: "0930",
        status: "BOARDED",
      },
      seat3: {
        passenger: "Fatima Garba",
        route: "Dutse First Gate ➔ Berger Underbridge",
        fare: 600,
        otp: "3812",
        status: "BOARDED",
      },
      seat4: {
        passenger: "Ibrahim Sani",
        route: "Alighted at Dutse Market (Settled)",
        fare: 400,
        otp: "4581",
        status: "ALIGHTED",
      },
    },
  },
  {
    id: 4,
    label: "4. Terminus Berger",
    location: "Berger Roundabout Underbridge (Km 19.5)",
    description: "Rider C, Fatima, and Grace arrive at destinations. Full corridor circuit completed. Simulated escrow disbursed.",
    podFill: "Trip Complete • ₦2,800 Gross",
    grossEscrow: 2800,
    seats: {
      seat1: {
        passenger: "Grace Eze",
        route: "Banex Junction / Wuse 2",
        fare: 600,
        otp: "7140",
        status: "ALIGHTED",
      },
      seat2: {
        passenger: "Rider C",
        route: "Berger Underbridge (Seat 1/2)",
        fare: 600,
        otp: "0930",
        status: "ALIGHTED",
      },
      seat3: {
        passenger: "Fatima Garba",
        route: "Berger Underbridge",
        fare: 600,
        otp: "3812",
        status: "ALIGHTED",
      },
      seat4: {
        passenger: "Ibrahim Sani",
        route: "Dutse Market (Settled)",
        fare: 400,
        otp: "4581",
        status: "ALIGHTED",
      },
    },
  },
];

export function MultiRiderDrawer() {
  const trip = useAlongTrip();
  const pathname = usePathname();
  const isOpen = trip.multiRiderDrawerOpen;
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close automatically on navigation
  useEffect(() => {
    trip.setMultiRiderDrawerOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        trip.setMultiRiderDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, trip]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) {
        clearTimeout(simulationTimerRef.current);
      }
    };
  }, []);

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setCurrentStageIdx(0);

    const advanceStep = (step: number) => {
      if (step >= CONVEYOR_STAGES.length) {
        setIsSimulating(false);
        return;
      }
      setCurrentStageIdx(step);
      simulationTimerRef.current = setTimeout(() => {
        advanceStep(step + 1);
      }, 2600);
    };

    simulationTimerRef.current = setTimeout(() => {
      advanceStep(1);
    }, 2200);
  };

  const resetSimulation = () => {
    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
    }
    setIsSimulating(false);
    setCurrentStageIdx(0);
  };

  if (!isOpen) return null;

  const stage = CONVEYOR_STAGES[currentStageIdx];
  const driverPayout = Math.round(stage.grossEscrow * 0.9);
  const platformFee = stage.grossEscrow - driverPayout;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      {/* Semi-transparent Backdrop Scrim */}
      <div
        onClick={() => trip.setMultiRiderDrawerOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          transition: "opacity 200ms ease",
        }}
        aria-hidden="true"
      />

      {/* Slide-Over Drawer Sheet */}
      <aside
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 460,
          height: "100vh",
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border-subtle)",
          boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.18)",
          display: "flex",
          flexDirection: "column",
          zIndex: 10000,
          animation: "slideInRight 220ms cubic-bezier(0.16, 1, 0.3, 1)",
          overflowY: "auto",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Multi-Rider Lab Conveyor Simulator"
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-paper)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #10B981, #059669)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: 16,
              }}
            >
              🧪
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text-ink)" }}>
                  Multi-Rider Lab
                </h2>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "var(--brand-primary)",
                  }}
                >
                  Scripted simulation, not live data
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                Abuja Corridor Conveyor Hot-Swap Engine (Scripted simulation, not live data)
              </p>
            </div>
          </div>

          <button
            onClick={() => trip.setMultiRiderDrawerOpen(false)}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
            aria-label="Close Multi-Rider Lab Drawer"
          >
            ✕
          </button>
        </div>

        {/* Drawer Body */}
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Active Pod Card */}
          <div
            style={{
              padding: 14,
              borderRadius: "var(--radius-card)",
              background: "var(--bg-paper)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: "var(--brand-primary)",
                    color: "#FFFFFF",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                  }}
                >
                  SIM-POD-LAB
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-ink)" }}>
                  VW Golf 4 (Simulated Lab Pod)
                </span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: currentStageIdx === 2 ? "var(--signal-amber)" : "var(--brand-primary)",
                }}
              >
                {stage.podFill}
              </span>
            </div>

            <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>🛣️ ONEX Line:</span>
              <strong style={{ color: "var(--text-ink)" }}>BWR-DUT-WUS</strong>
              <span>· Current Stop:</span>
              <span style={{ color: "var(--brand-primary)", fontWeight: 700 }}>{stage.location}</span>
            </div>
          </div>

          {/* Conveyor Simulation Step Controller */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "var(--bg-paper)",
              padding: 14,
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-muted)" }}>
                Conveyor Lifecycle Stages
              </span>
              <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                Step {currentStageIdx + 1} of 4
              </span>
            </div>

            {/* Stepper Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {CONVEYOR_STAGES.map((s, idx) => {
                const isActive = currentStageIdx === idx;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
                      setIsSimulating(false);
                      setCurrentStageIdx(idx);
                    }}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: isActive ? 800 : 600,
                      background: isActive ? "var(--brand-primary)" : "var(--bg-surface)",
                      color: isActive ? "#FFFFFF" : "var(--text-muted)",
                      border: `1px solid ${isActive ? "var(--brand-primary)" : "var(--border-subtle)"}`,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 150ms ease",
                    }}
                  >
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Current Stage Description */}
            <div
              style={{
                fontSize: 12,
                color: "var(--text-ink)",
                lineHeight: 1.45,
                background: "var(--bg-surface)",
                padding: "8px 10px",
                borderRadius: 6,
                borderLeft: "3px solid var(--brand-primary)",
              }}
            >
              {stage.description}
            </div>

            {/* Automated Simulation Controls */}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                onClick={runSimulation}
                disabled={isSimulating}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 8,
                  background: isSimulating
                    ? "var(--text-muted)"
                    : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  color: "#FFFFFF",
                  border: "none",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: isSimulating ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: "0 2px 6px rgba(16, 185, 129, 0.2)",
                }}
              >
                <span>{isSimulating ? "⏳ Simulating Lifecycle..." : "▶ Run Automated Simulation"}</span>
              </button>

              <button
                onClick={resetSimulation}
                style={{
                  padding: "9px 14px",
                  borderRadius: 8,
                  background: "var(--bg-surface)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                title="Reset simulation to initial boarding"
              >
                ↺
              </button>
            </div>
          </div>

          {/* 4-Seat Pod Conveyor Manifest Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-muted)" }}>
                4-Seat Cabin Manifest
              </span>
              <span style={{ fontSize: 10.5, color: "var(--brand-primary)", fontWeight: 700 }}>
                Dynamic Mid-Trip Reloading
              </span>
            </div>

            {/* Seat 1 Card (Special: Reloaded at Gwarinpa) */}
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "var(--bg-paper)",
                border: `1px solid ${
                  stage.seats.seat1.status === "RELOADED"
                    ? "var(--signal-amber)"
                    : stage.seats.seat1.status === "BOARDED"
                    ? "var(--brand-primary)"
                    : "var(--border-subtle)"
                }`,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)" }}>
                  SEAT 1 · FRONT PASSENGER
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background:
                      stage.seats.seat1.status === "RELOADED"
                        ? "rgba(245, 158, 11, 0.15)"
                        : "rgba(16, 185, 129, 0.15)",
                    color:
                      stage.seats.seat1.status === "RELOADED"
                        ? "var(--signal-amber)"
                        : "var(--brand-primary)",
                  }}
                >
                  {stage.seats.seat1.status === "RELOADED" ? "🔄 HOT-SWAP RELOADED" : "✓ BOARDED"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 13, color: "var(--text-ink)" }}>
                  {stage.seats.seat1.passenger}
                </strong>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--brand-primary)" }}>
                  ₦{stage.seats.seat1.fare}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>{stage.seats.seat1.route}</span>
                <span>OTP: <strong>{stage.seats.seat1.otp}</strong></span>
              </div>
            </div>

            {/* Seat 2 Card (Through Commuter) */}
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "var(--bg-paper)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)" }}>
                  SEAT 2 · BACK LEFT
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background:
                      stage.seats.seat2.status === "ALIGHTED"
                        ? "rgba(100, 116, 139, 0.12)"
                        : "rgba(16, 185, 129, 0.15)",
                    color:
                      stage.seats.seat2.status === "ALIGHTED"
                        ? "var(--text-muted)"
                        : "var(--brand-primary)",
                  }}
                >
                  {stage.seats.seat2.status === "ALIGHTED" ? "ALIGHTED" : "✓ BOARDED"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 13, color: "var(--text-ink)" }}>
                  {stage.seats.seat2.passenger}
                </strong>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--brand-primary)" }}>
                  ₦{stage.seats.seat2.fare}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>{stage.seats.seat2.route}</span>
                <span>OTP: <strong>{stage.seats.seat2.otp}</strong></span>
              </div>
            </div>

            {/* Seat 3 Card (Through Commuter 2nd Seat) */}
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "var(--bg-paper)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)" }}>
                  SEAT 3 · BACK MIDDLE
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background:
                      stage.seats.seat3.status === "ALIGHTED"
                        ? "rgba(100, 116, 139, 0.12)"
                        : "rgba(16, 185, 129, 0.15)",
                    color:
                      stage.seats.seat3.status === "ALIGHTED"
                        ? "var(--text-muted)"
                        : "var(--brand-primary)",
                  }}
                >
                  {stage.seats.seat3.status === "ALIGHTED" ? "ALIGHTED" : "✓ BOARDED"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 13, color: "var(--text-ink)" }}>
                  {stage.seats.seat3.passenger}
                </strong>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--brand-primary)" }}>
                  ₦{stage.seats.seat3.fare}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>{stage.seats.seat3.route}</span>
                <span>OTP: <strong>{stage.seats.seat3.otp}</strong></span>
              </div>
            </div>

            {/* Seat 4 Card (Feeder Hop) */}
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "var(--bg-paper)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)" }}>
                  SEAT 4 · BACK RIGHT (FEEDER HOP)
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background:
                      stage.seats.seat4.status === "VACANT"
                        ? "rgba(100, 116, 139, 0.1)"
                        : stage.seats.seat4.status === "ALIGHTED"
                        ? "rgba(100, 116, 139, 0.12)"
                        : "rgba(16, 185, 129, 0.15)",
                    color:
                      stage.seats.seat4.status === "VACANT"
                        ? "var(--text-muted)"
                        : stage.seats.seat4.status === "ALIGHTED"
                        ? "var(--text-muted)"
                        : "var(--brand-primary)",
                  }}
                >
                  {stage.seats.seat4.status === "VACANT"
                    ? "EMPTY"
                    : stage.seats.seat4.status === "ALIGHTED"
                    ? "ALIGHTED"
                    : "✓ BOARDED"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 13, color: "var(--text-ink)" }}>
                  {stage.seats.seat4.passenger}
                </strong>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--brand-primary)" }}>
                  {stage.seats.seat4.fare > 0 ? `₦${stage.seats.seat4.fare}` : "---"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>{stage.seats.seat4.route}</span>
                <span>OTP: <strong>{stage.seats.seat4.otp}</strong></span>
              </div>
            </div>
          </div>

          {/* Financial Escrow Breakdown Card */}
          <div
            style={{
              padding: 14,
              borderRadius: "var(--radius-card)",
              background: "var(--bg-paper)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-muted)" }}>
                Simulated Atomic Escrow Captured
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color: "var(--brand-primary)" }}>
                SECURED IN SMART VAULT ✓
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, color: "var(--text-ink)", fontWeight: 700 }}>
                Total Pod Gross Yield:
              </span>
              <span style={{ fontSize: 18, fontWeight: 900, color: "var(--brand-primary)" }}>
                ₦{stage.grossEscrow.toLocaleString()}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-muted)", borderTop: "1px dashed var(--border-subtle)", paddingTop: 6 }}>
              <span>Driver Payout (90% Simulated): <strong>₦{driverPayout.toLocaleString()}</strong></span>
              <span>Along Fee (10%): <strong>₦{platformFee.toLocaleString()}</strong></span>
            </div>

            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
              💡 <em>Illustrative simulation: Conveyor hot-swap increased driver yield from ₦2,200 to ₦2,800 on the same fuel run.</em>
            </div>
          </div>

          {/* Technical Architecture Badge */}
          <div
            style={{
              padding: 10,
              borderRadius: 8,
              background: "rgba(16, 185, 129, 0.06)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              fontSize: 12,
              color: "var(--text-muted)",
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: "var(--brand-primary)" }}>Architecture Stack:</strong>{" "}
            Topological anchor assignment powered by <strong>Meta FAISS</strong> vector lookup with character n-gram hashing and Jaro-Winkler reranking. Multilingual entity extraction via <strong>Muse Spark Open via Baseten</strong> with Llama 3.2 Vision via NVIDIA NIM fallback. Pod seat states managed atomically via Redis state locks.
          </div>
        </div>
      </aside>

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
