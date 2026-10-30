"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CorridorNode } from "@/components/brand/CorridorNode";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { VoiceWaveformPlayer } from "@/components/icons/AlongIcons";
import { playAlongVoiceNote, stopAlongVoiceNote } from "@/lib/audio";
import { useAlongTrip } from "@/context/AlongTripContext";

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  isVoice?: boolean;
  voiceDuration?: string;
  voiceLabel?: string;
  timestamp: string;
  isConfirmed?: boolean;
  quoteData?: {
    corridorId: string;
    anchorName: string;
    destName: string;
    seats: number;
    unitFare: string;
    totalFare: string;
    otp: string;
    shareToken?: string | null;
  };
  isSos?: boolean;
}

interface WhatsAppSimulatorProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSendVoiceAudio?: (blob: Blob | File, filename?: string) => void;
  onSendSampleInput?: (text: string, locale?: "en" | "pcm" | "ha", isVoiceSample?: boolean) => void;
  onConfirmBooking: () => void;
  onTriggerSos: () => void;
  onResetChat?: () => void;
  activeLocale: "en" | "pcm" | "ha";
  onChangeLocale?: (loc: "en" | "pcm" | "ha") => void;
  isProcessing?: boolean;
  elapsedSeconds?: number;
  errorMessage?: string | null;
}

const QUICK_SCENARIOS = [
  {
    id: "pcm_dutse",
    title: "Pidgin Voice: Dutse to Berger",
    subtitle: "Abeg I dey Dutse first gate, two seats go Berger",
    shortLabel: "🎙️ Pidgin Voice Note",
    text: "Abeg I dey Dutse first gate, two seats go Berger",
    locale: "pcm" as const,
    isVoice: true,
    corridor: "BWR-DUT-WUS",
  },
  {
    id: "rel_sokale",
    title: "Landmark: Sokale to Katampe",
    subtitle: "Drop me for that Oando after Katampe bridge",
    shortLabel: "📍 Sokale to Katampe",
    text: "From Sokale roundabout, drop me for that Oando after Katampe bridge",
    locale: "en" as const,
    isVoice: false,
    corridor: "BWR-DUT-WUS",
  },
  {
    id: "ha_bwari",
    title: "Hausa: Bwari to Wuse Market",
    subtitle: "Ina Bwari zan je Kasuwar Wuse kujera biyu",
    shortLabel: "🗣️ Hausa: Bwari to Wuse",
    text: "Ina Bwari zan je Kasuwar Wuse kujera biyu",
    locale: "ha" as const,
    isVoice: false,
    corridor: "BWR-DUT-WUS",
  },
  {
    id: "lugbe_area1",
    title: "Airport Rd: Lugbe to Area 1",
    subtitle: "I dey Police signboard Lugbe, 1 seat go Area 1",
    shortLabel: "🚗 Lugbe to Area 1",
    text: "I dey Police signboard Lugbe, 1 seat go Area 1",
    locale: "pcm" as const,
    isVoice: false,
    corridor: "GWL-LUG-AR1",
  },
];

/**
 * Format WhatsApp markdown text into clean React typography without raw asterisks.
 */
function FormattedWhatsAppText({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} style={{ height: 2 }} />;

        const parts = trimmed.split(/(\*[^*]+\*)/g);
        return (
          <p key={lIdx} style={{ margin: 0, lineHeight: 1.45 }}>
            {parts.map((part, pIdx) => {
              if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
                return (
                  <strong key={pIdx} style={{ fontWeight: 700 }}>
                    {part.slice(1, -1)}
                  </strong>
                );
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Official Along Brand Avatar for WhatsApp Bot Profile
 */
function AlongBotAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#0B3B2C",
        border: "1.5px solid rgba(5, 150, 105, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        position: "relative",
        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
      }}
      aria-label="Along Official Bot Avatar"
    >
      <CorridorNode size={Math.round(size * 0.6)} variant="pickup" />
      <span
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: Math.max(10, Math.round(size * 0.28)),
          height: Math.max(10, Math.round(size * 0.28)),
          borderRadius: "50%",
          background: "#25D366",
          border: "2px solid var(--bg-surface)",
        }}
      />
    </div>
  );
}

export function WhatsAppSimulator({
  messages,
  onSendMessage,
  onSendVoiceAudio,
  onSendSampleInput,
  onConfirmBooking,
  onResetChat,
  activeLocale,
  isProcessing = false,
  errorMessage,
}: WhatsAppSimulatorProps) {
  const trip = useAlongTrip();
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [activeVoicePlayingId, setActiveVoicePlayingId] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isRecording, isProcessing]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        if (onSendVoiceAudio) {
          onSendVoiceAudio(audioBlob, "mic_recording.webm");
        }
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      alert("Microphone permission not granted. Tap the Pidgin Voice Note button to test voice input.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSendVoiceAudio) {
      onSendVoiceAudio(file, file.name);
    }
  };

  const handlePlayVoice = (msgId: string, text: string) => {
    if (activeVoicePlayingId === msgId) {
      stopAlongVoiceNote();
      setActiveVoicePlayingId(null);
      return;
    }
    setActiveVoicePlayingId(msgId);
    playAlongVoiceNote({
      text,
      onStart: () => setActiveVoicePlayingId(msgId),
      onEnd: () => setActiveVoicePlayingId(null),
    });
  };

  const handleTriggerScenario = (scn: (typeof QUICK_SCENARIOS)[number]) => {
    if (isProcessing) return;
    if (scn.isVoice) {
      setActiveVoicePlayingId("hero_sample");
      playAlongVoiceNote({
        text: scn.text,
        onStart: () => setActiveVoicePlayingId("hero_sample"),
        onEnd: () => setActiveVoicePlayingId(null),
      });
    }
    if (onSendSampleInput) {
      onSendSampleInput(scn.text, scn.locale, scn.isVoice);
    }
  };

  const isConfirmedRide = trip.journeyStage === "CONFIRMED" || trip.journeyStage === "IN_TRANSIT";
  const lastMsg = messages[messages.length - 1];
  const commuterSeat = trip.passengers.find((p) => p.isCurrentUser);
  const unifiedOtp = commuterSeat?.otpCode || trip.currentQuote?.otp || "4817";

  return (
    <div
      className="whatsapp-shell"
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--border-subtle)",
        overflow: "hidden",
        boxShadow: "var(--shadow-soft)",
      }}
      aria-label="WhatsApp Desktop and Mobile Interface"
    >
      {/* =====================================================================
          LEFT SIDEBAR: Authentic WhatsApp Web Desktop Sidebar (Hidden on Mobile)
          ===================================================================== */}
      <aside
        className="whatsapp-desktop-sidebar"
        style={{
          width: 330,
          borderRight: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-surface)",
          flexShrink: 0,
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-ink)" }}>
              Chats
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(37, 211, 102, 0.14)",
                color: "var(--brand-primary)",
              }}
            >
              WhatsApp Web
            </span>
          </div>

          {onResetChat && messages.length > 0 && (
            <button
              onClick={onResetChat}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--text-muted)",
                background: "var(--bg-paper)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Search Bar Mock */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div
            style={{
              background: "var(--bg-paper)",
              borderRadius: 10,
              padding: "7px 12px",
              fontSize: 12.5,
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🔍</span>
            <span>Search or start a corridor ride</span>
          </div>
        </div>

        {/* Pinned Active Bot Chat Item */}
        <div
          style={{
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--brand-soft)",
            borderBottom: "1px solid var(--border-subtle)",
            cursor: "pointer",
          }}
        >
          <AlongBotAvatar size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-ink)" }}>
                  Along Transit Bot
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 15,
                    height: 15,
                    borderRadius: "50%",
                    background: "#25D366",
                    color: "#fff",
                    fontSize: 9.5,
                    fontWeight: 900,
                  }}
                  title="Verified Official WhatsApp Business"
                >
                  ✓
                </span>
              </div>
              <span style={{ fontSize: 11, color: "var(--brand-primary)", fontWeight: 600 }}>
                {lastMsg ? lastMsg.timestamp : "Now"}
              </span>
            </div>

            <div
              style={{
                fontSize: 12.5,
                color: isProcessing ? "var(--brand-primary)" : "var(--text-muted)",
                fontWeight: isProcessing ? 600 : 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: 2,
              }}
            >
              {isProcessing
                ? "typing..."
                : lastMsg
                ? lastMsg.text.replace(/\*/g, "")
                : "Tap a voice note or type your Abuja destination"}
            </div>
          </div>
        </div>

        {/* 1-Tap Quick Demo Scenarios in Sidebar */}
        <div
          style={{
            padding: "12px 14px 6px",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-muted)",
          }}
        >
          Instant Test Prompts (Click to Send)
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px 10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {QUICK_SCENARIOS.map((scn) => (
            <button
              key={scn.id}
              type="button"
              onClick={() => handleTriggerScenario(scn)}
              disabled={isProcessing}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--bg-paper)",
                border: "1px solid var(--border-subtle)",
                cursor: isProcessing ? "not-allowed" : "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                transition: "all 150ms ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-ink)" }}>
                  {scn.shortLabel}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 6,
                    background: "var(--bg-surface)",
                    color: "var(--brand-primary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {scn.corridor}
                </span>
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                &ldquo;{scn.subtitle}&rdquo;
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* =====================================================================
          RIGHT MAIN PANE: Active WhatsApp Conversation Viewport
          ===================================================================== */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minWidth: 0,
        }}
      >
        {/* Active Chat Top Header */}
        <header
          style={{
            background: "var(--bg-surface)",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-subtle)",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <AlongBotAvatar size={38} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 14.5,
                    color: "var(--text-ink)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Along Transit Bot
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 15,
                    height: 15,
                    borderRadius: "50%",
                    background: "#25D366",
                    color: "#fff",
                    fontSize: 9.5,
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: isProcessing ? "#25D366" : "var(--text-muted)",
                  fontWeight: isProcessing ? 700 : 500,
                }}
              >
                {isProcessing
                  ? "typing..."
                  : `Online · Abuja Corridor AI (${
                      activeLocale === "pcm" ? "Pidgin" : activeLocale === "ha" ? "Hausa" : "English"
                    })`}
              </div>
            </div>
          </div>

          {/* Right Header Action: 1-Tap Native Nigerian Pidgin Voice Note */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => handleTriggerScenario(QUICK_SCENARIOS[0])}
              disabled={isProcessing}
              style={{
                background: "#25D366",
                color: "#0B141A",
                border: "none",
                borderRadius: 999,
                padding: "7px 14px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: isProcessing ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 8px rgba(37, 211, 102, 0.28)",
              }}
            >
              <span>{activeVoicePlayingId === "hero_sample" ? "❚❚" : "▶"}</span>
              <span>Play Pidgin Voice</span>
            </button>
          </div>
        </header>

        {/* WhatsApp Chat Wallpaper & Messages Stream */}
        <div
          ref={chatScrollRef}
          className="along-chat-body"
          style={{
            flex: 1,
            padding: "16px 18px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Encryption Notice Pill */}
          <div
            style={{
              alignSelf: "center",
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
              fontSize: 11,
              fontWeight: 500,
              padding: "5px 12px",
              borderRadius: 10,
              border: "1px solid var(--border-subtle)",
              textAlign: "center",
              maxWidth: 420,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            🔒 Messages and voice notes are end-to-end encrypted. Fares are protected in atomic escrow until boarding OTP verification.
          </div>

          {/* Empty State Onboarding Card inside Chat */}
          {messages.length === 0 && !isProcessing && (
            <div
              className="along-bubble-bot"
              style={{
                alignSelf: "flex-start",
                maxWidth: 420,
                padding: "12px 16px",
                borderRadius: "2px 14px 14px 14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                fontSize: 13.5,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--brand-primary)", marginBottom: 4 }}>
                Along Transit Concierge 👋🏾
              </div>
              <div>
                Welcome! Send a <strong>voice note</strong> or type where you are heading in{" "}
                <strong>Pidgin, Hausa, or English</strong>. We match you to a safe filling-station forecourt pod in seconds.
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  textAlign: "right",
                }}
              >
                Just now
              </div>
            </div>
          )}

          {/* Rendered Conversation Messages */}
          {messages.map((m) => {
            const isUser = m.sender === "user";
            const isVoicePlaying = activeVoicePlayingId === m.id;
            const isConfirmationMsg =
              m.isConfirmed ||
              m.text.toLowerCase().includes("pooling") ||
              m.text.toLowerCase().includes("lock") && isConfirmedRide;

            return (
              <div
                key={m.id}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "min(86%, 460px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <div
                  className={isUser ? "along-bubble-user" : "along-bubble-bot"}
                  style={{
                    padding: "10px 14px 8px",
                    fontSize: 14,
                    lineHeight: 1.45,
                    borderRadius: isUser ? "14px 2px 14px 14px" : "2px 14px 14px 14px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    position: "relative",
                  }}
                >
                  {/* Native Nigerian Voice Note Waveform Player */}
                  {m.isVoice && (
                    <div style={{ marginBottom: 8 }}>
                      <VoiceWaveformPlayer
                        isPlaying={isVoicePlaying}
                        onTogglePlay={() => handlePlayVoice(m.id, m.text)}
                        duration={m.voiceDuration || "0:04"}
                      />
                    </div>
                  )}

                  {/* Message Text */}
                  <FormattedWhatsAppText text={m.text} />

                  {/* TURN 1: Embedded WhatsApp Business Quote Card */}
                  {m.quoteData && !isConfirmedRide && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "12px",
                        background: "var(--bg-paper)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--brand-primary)",
                            background: "var(--brand-soft)",
                            padding: "2px 8px",
                            borderRadius: 6,
                          }}
                        >
                          {m.quoteData.corridorId} · Safe Forecourt
                        </span>
                        <DepartureNumeral size="sm" variant="brand">
                          {m.quoteData.totalFare}
                        </DepartureNumeral>
                      </div>

                      <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>Pickup: </span>
                          <strong>{m.quoteData.anchorName}</strong>
                        </div>
                        <div style={{ marginTop: 2 }}>
                          <span style={{ color: "var(--text-muted)" }}>Drop-off: </span>
                          <strong>{m.quoteData.destName}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={onConfirmBooking}
                        disabled={isProcessing}
                        style={{
                          marginTop: 4,
                          background: "#25D366",
                          color: "#0B141A",
                          borderRadius: 10,
                          border: "none",
                          padding: "10px 14px",
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          boxShadow: "0 2px 6px rgba(37, 211, 102, 0.25)",
                        }}
                      >
                        <span>✓ Confirm & Lock {m.quoteData.seats} Seats ({m.quoteData.totalFare})</span>
                      </button>
                    </div>
                  )}

                  {/* TURN 2: Confirmed Boarding Pass Card inside WhatsApp */}
                  {m.quoteData && (isConfirmedRide || isConfirmationMsg) && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "12px 14px",
                        background: "var(--bg-paper)",
                        border: "1.5px solid var(--brand-primary)",
                        borderRadius: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand-primary)" }}>
                            BOARDING PASS · POD-842A
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-ink)" }}>
                            Musa Bello · {trip.driverInfo.plateNumber}
                          </div>
                        </div>

                        <div
                          style={{
                            background: "var(--signal-soft)",
                            border: "1px solid var(--signal-amber)",
                            borderRadius: 8,
                            padding: "4px 10px",
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--signal-ink)" }}>
                            BOARDING OTP
                          </div>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 900,
                              fontFamily: "var(--font-mono)",
                              letterSpacing: "0.1em",
                              color: "var(--signal-ink)",
                            }}
                          >
                            {unifiedOtp}
                          </div>
                        </div>
                      </div>

                      <Link
                        href="/driver"
                        style={{
                          textDecoration: "none",
                          background: "var(--brand-primary)",
                          color: "#FFFFFF",
                          borderRadius: 10,
                          padding: "10px 14px",
                          fontSize: 13,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <span>Next: Verify OTP ({unifiedOtp}) on Driver Screen</span>
                        <span>➔</span>
                      </Link>
                    </div>
                  )}

                  {/* Timestamp & WhatsApp Double Checkmarks inside Bubble Corner */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4,
                      fontSize: 10.5,
                      color: "var(--text-muted)",
                    }}
                  >
                    <span>{m.timestamp}</span>
                    {isUser && <span style={{ color: "#34B7F1", fontWeight: 700 }}>✓✓</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Authentic WhatsApp 3-Dot Typing Bubble (No Debug Timer) */}
          {isProcessing && (
            <div
              className="along-bubble-bot"
              style={{
                alignSelf: "flex-start",
                borderRadius: "2px 14px 14px 14px",
                padding: "12px 16px",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
              aria-label="Along Transit Bot is typing"
            >
              <span className="wa-typing-dot" style={{ animationDelay: "0ms" }} />
              <span className="wa-typing-dot" style={{ animationDelay: "160ms" }} />
              <span className="wa-typing-dot" style={{ animationDelay: "320ms" }} />
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                background: "var(--danger-soft)",
                border: "1px solid var(--danger-red)",
                color: "var(--danger-red)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 12.5,
                fontWeight: 600,
                alignSelf: "center",
              }}
            >
              {errorMessage}
            </div>
          )}
        </div>

        {/* Mobile Quick Prompt Pills (Wrapped cleanly, zero scrollbar) */}
        <div
          className="whatsapp-mobile-prompts"
          style={{
            display: "none",
            flexWrap: "wrap",
            gap: 6,
            padding: "8px 12px",
            background: "var(--bg-surface)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          {QUICK_SCENARIOS.slice(0, 3).map((scn) => (
            <button
              key={scn.id}
              type="button"
              onClick={() => handleTriggerScenario(scn)}
              disabled={isProcessing}
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                background: "var(--bg-paper)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-ink)",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {scn.shortLabel}
            </button>
          ))}
        </div>

        {/* WhatsApp Bottom Composer Bar */}
        <footer
          style={{
            padding: "10px 14px",
            background: "var(--bg-surface)",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="audio/*"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-paper)",
              color: "var(--text-muted)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="Attach voice note file"
            aria-label="Attach voice note file"
          >
            +
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording
                ? `Recording voice note (${recordSeconds}s)...`
                : "Type a message in Pidgin, Hausa, or English"
            }
            disabled={isRecording || isProcessing}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-paper)",
              color: "var(--text-ink)",
              fontSize: 14,
              outline: "none",
            }}
          />

          {inputText.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={isProcessing}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "none",
                background: "#25D366",
                color: "#0B141A",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 800,
                cursor: "pointer",
                flexShrink: 0,
              }}
              aria-label="Send message"
            >
              ➔
            </button>
          ) : (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "none",
                background: isRecording ? "var(--danger-red)" : "#25D366",
                color: isRecording ? "#FFFFFF" : "#0B141A",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                cursor: "pointer",
                flexShrink: 0,
              }}
              title={isRecording ? "Stop recording" : "Record voice note"}
              aria-label={isRecording ? "Stop recording" : "Record voice note"}
            >
              {isRecording ? "■" : "🎙️"}
            </button>
          )}
        </footer>
      </div>

      <style jsx global>{`
        [data-theme="light"] .along-chat-body {
          background-color: #EFEAE2 !important;
          background-image: radial-gradient(#DFD8CE 1px, transparent 1px);
          background-size: 18px 18px;
        }
        [data-theme="dark"] .along-chat-body {
          background-color: #0B141A !important;
          background-image: radial-gradient(#182229 1px, transparent 1px);
          background-size: 18px 18px;
        }

        [data-theme="light"] .along-bubble-user {
          background: #D9FDD3 !important;
          color: #111B21 !important;
          border: 1px solid rgba(18, 140, 126, 0.14) !important;
        }
        [data-theme="dark"] .along-bubble-user {
          background: #005C4B !important;
          color: #E9EDEF !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        [data-theme="light"] .along-bubble-bot {
          background: #FFFFFF !important;
          color: #111B21 !important;
          border: 1px solid #E2E0D8 !important;
        }
        [data-theme="dark"] .along-bubble-bot {
          background: #202C33 !important;
          color: #E9EDEF !important;
          border: 1px solid #2A3942 !important;
        }

        .wa-typing-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: #25D366;
          display: inline-block;
          animation: waBounce 1.1s infinite ease-in-out;
        }

        @keyframes waBounce {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.45;
          }
          40% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }

        @media (max-width: 840px) {
          .whatsapp-desktop-sidebar {
            display: none !important;
          }
          .whatsapp-mobile-prompts {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
