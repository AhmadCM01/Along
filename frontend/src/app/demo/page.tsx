"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlongLogo } from "@/components/brand/AlongLogo";
import {
  CarPodIcon,
  CorridorNodeIcon,
  ShieldCheckIcon,
  SosBeaconIcon,
} from "@/components/icons/AlongIcons";
import { AbujaCorridorMap } from "@/components/demo/AbujaCorridorMap";
import { DriverCabinSimulator } from "@/components/demo/DriverCabinSimulator";
import { ChatMessage, WhatsAppSimulator } from "@/components/demo/WhatsAppSimulator";

interface StoryPreset {
  id: string;
  title: string;
  commuter: string;
  locale: "en" | "pcm" | "ha";
  initialMessage: string;
  isVoice?: boolean;
  voiceDuration?: string;
  corridorId: string;
  originName: string;
  destName: string;
  anchorName: string;
  seats: number;
  unitFare: string;
  totalFare: string;
  otp: string;
  nluModel: string;
  nluLatencyMs: number;
  voiceModel?: string;
  voiceLatencyMs?: number;
  faissLatencyMs: number;
  cosineScore: number;
  jwScore: number;
  popScore: number;
  finalScore: number;
  driverMode: "SMARTPHONE" | "FEATURE_PHONE_2G";
  isSos?: boolean;
  botReply: string;
}

const HUMAN_STORIES: StoryPreset[] = [
  {
    id: "story_1",
    title: "1. Amina & Sister (Dutse -> Berger)",
    commuter: "Amina Bello (Hospital Nurse)",
    locale: "pcm",
    initialMessage: "Abeg I dey Dutse first gate, two seats go Berger",
    corridorId: "BWR-DUT-WUS",
    originName: "Dutse First Gate (LMK-DUT-FG)",
    destName: "Berger Roundabout Underbridge",
    anchorName: "A.A. Rano Filling Station (Dutse First Gate)",
    seats: 2,
    unitFare: "₦900",
    totalFare: "₦1,800",
    otp: "4829",
    nluModel: "Deterministic rule-based extractor [Demo data]",
    nluLatencyMs: 0,
    faissLatencyMs: 0,
    cosineScore: 0.98,
    jwScore: 1.0,
    popScore: 0.98,
    finalScore: 0.985,
    driverMode: "SMARTPHONE",
    botReply:
      "Pod POD-842A [Demo data] Don Set! Wait for Safe Anchor: A.A. Rano Filling Station (Inside Station, No Agbero Wahala). Demo driver profile: Musa Danjuma (Toyota Corolla Silver, ABJ-412K [Demo data]). Boarding OTP: 4829.",
  },
  {
    id: "story_2",
    title: "2. Mid-Corridor Reload (Oando Katampe)",
    commuter: "Chijioke Eze & Chidinma Okafor",
    locale: "en",
    initialMessage: "From Sokale roundabout, drop me for that Oando after Katampe bridge",
    corridorId: "BWR-DUT-WUS",
    originName: "Sokale Roundabout Dutse (LMK-SOK-RBT)",
    destName: "Oando Filling Station (After Katampe Bridge)",
    anchorName: "Bovas Filling Station (Sokale Roundabout)",
    seats: 1,
    unitFare: "₦700",
    totalFare: "₦700",
    otp: "5192",
    nluModel: "Deterministic rule-based extractor [Demo data]",
    nluLatencyMs: 0,
    faissLatencyMs: 0,
    cosineScore: 0.94,
    jwScore: 0.92,
    popScore: 0.99,
    finalScore: 0.94,
    driverMode: "SMARTPHONE",
    botReply:
      "Along Corridor Quote (BWR-DUT-WUS): Pickup at Bovas Sokale -> Drop-off at Oando Filling Station (After Katampe Bridge). Mid-Corridor Zone Fare: ₦700 (Simulated escrow). Seat Reload enabled at Oando!",
  },
  {
    id: "story_3",
    title: "3. Bwari Farmer (Hausa Voice)",
    commuter: "Ibrahim Suleiman (Bwari Farmer)",
    locale: "ha",
    initialMessage: "Ina Bwari zan je Kasuwar Wuse kujera biyu",
    isVoice: true,
    voiceDuration: "0:05",
    voiceModel: "Sample transcript (no ASR run)",
    voiceLatencyMs: 0,
    corridorId: "BWR-DUT-WUS",
    originName: "Bwari Central Market (LMK-BWR-MKT)",
    destName: "Wuse Market Main Gate",
    anchorName: "NIPCO Filling Station (Bwari Town)",
    seats: 2,
    unitFare: "₦1,800",
    totalFare: "₦3,600",
    otp: "7314",
    nluModel: "Deterministic rule-based extractor [Demo data]",
    nluLatencyMs: 0,
    faissLatencyMs: 0,
    cosineScore: 0.96,
    jwScore: 0.95,
    popScore: 0.98,
    finalScore: 0.96,
    driverMode: "SMARTPHONE",
    botReply:
      "An Samu Motar Pod POD-910C [Demo data]! Direba: Demo driver profile: Ibrahim Suleiman (Honda Accord, KWL-809X [Demo data]). Wurin Haduwa: NIPCO Filling Station Bwari. Lambar Shiga Mota (OTP): 7314.",
  },
  {
    id: "story_4",
    title: "4. 2G Driver (*384*247# IVR)",
    commuter: "Mallam Sani (Lugbe Commuter)",
    locale: "pcm",
    initialMessage: "I dey Police signboard Lugbe, 1 seat go Area 1",
    corridorId: "GWL-LUG-AR1",
    originName: "Lugbe Police Signboard (LMK-LUG-PSB)",
    destName: "Area 1 Roundabout Garki",
    anchorName: "Conoil Filling Station (Lugbe Signboard)",
    seats: 1,
    unitFare: "₦700",
    totalFare: "₦700",
    otp: "4829",
    nluModel: "Deterministic rule-based extractor [Demo data]",
    nluLatencyMs: 0,
    faissLatencyMs: 0,
    cosineScore: 0.97,
    jwScore: 0.98,
    popScore: 0.98,
    finalScore: 0.974,
    driverMode: "FEATURE_PHONE_2G",
    botReply:
      "Pod POD-551K [Demo data] Matched on GWL-LUG-AR1! Driver Mallam Sani accepted via 2G Voice Call (DTMF 1). Meet inside Conoil Filling Station Lugbe. Boarding OTP: 4829.",
  },
  {
    id: "story_5",
    title: "5. Anti-Kidnap SOS Interception",
    commuter: "Emergency Alert (Kugbo Hill)",
    locale: "pcm",
    initialMessage: "Abeg help me o, driver refused to stop, one chance!",
    corridorId: "MRB-NYA-CEN",
    originName: "Mararaba Orange Market (LMK-MRB-ORN)",
    destName: "Federal Secretariat Central Area",
    anchorName: "Matrix Filling Station (Orange Market)",
    seats: 1,
    unitFare: "₦800",
    totalFare: "₦800",
    otp: "9911",
    nluModel: "Rule-based safety gate",
    nluLatencyMs: 0,
    faissLatencyMs: 0,
    cosineScore: 1.0,
    jwScore: 1.0,
    popScore: 1.0,
    finalScore: 1.0,
    driverMode: "SMARTPHONE",
    isSos: true,
    botReply:
      "SOS EMERGENCY ALERT ACTIVATED! Along Safety Command Center has locked trip POD-842A [Demo data], notified emergency contacts, and alerted Abuja Police Highway Patrol with live GPS telemetry.",
  },
];

export default function JudgeCockpitPage() {
  const [activeStory, setActiveStory] = useState<StoryPreset>(HUMAN_STORIES[0]);
  const [activeLocale, setActiveLocale] = useState<"en" | "pcm" | "ha">("pcm");
  const [midCorridorActive, setMidCorridorActive] = useState(false);
  const [isFindingRide, setIsFindingRide] = useState(false);
  const [driverMode, setDriverMode] = useState<"SMARTPHONE" | "FEATURE_PHONE_2G">("SMARTPHONE");
  const [showProblemDrawer, setShowProblemDrawer] = useState(false);
  const [mobileTab, setMobileTab] = useState<"whatsapp" | "map" | "driver">("whatsapp");

  // Chat message thread state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_1",
      sender: "user",
      text: HUMAN_STORIES[0].initialMessage,
      timestamp: "12:44",
    },
    {
      id: "msg_2",
      sender: "bot",
      text: HUMAN_STORIES[0].botReply,
      timestamp: "12:44",
      quoteData: {
        corridorId: HUMAN_STORIES[0].corridorId,
        anchorName: HUMAN_STORIES[0].anchorName,
        destName: HUMAN_STORIES[0].destName,
        seats: HUMAN_STORIES[0].seats,
        unitFare: HUMAN_STORIES[0].unitFare,
        totalFare: HUMAN_STORIES[0].totalFare,
        otp: HUMAN_STORIES[0].otp,
      },
    },
  ]);

  const handleSelectStory = (story: StoryPreset) => {
    setActiveStory(story);
    setActiveLocale(story.locale);
    setDriverMode(story.driverMode);
    setMidCorridorActive(story.id === "story_2");

    setMessages([
      {
        id: `msg_u_${Date.now()}`,
        sender: "user",
        text: story.initialMessage,
        isVoice: story.isVoice,
        voiceDuration: story.voiceDuration,
        timestamp: "12:45",
      },
      {
        id: `msg_b_${Date.now() + 1}`,
        sender: "bot",
        text: story.botReply,
        timestamp: "12:45",
        isSos: story.isSos,
        quoteData: story.isSos
          ? undefined
          : {
              corridorId: story.corridorId,
              anchorName: story.anchorName,
              destName: story.destName,
              seats: story.seats,
              unitFare: story.unitFare,
              totalFare: story.totalFare,
              otp: story.otp,
            },
      },
    ]);
  };

  const handleSendMessage = (text: string, isVoice = false) => {
    const userMsgId = `usr_${Date.now()}`;
    const botMsgId = `bot_${Date.now() + 1}`;

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: "user",
        text,
        isVoice,
        voiceDuration: isVoice ? "0:04" : undefined,
        timestamp: "12:46",
      },
    ];
    setMessages(newMessages);
    setIsFindingRide(true);

    // Check if user triggered SOS keyword
    const isSosQuery =
      text.toLowerCase().includes("sos") ||
      text.toLowerCase().includes("help") ||
      text.toLowerCase().includes("one chance");

    setTimeout(() => {
      setIsFindingRide(false);
      if (isSosQuery) {
        setMessages((prev) => [
          ...prev,
          {
            id: botMsgId,
            sender: "bot",
            text: "SOS EMERGENCY LOCKDOWN! Safety Command Center notified. Patrol unit tracking live coordinates on corridor.",
            timestamp: "12:46",
            isSos: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: botMsgId,
            sender: "bot",
            text: `Along Pod Quote Generated (${activeStory.corridorId}): Safe pickup inside ${activeStory.anchorName}. Fixed Escrow fare locked.`,
            timestamp: "12:46",
            quoteData: {
              corridorId: activeStory.corridorId,
              anchorName: activeStory.anchorName,
              destName: activeStory.destName,
              seats: activeStory.seats,
              unitFare: activeStory.unitFare,
              totalFare: activeStory.totalFare,
              otp: activeStory.otp,
            },
          },
        ]);
      }
    }, 1500);
  };

  const handleConfirmBooking = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: `confirm_${Date.now()}`,
        sender: "bot",
        text: `✓ Booking Confirmed! ₦${activeStory.totalFare} locked in Simulated escrow. Demo driver profile: Musa Danjuma (Toyota Corolla Silver, ABJ-412K [Demo data]) is entering the filling station forecourt now. Show OTP ${activeStory.otp} when entering car.`,
        timestamp: "12:47",
      },
    ]);
  };

  const handleTriggerSos = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: `sos_${Date.now()}`,
        sender: "bot",
        text: "⚠ SOS TRIGGERED! Escrow payout locked, family safety tracker pinged, and corridor patrol dispatched.",
        timestamp: "12:47",
        isSos: true,
      },
    ]);
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
            million daily commuters (illustrative estimate) face violent &ldquo;One-Chance&rdquo; roadside carjackings and aggressive Agbero tout
            extortion (₦1,250 in illegal fees per round trip).
            <br />
            <strong style={{ color: "#00A86B" }}>The Along Solution:</strong> Along pairs verified commuters into 4-seat
            sedan pods waiting inside private, well-lit filling station forecourts (A.A. Rano, Bovas, Oando, Conoil).
            Commuters use WhatsApp in English, Pidgin, or Hausa. Orchestrated with character n-gram hashing, FAISS vector index,
            Rule-based safety gate, and Meta open-weight models when configured.
          </div>
        )}

        {/* 5 Human Story Presets Bar */}
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
            Interactive Stories [Demo data]:
          </span>
          {HUMAN_STORIES.map((story) => {
            const isSelected = story.id === activeStory.id;
            return (
              <button
                key={story.id}
                onClick={() => handleSelectStory(story)}
                style={{
                  background: isSelected
                    ? story.isSos
                      ? "#DC2626"
                      : "#008751"
                    : "#17221E",
                  color: "#FFFFFF",
                  border: isSelected ? "1px solid #00A86B" : "1px solid rgba(255,255,255,0.08)",
                  padding: "5px 10px",
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: isSelected ? 700 : 500,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {story.title}
              </button>
            );
          })}
        </div>
      </header>

      {/* Persistent Fallback Mode Banner */}
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
          <span>Fallback mode: no Meta model used for part of this request</span>
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
          Demo Presets • Local Rule-Based Fallback
        </span>
      </div>

      {/* Mobile Tab Switcher (< 1200px) */}
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
        {/* PANE 1: Authentic WhatsApp Simulator Chassis */}
        <section
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <WhatsAppSimulator
            messages={messages}
            onSendMessage={handleSendMessage}
            onConfirmBooking={handleConfirmBooking}
            onTriggerSos={handleTriggerSos}
            activeLocale={activeLocale}
            onChangeLocale={setActiveLocale}
            isProcessing={isFindingRide}
          />
        </section>

        {/* PANE 2: Abuja Corridor Map & Meta AI Engine Observability */}
        <section
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <AbujaCorridorMap
            corridorId={activeStory.corridorId}
            originName={activeStory.originName}
            destName={activeStory.destName}
            anchorName={activeStory.anchorName}
            midCorridorActive={midCorridorActive}
            nluModel={activeStory.nluModel}
            nluLatencyMs={activeStory.nluLatencyMs}
            voiceModel={activeStory.voiceModel}
            voiceLatencyMs={activeStory.voiceLatencyMs}
            faissLatencyMs={activeStory.faissLatencyMs}
            cosineScore={activeStory.cosineScore}
            jwScore={activeStory.jwScore}
            popScore={activeStory.popScore}
            finalScore={activeStory.finalScore}
          />
        </section>

        {/* PANE 3: Driver Cabin & Mid-Corridor Reload Simulator */}
        <section
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <DriverCabinSimulator
            corridorId={activeStory.corridorId}
            anchorName={activeStory.anchorName}
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
