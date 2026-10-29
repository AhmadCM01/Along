"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlongLogo } from "@/components/brand/AlongLogo";
import { AbujaCorridorMap } from "@/components/demo/AbujaCorridorMap";
import { DriverCabinSimulator } from "@/components/demo/DriverCabinSimulator";
import { WhatsAppSimulator } from "@/components/demo/WhatsAppSimulator";
import { useAlongChat } from "@/hooks/useAlongChat";

const PRESET_INPUTS = [
  {
    id: "preset_1",
    title: "1. Pidgin (Dutse -> Berger)",
    sample_utterance: "Abeg I dey Dutse first gate, two seats go Berger",
    locale: "pcm" as const,
  },
  {
    id: "preset_2",
    title: "2. Relational Landmark (Sokale -> Oando)",
    sample_utterance: "From Sokale roundabout, drop me for that Oando after Katampe bridge",
    locale: "en" as const,
  },
  {
    id: "preset_3",
    title: "3. Hausa Booking (Bwari -> Wuse)",
    sample_utterance: "Ina Bwari zan je Kasuwar Wuse kujera biyu",
    locale: "ha" as const,
  },
  {
    id: "preset_4",
    title: "4. Lugbe Commuter (Police Signboard -> Area 1)",
    sample_utterance: "I dey Police signboard Lugbe, 1 seat go Area 1",
    locale: "pcm" as const,
  },
  {
    id: "preset_5",
    title: "5. Anti-Kidnap SOS Interception",
    sample_utterance: "Abeg help me o, driver refused to stop, one chance!",
    locale: "pcm" as const,
    isSos: true,
  },
];

export default function JudgeCockpitPage() {
  const chat = useAlongChat();
  const [midCorridorActive, setMidCorridorActive] = useState(false);
  const [driverMode, setDriverMode] = useState<"SMARTPHONE" | "FEATURE_PHONE_2G">("SMARTPHONE");
  const [showProblemDrawer, setShowProblemDrawer] = useState(false);
  const [mobileTab, setMobileTab] = useState<"whatsapp" | "map" | "driver">("whatsapp");

  // Send initial sample utterance on first mount so the cockpit has live data immediately
  useEffect(() => {
    chat.sendSampleInput("Abeg I dey Dutse first gate, two seats go Berger");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePresetClick = (utterance: string) => {
    setMidCorridorActive(utterance.toLowerCase().includes("oando"));
    chat.sendSampleInput(utterance);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0F0D",
        color: "#F3F6F4",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, 'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Top Header & Problem Narrative Bar */}
      <header
        style={{
          background: "#111916",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "10px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Logo & Hackathon Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/">
              <AlongLogo variant="dark" size="sm" />
            </Link>
            <span
              style={{
                background: "rgba(0,168,107,0.16)",
                color: "#00A86B",
                border: "1px solid rgba(0,168,107,0.3)",
                padding: "3px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              META AI DEVELOPER HACKATHON
            </span>

            <button
              onClick={() => setShowProblemDrawer(!showProblemDrawer)}
              style={{
                background: showProblemDrawer ? "#008751" : "#17221E",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.12)",
                padding: "4px 9px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span>The Abuja Transit Problem</span>
              <span>{showProblemDrawer ? "▲" : "▼"}</span>
            </button>
          </div>

          {/* Quick Route Links */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="tabular-nums"
              style={{
                background: "#17221E",
                border: "1px solid rgba(0,168,107,0.3)",
                color: "#00A86B",
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              LEDGER TRIAL BALANCE: 0 KOBO
            </span>
            <Link
              href="/ops"
              style={{
                background: "#17221E",
                color: "#F3F6F4",
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              /ops
            </Link>
            <Link
              href="/driver"
              style={{
                background: "#17221E",
                color: "#F3F6F4",
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              /driver
            </Link>
          </div>
        </div>

        {/* Expandable Problem & Meta AI Architecture Drawer */}
        {showProblemDrawer && (
          <div
            style={{
              background: "#17221E",
              borderRadius: 10,
              padding: 12,
              fontSize: 12,
              lineHeight: 1.5,
              border: "1px solid rgba(0,168,107,0.25)",
              color: "#9FB0A7",
            }}
          >
            <strong style={{ color: "#F3F6F4" }}>The Real-World Abuja Challenge:</strong> In Abuja, Nigeria, an estimated 1.8
            million daily commuters face violent roadside carjackings and aggressive Agbero tout
            extortion (N1,250 in illegal fees per round trip).
            <br />
            <strong style={{ color: "#00A86B" }}>The Along Solution:</strong> Along pairs verified commuters into 4-seat
            sedan pods waiting inside private, well-lit filling station forecourts (A.A. Rano, Bovas, Oando, Conoil).
            Commuters use WhatsApp in English, Pidgin, or Hausa. Orchestrated with character n-gram hashing, FAISS vector index,
            Rule-based safety gate, and Meta open-weight models when configured.
          </div>
        )}

        {/* 5 One-Tap Sample Preset Inputs (Calling Real Endpoint) */}
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 2,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11, color: "#8696A0", whiteSpace: "nowrap", fontWeight: 700 }}>
            Sample Inputs (Live Pipeline):
          </span>
          {PRESET_INPUTS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset.sample_utterance)}
              disabled={chat.isLoading}
              style={{
                background: preset.isSos ? "rgba(220,38,38,0.2)" : "#17221E",
                color: preset.isSos ? "#FCA5A5" : "#FFFFFF",
                border: preset.isSos ? "1px solid #DC2626" : "1px solid rgba(255,255,255,0.08)",
                padding: "5px 10px",
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 600,
                whiteSpace: "nowrap",
                cursor: chat.isLoading ? "not-allowed" : "pointer",
                opacity: chat.isLoading ? 0.6 : 1,
              }}
            >
              {preset.title}
            </button>
          ))}
        </div>
      </header>

      {/* Fallback Banner: rendered ONLY whenever a response has fallback=true */}
      {chat.fallback && (
        <div
          style={{
            background: "rgba(217, 119, 6, 0.15)",
            borderBottom: "1px solid #D97706",
            color: "#F59E0B",
            padding: "7px 18px",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span>{chat.fallbackBanner || "Fallback mode: no Meta model used for part of this request"}</span>
          </div>
          <span
            style={{
              fontSize: 11,
              color: "#9FB0A7",
              fontWeight: 600,
              background: "#17221E",
              padding: "2px 8px",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Local Rule-Based Fallback Active
          </span>
        </div>
      )}

      {/* Replay Mode Bar: Hidden until the file exists */}
      {chat.isReplayAvailable && (
        <div
          style={{
            background: chat.replayMode ? "rgba(0,168,107,0.15)" : "#141E1A",
            borderBottom: "1px solid rgba(0,168,107,0.3)",
            padding: "6px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11.5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => chat.toggleReplayMode()}
              style={{
                background: chat.replayMode ? "#008751" : "#1B2A23",
                color: "#FFFFFF",
                border: "1px solid rgba(0,168,107,0.4)",
                padding: "3px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {chat.replayMode ? "Exit Replay Mode" : "Switch to Replay Mode"}
            </button>
            <span style={{ color: chat.replayMode ? "#00A86B" : "#8696A0", fontWeight: 600 }}>
              Replayed trace recorded on {chat.replayDate}
            </span>
          </div>

          {chat.replayMode && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 10.5, color: "#8696A0" }}>Recorded Runs:</span>
              {chat.replayRuns.map((run) => (
                <button
                  key={run.id}
                  onClick={() => chat.selectReplayRun(run.id)}
                  style={{
                    background: chat.activeReplayRunId === run.id ? "#008751" : "#1B2A23",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 10.5,
                    cursor: "pointer",
                  }}
                >
                  {run.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div
        className="mobile-tab-bar"
        style={{
          display: "none",
          background: "#17221E",
          padding: 6,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <button
          onClick={() => setMobileTab("whatsapp")}
          style={{
            flex: 1,
            background: mobileTab === "whatsapp" ? "#008751" : "transparent",
            color: "#FFFFFF",
            border: "none",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          📱 WhatsApp Phone
        </button>
        <button
          onClick={() => setMobileTab("map")}
          style={{
            flex: 1,
            background: mobileTab === "map" ? "#008751" : "transparent",
            color: "#FFFFFF",
            border: "none",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🗺️ Corridor Map
        </button>
        <button
          onClick={() => setMobileTab("driver")}
          style={{
            flex: 1,
            background: mobileTab === "driver" ? "#008751" : "transparent",
            color: "#FFFFFF",
            border: "none",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🚗 Driver Pod
        </button>
      </div>

      {/* 3-Pane Responsive Cockpit Grid */}
      <main
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "380px minmax(480px, 1fr) 380px",
          gap: 14,
          padding: 14,
          maxHeight: "calc(100vh - 105px)",
          overflow: "hidden",
        }}
      >
        {/* PANE 1: WhatsApp Simulator */}
        <section
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <WhatsAppSimulator
            messages={chat.messages}
            onSendMessage={(text) => chat.sendMessage(text)}
            onSendVoiceAudio={(blob, filename) => chat.sendVoiceAudio(blob, filename)}
            onSendSampleInput={(text) => chat.sendSampleInput(text)}
            onConfirmBooking={() => chat.confirmBooking()}
            onTriggerSos={() => chat.triggerSos()}
            activeLocale={chat.activeLocale}
            onChangeLocale={chat.setActiveLocale}
            isProcessing={chat.isLoading}
            elapsedSeconds={chat.elapsedSeconds}
            errorMessage={chat.errorMessage}
          />
        </section>

        {/* PANE 2: Abuja Corridor Map & Meta AI Trace (AI Inspector) */}
        <section
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <AbujaCorridorMap
            corridorId={chat.currentQuote?.corridorId || "BWR-DUT-WUS"}
            originName={chat.currentQuote?.originName || "Dutse First Gate"}
            destName={chat.currentQuote?.destName || "Berger Roundabout Underbridge"}
            anchorName={chat.currentQuote?.anchorName || "A.A. Rano Filling Station"}
            midCorridorActive={midCorridorActive}
            traces={chat.traces}
            resolverScores={chat.resolverScores}
            isLoading={chat.isLoading}
            elapsedSeconds={chat.elapsedSeconds}
            errorMessage={chat.errorMessage}
          />
        </section>

        {/* PANE 3: Driver Cabin */}
        <section
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <DriverCabinSimulator
            corridorId={chat.currentQuote?.corridorId || "BWR-DUT-WUS"}
            anchorName={chat.currentQuote?.anchorName || "A.A. Rano Filling Station"}
            midCorridorActive={midCorridorActive}
            onToggleMidCorridor={() => setMidCorridorActive(!midCorridorActive)}
            driverMode={driverMode}
            onToggleDriverMode={() =>
              setDriverMode((curr) => (curr === "SMARTPHONE" ? "FEATURE_PHONE_2G" : "SMARTPHONE"))
            }
          />
        </section>
      </main>

      {/* Embedded CSS for Mobile Breakpoints */}
      <style jsx global>{`
        @media (max-width: 1200px) {
          .mobile-tab-bar {
            display: flex !important;
          }
          main {
            display: flex !important;
            flex-direction: column !important;
            max-height: none !important;
            overflow-y: auto !important;
          }
          main > section {
            display: ${mobileTab === "whatsapp" ? "flex" : "none"} !important;
            min-height: calc(100vh - 170px);
          }
          main > section:nth-of-type(2) {
            display: ${mobileTab === "map" ? "flex" : "none"} !important;
            min-height: calc(100vh - 170px);
          }
          main > section:nth-of-type(3) {
            display: ${mobileTab === "driver" ? "flex" : "none"} !important;
            min-height: calc(100vh - 170px);
          }
        }
      `}</style>
    </div>
  );
}
