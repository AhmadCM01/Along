"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/navigation/Header";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { GuidedFlowBar } from "@/components/navigation/GuidedFlowBar";
import { WhatsAppSimulator } from "@/components/demo/WhatsAppSimulator";
import { AbujaCorridorMap } from "@/components/demo/AbujaCorridorMap";
import { BehindTheScenes } from "@/components/demo/BehindTheScenes";
import { TransitStrip, CORRIDORS_LIST } from "@/components/demo/TransitStrip";
import { HonestyTable } from "@/components/demo/HonestyTable";
import { QuoteCard } from "@/components/booking/QuoteCard";
import { RideCard } from "@/components/booking/RideCard";
import { useAlongChat } from "@/hooks/useAlongChat";
import { useAlongTrip } from "@/context/AlongTripContext";
import { playAlongVoiceNote } from "@/lib/audio";

export default function RidePage() {
  const chat = useAlongChat();
  const trip = useAlongTrip();
  const [behindTheScenesOpen, setBehindTheScenesOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Sync chat quote to global AlongTripContext
  useEffect(() => {
    if (chat.currentQuote) {
      trip.setCurrentQuote({
        corridorId: chat.currentQuote.corridorId,
        originName: chat.currentQuote.originName,
        destName: chat.currentQuote.destName,
        anchorId: chat.currentQuote.anchorId,
        anchorName: chat.currentQuote.anchorName,
        seats: chat.currentQuote.seats,
        unitFare: chat.currentQuote.unitFare,
        totalFare: chat.currentQuote.totalFare,
        otp: chat.currentQuote.otp || "4817",
        shareToken: chat.currentQuote.shareToken || "share-bwr-4817",
        podGross: chat.currentQuote.podGross,
        driverNet: chat.currentQuote.driverNet,
        platformFee: chat.currentQuote.platformFee,
      });

      if (trip.journeyStage === "IDLE") {
        trip.setJourneyStage("PROPOSAL");
      }
    }
  }, [chat.currentQuote]);

  // Audio sample playback button (plays real sound through speaker + sends voice message)
  const handlePlaySample = () => {
    setIsPlayingAudio(true);
    chat.setActiveLocale("pcm");
    trip.setActiveLocale("pcm");

    playAlongVoiceNote({
      text: "Abeg I dey Dutse first gate, two seats go Berger",
      onStart: () => setIsPlayingAudio(true),
      onEnd: () => setIsPlayingAudio(false),
    });

    chat.sendMessage("Abeg I dey Dutse first gate, two seats go Berger", true, "0:04", "Whisper ASR");
  };

  const handleConfirmBooking = () => {
    chat.confirmBooking();
    trip.confirmBooking();
  };

  const handleReset = () => {
    trip.resetAll();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const handleSelectCorridor = (corridorId: string) => {
    trip.setActiveCorridorId(corridorId);
    const item = CORRIDORS_LIST.find((c) => c.id === corridorId);
    if (item && item.samplePrompt) {
      chat.sendMessage(item.samplePrompt);
    }
  };

  // Format resolver scores for telemetry drawer
  const formattedScores = chat.resolverScores
    ? [
        ...(chat.resolverScores.originScores
          ? [
              {
                candidate: chat.resolverScores.originName,
                score: chat.resolverScores.originScores.final_score,
                corridor: trip.activeCorridorId || "BWR-DUT-WUS",
              },
            ]
          : []),
        ...(chat.resolverScores.destScores
          ? [
              {
                candidate: chat.resolverScores.destName,
                score: chat.resolverScores.destScores.final_score,
                corridor: trip.activeCorridorId || "BWR-DUT-WUS",
              },
            ]
          : []),
      ]
    : [
        { candidate: "Dutse First Gate", score: 0.94, corridor: trip.activeCorridorId || "BWR-DUT-WUS" },
        { candidate: "Berger Roundabout", score: 0.91, corridor: trip.activeCorridorId || "BWR-DUT-WUS" },
        { candidate: "Sokale Roundabout", score: 0.88, corridor: trip.activeCorridorId || "BWR-DUT-WUS" },
      ];

  const shareToken = trip.currentQuote?.shareToken || trip.activeShareToken || "share-bwr-4817";
  const isConfirmedRide = trip.journeyStage === "CONFIRMED" || trip.journeyStage === "IN_TRANSIT";

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
      {/* Universal Responsive Header */}
      <Header
        activeLocale={chat.activeLocale}
        onChangeLocale={(loc) => {
          chat.setActiveLocale(loc);
          trip.setActiveLocale(loc);
        }}
        activeShareToken={shareToken}
        behindTheScenesOpen={behindTheScenesOpen}
        onToggleBehindTheScenes={() => setBehindTheScenesOpen(!behindTheScenesOpen)}
      />

      {/* Main Interactive Work Area */}
      <main
        style={{
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
          padding: "20px 20px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Interactive Guided Flow Stepper */}
        <GuidedFlowBar />

        {/* Hero Context & Audio Demo CTA */}
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
                fontSize: "clamp(24px, 3.8vw, 34px)",
                fontWeight: 800,
                lineHeight: 1.15,
                color: "var(--text-ink)",
                margin: 0,
              }}
            >
              Book a ride by voice
            </h1>
            <p
              style={{
                fontSize: 14.5,
                color: "var(--text-muted)",
                marginTop: 6,
                marginBottom: 0,
                maxWidth: 620,
              }}
            >
              Shared 4-seat pods in Abuja with safe filling-station boarding and escrow fares.
            </p>
          </div>

          {/* Autoplay Voice Note CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={handlePlaySample}
              disabled={chat.isLoading || isPlayingAudio}
              style={{
                background: "var(--brand-primary)",
                color: "var(--brand-ink)",
                padding: "10px 18px",
                borderRadius: "var(--radius-button)",
                fontSize: 13.5,
                fontWeight: 700,
                border: "none",
                cursor: chat.isLoading || isPlayingAudio ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 2px 8px rgba(11, 110, 79, 0.25)",
              }}
            >
              <span>{isPlayingAudio ? "❚❚" : "▶"}</span>
              <span>{isPlayingAudio ? "Playing Voice Note..." : "Play Pidgin voice note"}</span>
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
                cursor: "pointer",
              }}
            >
              Reset demo
            </button>
          </div>
        </section>

        {/* 2-Column Responsive Layout (5:7 ratio) */}
        <section
          className="along-layout-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(340px, 1fr) minmax(380px, 1.25fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Column 1: WhatsApp Chat Stream & Booking Pass */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ height: 490 }}>
              <WhatsAppSimulator
                messages={chat.messages}
                onSendMessage={(text) => chat.sendMessage(text)}
                onSendVoiceAudio={(blob, filename) => chat.sendVoiceAudio(blob, filename)}
                onSendSampleInput={(text, loc) => {
                  if (loc) {
                    chat.setActiveLocale(loc);
                    trip.setActiveLocale(loc);
                  }
                  chat.sendSampleInput(text);
                }}
                onConfirmBooking={handleConfirmBooking}
                onTriggerSos={() => chat.triggerSos()}
                activeLocale={chat.activeLocale}
                onChangeLocale={(loc) => {
                  chat.setActiveLocale(loc);
                  trip.setActiveLocale(loc);
                }}
                isProcessing={chat.isLoading}
                elapsedSeconds={chat.elapsedSeconds}
                errorMessage={chat.errorMessage}
              />
            </div>

            {/* Display Confirmed Ride Card (Turn 2) or Proposal Quote (Turn 1) */}
            {isConfirmedRide ? (
              <RideCard
                step={trip.journeyStage === "IN_TRANSIT" ? "SHARE" : "BOARD"}
                fareNaira={
                  trip.currentQuote
                    ? parseInt(trip.currentQuote.totalFare.replace(/[^0-9]/g, "")) || 1800
                    : 1800
                }
                boardingOtp={trip.currentQuote?.otp || "4817"}
                shareToken={shareToken}
                vehicleMakeModel={trip.driverInfo.vehicleDesc || "Volkswagen Golf 4"}
                plateNumber={trip.driverInfo.plateNumber || "ABJ-402-AL"}
                onConfirmBoarding={() => {
                  trip.setJourneyStage("IN_TRANSIT");
                }}
                onTriggerSos={() => chat.triggerSos()}
              />
            ) : trip.currentQuote ? (
              <QuoteCard
                originName={trip.currentQuote.originName}
                destName={trip.currentQuote.destName}
                anchorName={trip.currentQuote.anchorName}
                fareNaira={parseInt(trip.currentQuote.unitFare.replace(/[^0-9]/g, "")) || 900}
                seats={trip.currentQuote.seats}
                onBookRide={handleConfirmBooking}
                onReset={handleReset}
                isLoading={chat.isLoading}
              />
            ) : null}
          </div>

          {/* Column 2: Sticky Corridor Map & Telemetry Inspector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <AbujaCorridorMap
              corridorId={trip.activeCorridorId || "BWR-DUT-WUS"}
              originName={trip.currentQuote?.originName || "Dutse First Gate"}
              destName={trip.currentQuote?.destName || "Berger Roundabout"}
              anchorName={trip.currentQuote?.anchorName || "A.A. Rano Dutse"}
              isLoading={chat.isLoading}
              elapsedSeconds={chat.elapsedSeconds}
            />

            {/* Behind The Scenes Panel (Always visible or toggleable) */}
            {(behindTheScenesOpen || true) && (
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
            )}
          </div>
        </section>

        {/* Below the Fold: Interactive 6-Corridor Strip & Honesty Table */}
        <section style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
          <TransitStrip
            activeCorridorId={trip.activeCorridorId}
            onSelectCorridor={handleSelectCorridor}
          />
          <HonestyTable />
        </section>

        {/* Footer */}
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
            <Link href="/driver" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
              Driver manifest
            </Link>
            <Link href={`/t/${shareToken}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
              Trip tracker
            </Link>
            <Link href="/ops" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
              Operations (demo)
            </Link>
          </div>
        </footer>
      </main>

      {/* Bottom Tab Bar for Mobile Devices */}
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
