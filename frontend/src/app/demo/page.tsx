"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/navigation/Header";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { WhatsAppSimulator } from "@/components/demo/WhatsAppSimulator";
import { AbujaCorridorMap } from "@/components/demo/AbujaCorridorMap";
import { BehindTheScenes } from "@/components/demo/BehindTheScenes";
import { TransitStrip } from "@/components/demo/TransitStrip";
import { HonestyTable } from "@/components/demo/HonestyTable";
import { QuoteCard } from "@/components/booking/QuoteCard";
import { RideCard } from "@/components/booking/RideCard";
import { useAlongChat } from "@/hooks/useAlongChat";

export default function JudgeCockpitPage() {
  const chat = useAlongChat();
  const [bookedPod, setBookedPod] = useState(false);

  const handlePlaySample = () => {
    chat.setActiveLocale("pcm");
    chat.sendSampleInput("Abeg I dey Dutse first gate, two seats go Berger");
  };

  const handleConfirmBooking = () => {
    chat.confirmBooking();
    setBookedPod(true);
  };

  const handleReset = () => {
    setBookedPod(false);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const formattedScores = chat.resolverScores
    ? [
        ...(chat.resolverScores.originScores
          ? [
              {
                candidate: chat.resolverScores.originName,
                score: chat.resolverScores.originScores.final_score,
                corridor: chat.currentQuote?.corridorId || "BWR-DUT-WUS",
              },
            ]
          : []),
        ...(chat.resolverScores.destScores
          ? [
              {
                candidate: chat.resolverScores.destName,
                score: chat.resolverScores.destScores.final_score,
                corridor: chat.currentQuote?.corridorId || "BWR-DUT-WUS",
              },
            ]
          : []),
      ]
    : [
        { candidate: "Dutse First Gate", score: 0.94, corridor: "BWR-DUT-WUS" },
        { candidate: "Berger Roundabout", score: 0.91, corridor: "BWR-DUT-WUS" },
        { candidate: "Sokale Roundabout", score: 0.88, corridor: "BWR-DUT-WUS" },
      ];

  const shareToken = chat.currentQuote?.shareToken || "tok_demo_family_123";

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
      {/* Judge Mode Notice Bar */}
      <div
        style={{
          background: "var(--brand-soft)",
          borderBottom: "1px solid rgba(11, 110, 79, 0.25)",
          color: "var(--brand-primary)",
          padding: "6px 20px",
          fontSize: 12,
          fontWeight: 700,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Meta AI Developer Hackathon: Judge Mode Enabled</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)" }}>
          Full backend inference traces &amp; live scoring active
        </span>
      </div>

      <Header
        activeLocale={chat.activeLocale}
        onChangeLocale={chat.setActiveLocale}
        activeShareToken={shareToken}
        behindTheScenesOpen={true}
      />

      <main
        style={{
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
          padding: "20px 20px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Quick Tour Header */}
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "clamp(26px, 4vw, 36px)",
                fontWeight: 800,
                lineHeight: 1.15,
                color: "var(--text-ink)",
              }}
            >
              Evaluator cockpit: voice to corridor pod
            </h1>
            <p
              style={{
                fontSize: 15,
                color: "var(--text-muted)",
                marginTop: 6,
                maxWidth: 640,
              }}
            >
              Test speech recognition, Llama slot extraction, sub-15ms corridor matching, and secure HMAC boarding codes.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handlePlaySample}
              disabled={chat.isLoading}
              style={{
                background: "var(--brand-primary)",
                color: "var(--brand-ink)",
                padding: "10px 18px",
                borderRadius: "var(--radius-button)",
                fontSize: 14,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <span>▶</span>
              <span>Play Pidgin voice note (60s demo)</span>
            </button>

            <button
              onClick={handleReset}
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
                padding: "10px 14px",
                borderRadius: "var(--radius-button)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Reset demo
            </button>
          </div>
        </section>

        {/* 2-Column Responsive Layout */}
        <section
          className="along-layout-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(340px, 1fr) minmax(380px, 1.25fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Column 1: Chat Stream & Booking Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ height: 480 }}>
              <WhatsAppSimulator
                messages={chat.messages}
                onSendMessage={(text) => chat.sendMessage(text)}
                onSendVoiceAudio={(blob, filename) => chat.sendVoiceAudio(blob, filename)}
                onSendSampleInput={(text, loc) => {
                  if (loc) chat.setActiveLocale(loc);
                  chat.sendSampleInput(text);
                }}
                onConfirmBooking={handleConfirmBooking}
                onTriggerSos={() => chat.triggerSos()}
                activeLocale={chat.activeLocale}
                isProcessing={chat.isLoading}
                elapsedSeconds={chat.elapsedSeconds}
                errorMessage={chat.errorMessage}
              />
            </div>

            {bookedPod ? (
              <RideCard
                step="BOARD"
                fareNaira={chat.currentQuote ? parseInt(chat.currentQuote.totalFare.replace(/[^0-9]/g, "")) || 1800 : 1800}
                boardingOtp={chat.currentQuote?.otp || "4817"}
                shareToken={shareToken}
                vehicleMakeModel={chat.driverInfo?.vehicleDesc || "Volkswagen Golf"}
                plateNumber={chat.driverInfo?.plateNumber || "ABJ-402-AL"}
                onConfirmBoarding={() => alert("Boarding verified with driver")}
                onTriggerSos={() => chat.triggerSos()}
              />
            ) : chat.currentQuote ? (
              <QuoteCard
                originName={chat.currentQuote.originName}
                destName={chat.currentQuote.destName}
                anchorName={chat.currentQuote.anchorName}
                fareNaira={parseInt(chat.currentQuote.unitFare.replace(/[^0-9]/g, "")) || 900}
                seats={chat.currentQuote.seats}
                onBookRide={handleConfirmBooking}
                onReset={handleReset}
                isLoading={chat.isLoading}
              />
            ) : null}
          </div>

          {/* Column 2: Sticky Corridor Map & Telemetry Inspector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <AbujaCorridorMap
              corridorId={chat.currentQuote?.corridorId || "BWR-DUT-WUS"}
              originName={chat.currentQuote?.originName || "Dutse First Gate"}
              destName={chat.currentQuote?.destName || "Berger Roundabout"}
              anchorName={chat.currentQuote?.anchorName || "A.A. Rano Dutse"}
              isLoading={chat.isLoading}
              elapsedSeconds={chat.elapsedSeconds}
            />

            <BehindTheScenes
              traces={chat.traces}
              resolverScores={formattedScores}
              fallback={chat.fallback}
              fallbackBanner={chat.fallbackBanner}
              replayMode={chat.replayMode}
              replayDate={chat.replayDate}
              onToggleReplay={chat.isReplayAvailable ? () => chat.toggleReplayMode() : undefined}
              isLoading={chat.isLoading}
              elapsedSeconds={chat.elapsedSeconds}
              errorMessage={chat.errorMessage}
            />
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
          <TransitStrip
            activeCorridorId={chat.currentQuote?.corridorId || "BWR-DUT-WUS"}
          />
          <HonestyTable />
        </section>

        <footer
          style={{
            paddingTop: 24,
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12.5,
            color: "var(--text-muted)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>Along: Meta AI Developer Hackathon Submission</div>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/" style={{ color: "var(--text-muted)" }}>
              Public view
            </Link>
            <Link href="/driver" style={{ color: "var(--text-muted)" }}>
              Driver view
            </Link>
            <Link href="/ops" style={{ color: "var(--text-muted)" }}>
              Operations (demo)
            </Link>
          </div>
        </footer>
      </main>

      <BottomTabBar activeShareToken={shareToken} />

      <style jsx global>{`
        @media (max-width: 960px) {
          .along-layout-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
