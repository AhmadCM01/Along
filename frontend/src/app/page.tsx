"use client";

import React, { useEffect } from "react";
import { Header } from "@/components/navigation/Header";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { WhatsAppSimulator } from "@/components/demo/WhatsAppSimulator";
import { useAlongChat } from "@/hooks/useAlongChat";
import { useAlongTrip } from "@/context/AlongTripContext";
import { pingBackendHealth } from "@/lib/api";

export default function RidePage() {
  const chat = useAlongChat();
  const trip = useAlongTrip();
  const [wakingSeconds, setWakingSeconds] = React.useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const startMs = Date.now();
    let timerId: NodeJS.Timeout | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    const checkHealth = async () => {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      if (elapsed > 90) {
        if (intervalId) clearInterval(intervalId);
        return;
      }
      try {
        const health = await pingBackendHealth();
        if (!mounted) return;
        if (health.status === "ok") {
          setWakingSeconds(null);
          if (intervalId) clearInterval(intervalId);
          if (timerId) clearTimeout(timerId);
          return;
        }
      } catch {
        // Continue retrying
      }

      const realSec = Math.max(1, Math.floor((Date.now() - startMs) / 1000));
      if (mounted) {
        setWakingSeconds(realSec);
      }
    };

    // If healthz takes longer than 1.5s, display neutral waking line
    timerId = setTimeout(() => {
      if (mounted) {
        setWakingSeconds(Math.max(1, Math.floor((Date.now() - startMs) / 1000)));
      }
    }, 1500);

    checkHealth();
    intervalId = setInterval(checkHealth, 3000);

    return () => {
      mounted = false;
      if (timerId) clearTimeout(timerId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

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
        shareToken: chat.currentQuote.shareToken || "",
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
    chat.resetChat();
  };

  const shareToken = trip.currentQuote?.shareToken || trip.activeShareToken || "";

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

      {wakingSeconds !== null && (
        <div
          style={{
            background: "var(--bg-paper)",
            color: "var(--text-muted)",
            padding: "6px 16px",
            fontSize: 12,
            textAlign: "center",
            fontWeight: 500,
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          Waking the demo server... {wakingSeconds}s
        </div>
      )}

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
          onSendVoiceAudio={(blob, filename, clientTranscript, durationStr, audioUrl) =>
            chat.sendVoiceAudio(blob, filename, clientTranscript, durationStr, audioUrl)
          }
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
          currentPhone={chat.phone}
          onSwitchCommuter={chat.switchCommuter}
          onChangeLocale={(loc) => {
            chat.setActiveLocale(loc);
            trip.setActiveLocale(loc);
          }}
          isProcessing={chat.isLoading}
          elapsedSeconds={chat.elapsedSeconds}
          errorMessage={chat.errorMessage}
          onRetry={() => chat.retryLastMessage()}
          fallbackBanner={chat.fallbackBanner}
          isOfflineSample={chat.isOfflineReplay}
        />
      </main>

      {/* Footer Disclaimer */}
      <footer
        className="ride-desktop-footer"
        style={{
          textAlign: "center",
          padding: "6px 16px 8px",
          fontSize: 11,
          color: "var(--text-muted)",
          background: "var(--bg-paper)",
          borderTop: "1px solid var(--border-subtle)",
          zIndex: 10,
        }}
      >
        Academic prototype for Meta AI Hackathon 2026. Illustrative commuter transit simulation. Along is an independent project and is not affiliated with or endorsed by WhatsApp or Meta.
      </footer>

      {/* Mobile Bottom Navigation */}
      <BottomTabBar activeShareToken={shareToken} />

      <style jsx global>{`
        @media (max-width: 768px) {
          .ride-whatsapp-stage {
            padding: 0 0 56px 0 !important;
            max-width: 100% !important;
          }
          .ride-desktop-footer {
            display: none !important;
          }
          .ride-whatsapp-stage .whatsapp-shell {
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
            border-bottom: none !important;
          }
        }
      `}</style>
    </div>
  );
}
