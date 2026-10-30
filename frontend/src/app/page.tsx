"use client";

import React, { useEffect } from "react";
import { Header } from "@/components/navigation/Header";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { WhatsAppSimulator } from "@/components/demo/WhatsAppSimulator";
import { useAlongChat } from "@/hooks/useAlongChat";
import { useAlongTrip } from "@/context/AlongTripContext";

export default function RidePage() {
  const chat = useAlongChat();
  const trip = useAlongTrip();

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

  const handleConfirmBooking = () => {
    chat.confirmBooking();
    trip.confirmBooking();
  };

  const handleReset = () => {
    trip.resetAll();
  };

  const shareToken = trip.currentQuote?.shareToken || trip.activeShareToken || "share-bwr-4817";

  return (
    <div
      style={{
        height: "100dvh",
        background: "var(--bg-paper)",
        color: "var(--text-ink)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top Journey Navigation & AI X-Ray Drawer Trigger */}
      <Header activeShareToken={shareToken} />

      {/* Main Viewport: Full-Craft WhatsApp Desktop (Split-Pane) & Mobile (Full-Bleed) */}
      <main
        className="ride-whatsapp-stage"
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1240,
          margin: "0 auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <WhatsAppSimulator
          messages={chat.messages}
          onSendMessage={(text) => chat.sendMessage(text)}
          onSendVoiceAudio={(blob, filename) => chat.sendVoiceAudio(blob, filename)}
          onSendSampleInput={(text, loc, isVoice) => {
            if (loc) {
              chat.setActiveLocale(loc);
              trip.setActiveLocale(loc);
            }
            chat.sendSampleInput(text, Boolean(isVoice));
          }}
          onConfirmBooking={handleConfirmBooking}
          onTriggerSos={() => chat.triggerSos()}
          onResetChat={handleReset}
          activeLocale={chat.activeLocale}
          onChangeLocale={(loc) => {
            chat.setActiveLocale(loc);
            trip.setActiveLocale(loc);
          }}
          isProcessing={chat.isLoading}
          elapsedSeconds={chat.elapsedSeconds}
          errorMessage={chat.errorMessage}
        />
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomTabBar activeShareToken={shareToken} />

      <style jsx global>{`
        @media (max-width: 768px) {
          .ride-whatsapp-stage {
            padding: 0 0 60px 0 !important;
            max-width: 100% !important;
          }
          .ride-whatsapp-stage .whatsapp-shell {
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
          }
        }
      `}</style>
    </div>
  );
}
