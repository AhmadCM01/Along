"use client";

import React, { useState } from "react";
import {
  CorridorNodeIcon,
  PinLocationIcon,
  ShieldCheckIcon,
} from "@/components/icons/AlongIcons";

interface AbujaCorridorMapProps {
  corridorId: string;
  originName: string;
  destName: string;
  anchorName: string;
  midCorridorActive: boolean;
  nluModel: string;
  nluLatencyMs: number;
  voiceModel?: string;
  voiceLatencyMs?: number;
  faissLatencyMs: number;
  cosineScore: number;
  jwScore: number;
  popScore: number;
  finalScore: number;
}

// Authoritative Abuja Corridor Waypoints along BWR-DUT-WUS
const WAYPOINTS = [
  { id: "BWR", name: "Bwari Town", km: 0.0, x: 70, y: 45, isAnchor: true, partner: "NIPCO Bwari" },
  { id: "DUT_FG", name: "Dutse First Gate", km: 15.1, x: 175, y: 88, isAnchor: true, partner: "A.A. Rano Dutse" },
  { id: "SOK", name: "Sokale Roundabout", km: 18.2, x: 250, y: 135, isAnchor: true, partner: "Bovas Sokale" },
  { id: "KAT_OAN", name: "Oando Katampe", km: 26.1, x: 375, y: 175, isAnchor: true, partner: "Oando Katampe", isReload: true },
  { id: "MAB", name: "Mabushi Roundabout", km: 29.4, x: 460, y: 220, isAnchor: false, partner: "Mabushi Bridge" },
  { id: "BER", name: "Berger Roundabout", km: 32.5, x: 540, y: 255, isAnchor: false, partner: "Berger Flyover" },
  { id: "WUS", name: "Wuse Market", km: 36.5, x: 615, y: 290, isAnchor: true, partner: "Total Wuse Terminal" },
];

export function AbujaCorridorMap({
  corridorId,
  originName,
  destName,
  anchorName,
  midCorridorActive,
  nluModel,
  nluLatencyMs,
  voiceModel,
  voiceLatencyMs,
  faissLatencyMs,
  cosineScore,
  jwScore,
  popScore,
  finalScore,
}: AbujaCorridorMapProps) {
  const [activeTab, setActiveTab] = useState<"map" | "observability">("map");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#111916",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
        boxShadow: "0 18px 48px rgba(0,0,0,0.4)",
      }}
    >
      {/* Top Console Navigation */}
      <header
        style={{
          background: "#17221E",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CorridorNodeIcon size={20} color="#00A86B" />
          <div>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: "#F3F6F4" }}>
              Abuja Corridor GIS Topology &amp; AI Engine
            </div>
            <div style={{ fontSize: 11, color: "#9FB0A7" }}>
              Route {corridorId} • PostGIS ST_LineLocatePoint (Linear km)
            </div>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div
          style={{
            background: "#0A0F0D",
            padding: 3,
            borderRadius: 8,
            display: "flex",
            gap: 4,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            onClick={() => setActiveTab("map")}
            style={{
              background: activeTab === "map" ? "#008751" : "transparent",
              color: activeTab === "map" ? "#FFFFFF" : "#9FB0A7",
              border: "none",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Live Corridor Map
          </button>
          <button
            onClick={() => setActiveTab("observability")}
            style={{
              background: activeTab === "observability" ? "#008751" : "transparent",
              color: activeTab === "observability" ? "#FFFFFF" : "#9FB0A7",
              border: "none",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <ShieldCheckIcon size={13} color={activeTab === "observability" ? "#FFFFFF" : "#00A86B"} />
            <span>Meta AI Pipeline Trace</span>
          </button>
        </div>
      </header>

      {/* Main Panel Content */}
      <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {activeTab === "map" ? (
          <>
            {/* Interactive Abuja Corridor Vector Map */}
            <div
              style={{
                position: "relative",
                background: "#0A0F0D",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              <svg
                viewBox="0 0 680 320"
                style={{ width: "100%", height: "auto", display: "block" }}
              >
                {/* Subtle Grid Lines */}
                <defs>
                  <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
                    <path
                      d="M 34 0 L 0 0 0 34"
                      fill="none"
                      stroke="rgba(255,255,255,0.025)"
                      strokeWidth="1"
                    />
                  </pattern>
                  <linearGradient id="roadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00A86B" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#00A86B" />
                  </linearGradient>
                </defs>
                <rect width="680" height="320" fill="url(#grid)" />

                {/* Curved Winding Highway Path (Bwari -> Dutse -> Katampe -> Berger -> Wuse) */}
                <path
                  d="M 70 45 Q 120 70 175 88 T 250 135 T 375 175 T 460 220 T 540 255 T 615 290"
                  fill="none"
                  stroke="#17221E"
                  strokeWidth="20"
                  strokeLinecap="round"
                />
                <path
                  d="M 70 45 Q 120 70 175 88 T 250 135 T 375 175 T 460 220 T 540 255 T 615 290"
                  fill="none"
                  stroke="url(#roadGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />

                {/* Animated Moving Along Pod Vehicle Marker */}
                <g transform={midCorridorActive ? "translate(375, 175)" : "translate(210, 110)"}>
                  <circle r="16" fill="rgba(0,168,107,0.25)">
                    <animate attributeName="r" values="10;22;10" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle r="9" fill="#00A86B" stroke="#FFFFFF" strokeWidth="2" />
                  <text x="0" y="3" fontSize="8" fontWeight="800" fill="#FFFFFF" textAnchor="middle">
                    POD
                  </text>
                </g>

                {/* Waypoint Pins along the Highway */}
                {WAYPOINTS.map((wp) => {
                  const isReload = wp.isReload;
                  const isAnchor = wp.isAnchor;

                  return (
                    <g key={wp.id} transform={`translate(${wp.x}, ${wp.y})`}>
                      {/* Node Halo */}
                      <circle
                        r={isReload && midCorridorActive ? 14 : 9}
                        fill={isReload && midCorridorActive ? "rgba(245,158,11,0.25)" : "#0A0F0D"}
                        stroke={isReload ? "#F59E0B" : isAnchor ? "#00A86B" : "#8696A0"}
                        strokeWidth="3"
                      />
                      <circle
                        r="4"
                        fill={isReload ? "#F59E0B" : isAnchor ? "#00A86B" : "#9FB0A7"}
                      />

                      {/* Waypoint Label */}
                      <text
                        x="0"
                        y={wp.y < 160 ? -14 : 22}
                        textAnchor="middle"
                        fill="#F3F6F4"
                        fontSize="10"
                        fontWeight="700"
                        letterSpacing="-0.01em"
                      >
                        {wp.name}
                      </text>
                      <text
                        x="0"
                        y={wp.y < 160 ? -3 : 32}
                        textAnchor="middle"
                        fill={isReload ? "#F59E0B" : "#9FB0A7"}
                        fontSize="8.5"
                        className="tabular-nums"
                      >
                        {wp.partner} ({wp.km} km)
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Map Legend Overlay */}
              <div
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  background: "rgba(17,25,22,0.88)",
                  backdropFilter: "blur(6px)",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 10.5,
                  display: "flex",
                  gap: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00A86B" }} />
                  <span>Safe Filling Station Anchor</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B" }} />
                  <span>Mid-Corridor Seat Reload Node</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#008751" }} />
                  <span>Active Moving Pod</span>
                </div>
              </div>
            </div>

            {/* Resolved Route & Anchor Callout */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                fontSize: 12.5,
              }}
            >
              <div
                style={{
                  background: "#17221E",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ color: "#9FB0A7", fontSize: 10.5, fontWeight: 700 }}>
                  ORIGIN LANDMARK &amp; ANCHOR FORECOURT
                </div>
                <div style={{ fontWeight: 700, marginTop: 2, color: "#F3F6F4" }}>
                  {originName}
                </div>
                <div style={{ color: "#00A86B", fontSize: 11.5, marginTop: 2 }}>
                  Snapped Forecourt: {anchorName} (150m Geofence)
                </div>
              </div>

              <div
                style={{
                  background: "#17221E",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ color: "#9FB0A7", fontSize: 10.5, fontWeight: 700 }}>
                  DESTINATION &amp; RELOAD STATUS
                </div>
                <div style={{ fontWeight: 700, marginTop: 2, color: "#F3F6F4" }}>
                  {destName}
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    color: midCorridorActive ? "#F59E0B" : "#9FB0A7",
                    fontSize: 11.5,
                    marginTop: 2,
                  }}
                >
                  {midCorridorActive
                    ? "Seat Reload Active @ Oando Katampe (+₦500 Fare Captured)"
                    : "Terminal Route: 36.5 km • Zero Roadside Stopping"}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Meta AI Pipeline Observability Trace */
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Stage 1: Muse Voice Transcribe */}
            <div
              style={{
                background: "#17221E",
                borderRadius: 10,
                padding: 12,
                borderLeft: "4px solid #F59E0B",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: 12, color: "#F59E0B" }}>
                  1. SPEECH RECOGNITION (ASR) • META MUSE VOICE TRANSCRIBE
                </span>
                <span className="tabular-nums" style={{ fontSize: 11, color: "#9FB0A7" }}>
                  Latency: {voiceLatencyMs || 112}ms
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#F3F6F4", marginTop: 4 }}>
                Model: <strong>{voiceModel || "Muse Voice Transcribe"}</strong> with Abuja Vocabulary Conditioning
                (Dutse, Berger, Wuse, Agbero, Kujera).
              </div>
            </div>

            {/* Stage 2: Intent & Slot Extraction */}
            <div
              style={{
                background: "#17221E",
                borderRadius: 10,
                padding: 12,
                borderLeft: "4px solid #00A86B",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: 12, color: "#00A86B" }}>
                  2. MULTILINGUAL NLU &amp; SLOTS • META MUSE SPARK / WONDER
                </span>
                <span className="tabular-nums" style={{ fontSize: 11, color: "#9FB0A7" }}>
                  Latency: {nluLatencyMs}ms
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#F3F6F4", marginTop: 4 }}>
                Model: <strong>{nluModel}</strong> • Detects Pidgin, Hausa, and English intents. Identifies relational
                modifiers (e.g. &ldquo;that Oando after Katampe bridge&rdquo;).
              </div>
            </div>

            {/* Stage 3: Meta FAISS 768-D Index */}
            <div
              style={{
                background: "#17221E",
                borderRadius: 10,
                padding: 12,
                borderLeft: "4px solid #00A86B",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: 12, color: "#00A86B" }}>
                  3. VECTOR RETRIEVAL &amp; HYBRID RANKING • META FAISS 768-D
                </span>
                <span className="tabular-nums" style={{ fontSize: 11, color: "#9FB0A7" }}>
                  Latency: {faissLatencyMs}ms (p95 &lt; 3.1ms)
                </span>
              </div>
              <div className="tabular-nums" style={{ fontSize: 12, color: "#F3F6F4", marginTop: 4 }}>
                Formula: 0.65*Cos({cosineScore}) + 0.25*JW({jwScore}) + 0.10*Pop({popScore}) ={" "}
                <strong style={{ color: "#F59E0B" }}>{finalScore}</strong> (Snaps to 24 Private Filling Stations).
              </div>
            </div>

            {/* Stage 4: SAM 3.1 Driver KYC & Safety Guard */}
            <div
              style={{
                background: "#17221E",
                borderRadius: 10,
                padding: 12,
                borderLeft: "4px solid #008751",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: 12, color: "#008751" }}>
                  4. COMPUTER VISION &amp; SAFETY • META SAM 3.1 + LLAMA GUARD 4
                </span>
                <span style={{ fontSize: 11, color: "#9FB0A7" }}>
                  Guard: &lt; 1.2ms
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#F3F6F4", marginTop: 4 }}>
                Vehicle KYC verified by <strong>SAM 3.1</strong> (Cabin segmentation IoU 0.94, Plate ABJ-412K).
                SOS distress keywords monitored by <strong>Llama Guard 4</strong> for zero roadside kidnapping.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
