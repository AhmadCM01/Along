"use client";

import React, { useEffect, useRef, useState } from "react";
import { CorridorNode } from "@/components/brand/CorridorNode";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  isVoice?: boolean;
  voiceDuration?: string;
  voiceLabel?: string;
  timestamp: string;
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

export function WhatsAppSimulator({
  messages,
  onSendMessage,
  onSendVoiceAudio,
  onSendSampleInput,
  onConfirmBooking,
  onTriggerSos,
  activeLocale,
  isProcessing = false,
  elapsedSeconds,
  errorMessage,
}: WhatsAppSimulatorProps) {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

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

  const startRecording = async () => {
    chunksRef.current = [];
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.start();
        setIsRecording(true);
        setRecordSeconds(0);
        timerRef.current = setInterval(() => {
          setRecordSeconds((s) => s + 1);
        }, 1000);
      } else {
        alert("Audio recording is not supported in this browser.");
      }
    } catch {
      alert("Microphone permission denied or audio device not found.");
    }
  };

  const stopRecordingAndSend = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.onstop = () => {
        const mime = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
        if (onSendVoiceAudio) {
          onSendVoiceAudio(audioBlob, "voice_note.webm");
        }
      };
      recorder.stop();
    }
    setIsRecording(false);
    setRecordSeconds(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSendVoiceAudio) {
      onSendVoiceAudio(file, file.name);
      e.target.value = "";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--border-subtle)",
        overflow: "hidden",
        boxShadow: "var(--shadow-soft)",
      }}
      aria-label="WhatsApp Bot Chat Simulator"
    >
      {/* Bot Chat Header */}
      <header
        style={{
          background: "var(--bg-paper)",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CorridorNode size={22} variant="pickup" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-ink)" }}>
              Along Transit Bot
            </div>
            <div style={{ fontSize: 11.5, color: "var(--brand-primary)", fontWeight: 600 }}>
              Live WhatsApp Bot Pipeline · {activeLocale === "pcm" ? "Nigerian Pidgin" : activeLocale === "ha" ? "Hausa" : "English"}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
          Verified Service
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div
        ref={chatScrollRef}
        style={{
          flex: 1,
          padding: "16px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "var(--bg-paper)",
        }}
      >
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div
              key={m.id}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "85%",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  background: isUser ? "var(--brand-soft)" : "var(--bg-surface)",
                  color: "var(--text-ink)",
                  border: `1px solid ${isUser ? "rgba(11, 110, 79, 0.25)" : "var(--border-subtle)"}`,
                  borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  padding: "10px 14px",
                  fontSize: 14.5,
                  lineHeight: 1.45,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                {/* Voice Note Pill */}
                {m.isVoice && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "var(--brand-primary)",
                    }}
                  >
                    <span>🎙️ Voice Note</span>
                    <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                      Non-Meta ASR (Whisper)
                    </span>
                  </div>
                )}

                <div>{m.text}</div>

                {/* Embedded Quote Card if returned */}
                {m.quoteData && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      background: "var(--bg-paper)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-input)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Corridor {m.quoteData.corridorId}
                      </span>
                      <DepartureNumeral size="sm" variant="brand">
                        {m.quoteData.totalFare}
                      </DepartureNumeral>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      Pickup: {m.quoteData.anchorName}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                      Drop: {m.quoteData.destName}
                    </div>

                    <button
                      onClick={onConfirmBooking}
                      disabled={isProcessing}
                      style={{
                        marginTop: 4,
                        background: "var(--brand-primary)",
                        color: "var(--brand-ink)",
                        borderRadius: "var(--radius-button)",
                        padding: "8px 14px",
                        fontSize: 13,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      Book this pod ({m.quoteData.totalFare})
                    </button>
                  </div>
                )}
              </div>

              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--text-muted)",
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  padding: "0 4px",
                }}
              >
                {m.timestamp}
              </div>
            </div>
          );
        })}

        {/* Processing Indicator */}
        {isProcessing && (
          <div
            style={{
              alignSelf: "flex-start",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px 12px 12px 2px",
              padding: "8px 14px",
              fontSize: 12.5,
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
              padding: "5px 10px",
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
          disabled={isProcessing || isRecording}
          style={{
            width: 38,
            height: 38,
            minHeight: 38,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-paper)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "50%",
            fontSize: 15,
            color: "var(--text-muted)",
          }}
          aria-label="Upload recorded voice note"
          title="Upload voice audio"
        >
          📎
        </button>

        {/* Recording or Text Input */}
        {isRecording ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--danger-soft)",
              border: "1px solid var(--danger-red)",
              borderRadius: "var(--radius-input)",
              padding: "6px 12px",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--danger-red)", fontWeight: 700 }}>
              🔴 Recording ({recordSeconds}s)...
            </span>
            <button
              onClick={stopRecordingAndSend}
              style={{
                background: "var(--danger-red)",
                color: "var(--danger-ink)",
                border: "none",
                borderRadius: "var(--radius-chip)",
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Send audio
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your trip in English, Pidgin, or Hausa..."
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "var(--radius-input)",
              background: "var(--bg-paper)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-ink)",
              fontSize: 14,
              outline: "none",
            }}
          />
        )}

        {/* Mic Button (MediaRecorder API) */}
        {!isRecording && (
          <button
            onClick={startRecording}
            disabled={isProcessing}
            style={{
              width: 38,
              height: 38,
              minHeight: 38,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-paper)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "50%",
              fontSize: 15,
              color: "var(--brand-primary)",
            }}
            aria-label="Record voice note"
            title="Record audio"
          >
            🎙️
          </button>
        )}

        {/* Send Button */}
        {!isRecording && (
          <button
            onClick={handleSend}
            disabled={isProcessing || !inputText.trim()}
            style={{
              width: 38,
              height: 38,
              minHeight: 38,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: inputText.trim() ? "var(--brand-primary)" : "var(--bg-paper)",
              color: inputText.trim() ? "var(--brand-ink)" : "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "50%",
              fontSize: 15,
              cursor: inputText.trim() ? "pointer" : "default",
            }}
            aria-label="Send message"
          >
            ➔
          </button>
        )}
      </footer>
    </div>
  );
}
