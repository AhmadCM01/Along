"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CorridorNode } from "@/components/brand/CorridorNode";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import { VoiceWaveformPlayer } from "@/components/icons/AlongIcons";
import { playAlongVoiceNote } from "@/lib/audio";
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
  onSendSampleInput?: (text: string, locale?: "en" | "pcm" | "ha") => void;
  onConfirmBooking: () => void;
  onTriggerSos: () => void;
  activeLocale: "en" | "pcm" | "ha";
  onChangeLocale?: (loc: "en" | "pcm" | "ha") => void;
  isProcessing?: boolean;
  elapsedSeconds?: number;
  errorMessage?: string | null;
}

const SAMPLE_CHIPS = [
  {
    id: "pcm_dutse",
    label: "Pidgin: Dutse to Berger",
    text: "Abeg I dey Dutse first gate, two seats go Berger",
    locale: "pcm" as const,
  },
  {
    id: "rel_sokale",
    label: "Landmark: Sokale to Katampe Oando",
    text: "From Sokale roundabout, drop me for that Oando after Katampe bridge",
    locale: "en" as const,
  },
  {
    id: "ha_bwari",
    label: "Hausa: Bwari to Wuse",
    text: "Ina Bwari zan je Kasuwar Wuse kujera biyu",
    locale: "ha" as const,
  },
];

/**
 * Format raw WhatsApp markdown text into styled React nodes without raw asterisks.
 */
function FormattedWhatsAppText({ text }: { text: string }) {
  if (!text) return null;

  // Split text by lines
  const lines = text.split("\n");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} style={{ height: 4 }} />;

        // Replace *bold* markers with <strong> tags
        const parts = trimmed.split(/(\*[^*]+\*)/g);

        return (
          <p key={lIdx} style={{ margin: 0, lineHeight: 1.45 }}>
            {parts.map((part, pIdx) => {
              if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
                const boldContent = part.slice(1, -1);
                return (
                  <strong key={pIdx} style={{ fontWeight: 700 }}>
                    {boldContent}
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

export function WhatsAppSimulator({
  messages,
  onSendMessage,
  onSendVoiceAudio,
  onSendSampleInput,
  onConfirmBooking,
  onTriggerSos,
  activeLocale,
  onChangeLocale,
  isProcessing = false,
  elapsedSeconds,
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
      alert("Microphone permission not granted. Use the sample input chips or upload an audio file.");
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

  const isConfirmedRide = trip.journeyStage === "CONFIRMED" || trip.journeyStage === "IN_TRANSIT";

  return (
    <div
      className="along-whatsapp-window"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--border-subtle)",
        overflow: "hidden",
        boxShadow: "var(--shadow-soft)",
      }}
      aria-label="WhatsApp Bot Chat Simulator"
    >
      {/* Bot Chat Header (Authentic WhatsApp Green Accent) */}
      <header
        style={{
          background: "var(--bg-surface)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--brand-primary)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            A
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-ink)" }}>
                Along Transit Bot
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 8,
                  background: "rgba(11, 110, 79, 0.12)",
                  color: "var(--brand-primary)",
                  fontWeight: 700,
                }}
              >
                ✓ Verified
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Meta Llama 3.1-70B · {activeLocale === "pcm" ? "Nigerian Pidgin" : activeLocale === "ha" ? "Hausa" : "English"}
            </div>
          </div>
        </div>

        {/* Compact In-Chat Language Selector */}
        {onChangeLocale && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              background: "var(--bg-paper)",
              padding: "2px 4px",
              borderRadius: "var(--radius-chip)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {(["en", "pcm", "ha"] as const).map((loc) => (
              <button
                key={loc}
                onClick={() => onChangeLocale(loc)}
                style={{
                  padding: "2px 6px",
                  borderRadius: "var(--radius-chip)",
                  fontSize: 11,
                  fontWeight: activeLocale === loc ? 700 : 500,
                  background: activeLocale === loc ? "var(--brand-primary)" : "transparent",
                  color: activeLocale === loc ? "#fff" : "var(--text-muted)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {loc.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Messages Scroll Area with WhatsApp Chat Wallpaper */}
      <div
        ref={chatScrollRef}
        className="along-chat-body"
        style={{
          flex: 1,
          padding: "16px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Welcome / Context Pill */}
        <div
          style={{
            alignSelf: "center",
            background: "var(--bg-surface)",
            color: "var(--text-muted)",
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: 12,
            border: "1px solid var(--border-subtle)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          🔒 End-to-end encrypted · Abuja Transit Corridor
        </div>

        {messages.map((m) => {
          const isUser = m.sender === "user";
          const isVoicePlaying = activeVoicePlayingId === m.id;

          return (
            <div
              key={m.id}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "88%",
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <div
                className={isUser ? "along-bubble-user" : "along-bubble-bot"}
                style={{
                  padding: "10px 14px",
                  fontSize: 14,
                  lineHeight: 1.45,
                  borderRadius: isUser ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                {/* Voice Note Player Pill */}
                {m.isVoice && (
                  <div style={{ marginBottom: 8 }}>
                    <VoiceWaveformPlayer
                      isPlaying={isVoicePlaying}
                      onTogglePlay={() => handlePlayVoice(m.id, m.text)}
                      duration={m.voiceDuration || "0:04"}
                    />
                  </div>
                )}

                {/* Formatted Message Content (No Raw Asterisks) */}
                <FormattedWhatsAppText text={m.text} />

                {/* Interactive Action: Lock Seats Button on Quote Proposals */}
                {m.quoteData && !isConfirmedRide && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      background: "var(--bg-paper)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                        Corridor {m.quoteData.corridorId}
                      </span>
                      <DepartureNumeral size="sm" variant="brand">
                        {m.quoteData.totalFare}
                      </DepartureNumeral>
                    </div>

                    <div style={{ fontSize: 12.5 }}>
                      <strong>Pickup:</strong> {m.quoteData.anchorName}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                      <strong>Drop-off:</strong> {m.quoteData.destName}
                    </div>

                    <button
                      onClick={onConfirmBooking}
                      disabled={isProcessing}
                      style={{
                        marginTop: 4,
                        background: "var(--brand-primary)",
                        color: "var(--brand-ink)",
                        borderRadius: "var(--radius-button)",
                        border: "none",
                        padding: "10px 14px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        boxShadow: "0 2px 6px rgba(11, 110, 79, 0.25)",
                      }}
                    >
                      <span>🔒</span>
                      <span>Lock 2 Seats ({m.quoteData.totalFare} in Escrow)</span>
                    </button>
                  </div>
                )}

                {/* Confirmed Ride CTA Buttons (Switch to Driver / Tracker) */}
                {(isConfirmedRide || m.isConfirmed) && m.quoteData && (
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <Link
                      href="/driver"
                      style={{
                        flex: 1,
                        minWidth: 130,
                        textDecoration: "none",
                        background: "var(--bg-paper)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-button)",
                        padding: "8px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-ink)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <span>📋 Driver View</span>
                    </Link>

                    <Link
                      href={`/t/${trip.activeShareToken}`}
                      style={{
                        flex: 1,
                        minWidth: 130,
                        textDecoration: "none",
                        background: "var(--brand-soft)",
                        border: "1px solid rgba(11, 110, 79, 0.25)",
                        borderRadius: "var(--radius-button)",
                        padding: "8px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--brand-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <span>🛡️ Live Tracker</span>
                    </Link>
                  </div>
                )}
              </div>

              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--text-muted)",
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  padding: "0 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>{m.timestamp}</span>
                {isUser && <span style={{ color: "var(--brand-primary)", fontSize: 12 }}>✓✓</span>}
              </div>
            </div>
          );
        })}

        {/* Processing Indicator */}
        {isProcessing && (
          <div
            className="along-bubble-bot"
            style={{
              alignSelf: "flex-start",
              borderRadius: "14px 14px 14px 2px",
              padding: "10px 14px",
              fontSize: 13,
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CorridorNode size={14} variant="loading" />
            <span>Processing request ({elapsedSeconds || 1}s)...</span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div
            style={{
              background: "var(--danger-soft)",
              border: "1px solid var(--danger-red)",
              color: "var(--danger-red)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {errorMessage}
          </div>
        )}
      </div>

      {/* Quick Sample Input Chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "8px 12px",
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--border-subtle)",
          overflowX: "auto",
        }}
      >
        {SAMPLE_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => onSendSampleInput && onSendSampleInput(chip.text, chip.locale)}
            disabled={isProcessing}
            style={{
              whiteSpace: "nowrap",
              padding: "5px 12px",
              borderRadius: "var(--radius-chip)",
              background: "var(--bg-paper)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-ink)",
              fontSize: 12,
              fontWeight: 600,
              cursor: isProcessing ? "not-allowed" : "pointer",
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Action Bar */}
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

        {/* Upload Audio Button */}
        <button
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
            fontSize: 16,
            cursor: "pointer",
          }}
          title="Upload audio note"
          aria-label="Upload audio note"
        >
          📎
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? `Recording audio (${recordSeconds}s)...` : "Type trip in Pidgin, Hausa, English..."}
          disabled={isRecording || isProcessing}
          style={{
            flex: 1,
            padding: "9px 14px",
            borderRadius: "var(--radius-input)",
            border: "1px solid var(--border-strong)",
            background: "var(--bg-paper)",
            color: "var(--text-ink)",
            fontSize: 14,
            outline: "none",
          }}
        />

        {/* Voice Note Record / Stop Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            border: "none",
            background: isRecording ? "var(--danger-red)" : "var(--brand-soft)",
            color: isRecording ? "#fff" : "var(--brand-primary)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
          title={isRecording ? "Stop recording" : "Record voice note"}
          aria-label={isRecording ? "Stop recording" : "Record voice note"}
        >
          {isRecording ? "■" : "🎙️"}
        </button>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isProcessing}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            border: "none",
            background: "var(--brand-primary)",
            color: "var(--brand-ink)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            cursor: !inputText.trim() || isProcessing ? "not-allowed" : "pointer",
            opacity: !inputText.trim() || isProcessing ? 0.4 : 1,
          }}
          title="Send message"
          aria-label="Send message"
        >
          ➔
        </button>
      </footer>

      {/* WhatsApp authentic theme styling */}
      <style jsx global>{`
        [data-theme="light"] .along-chat-body {
          background-color: #EFEAE2 !important;
          background-image: radial-gradient(#E2DAD0 1px, transparent 1px);
          background-size: 16px 16px;
        }
        [data-theme="dark"] .along-chat-body {
          background-color: #0B141A !important;
          background-image: radial-gradient(#152028 1px, transparent 1px);
          background-size: 16px 16px;
        }

        [data-theme="light"] .along-bubble-user {
          background: #D9FDD3 !important;
          color: #111B21 !important;
          border: 1px solid rgba(18, 140, 126, 0.15) !important;
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
      `}</style>
    </div>
  );
}
