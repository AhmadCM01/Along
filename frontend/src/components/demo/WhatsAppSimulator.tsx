"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  PauseCircleIcon,
  PlayCircleIcon,
  ShieldCheckIcon,
  VoiceWaveIcon,
  WhatsAppDoubleCheckIcon,
  WhatsAppLockIcon,
  WhatsAppMicIcon,
  WhatsAppPaperclipIcon,
  WhatsAppPhoneCallIcon,
  WhatsAppSendIcon,
  WhatsAppSmileyIcon,
  WhatsAppVideoCallIcon,
} from "@/components/icons/AlongIcons";

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  isVoice?: boolean;
  voiceDuration?: string;
  timestamp: string;
  quoteData?: {
    corridorId: string;
    anchorName: string;
    destName: string;
    seats: number;
    unitFare: string;
    totalFare: string;
    otp: string;
  };
  isSos?: boolean;
}

interface WhatsAppSimulatorProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, isVoice?: boolean) => void;
  onConfirmBooking: () => void;
  onTriggerSos: () => void;
  activeLocale: "en" | "pcm" | "ha";
  onChangeLocale: (loc: "en" | "pcm" | "ha") => void;
  isProcessing?: boolean;
}

const QUICK_SAMPLES = [
  {
    id: "sample_pcm",
    label: "Pidgin Voice Note",
    text: "Abeg I dey Dutse first gate, two seats go Berger",
    locale: "pcm" as const,
  },
  {
    id: "sample_ha",
    label: "Hausa Voice Note",
    text: "Ina Bwari zan je Kasuwar Wuse kujera biyu",
    locale: "ha" as const,
  },
  {
    id: "sample_rel",
    label: "Relational English",
    text: "From Sokale roundabout, drop me for that Oando after Katampe bridge",
    locale: "en" as const,
  },
];

export function WhatsAppSimulator({
  messages,
  onSendMessage,
  onConfirmBooking,
  onTriggerSos,
  activeLocale,
  onChangeLocale,
  isProcessing = false,
}: WhatsAppSimulatorProps) {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isProcessing) {
      setElapsedSec(1);
      interval = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSec(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isRecording]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed, false);
    setInputText("");
  };

  const startRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.start();
      }
    } catch {
      // Browser microphone permission fallback for local simulation
    }
    setIsRecording(true);
    setRecordSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordSeconds((sec) => sec + 1);
    }, 1000);
  };

  const stopRecordingAndSend = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      } catch {
        // Safe cleanup
      }
    }
    setIsRecording(false);
    // Submit as recorded voice note
    const sampleText =
      activeLocale === "ha"
        ? "Ina Bwari zan je Kasuwar Wuse kujera biyu"
        : activeLocale === "pcm"
        ? "Abeg I dey Dutse first gate, two seats go Berger"
        : "From Sokale roundabout, drop me for that Oando after Katampe bridge";
    onSendMessage(sampleText, true);
    setRecordSeconds(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendMessage(`[Uploaded Voice Clip: ${file.name}] Abeg I dey Dutse first gate, two seats go Berger`, true);
    }
  };

  const togglePlayAudio = (id: string) => {
    setPlayingAudioId((curr) => (curr === id ? null : id));
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0B141A",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 18px 48px rgba(0,0,0,0.5)",
      }}
    >
      {/* Mobile Device Status Bar */}
      <div
        style={{
          background: "#1F2C34",
          padding: "6px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: "#8696A0",
          letterSpacing: "0.04em",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span className="tabular-nums" style={{ fontWeight: 700, color: "#E9EDEF" }}>
          12:45
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>MTN-NG 4G</span>
          <span style={{ fontSize: 10 }}>● 98%</span>
        </div>
      </div>

      {/* WhatsApp Header */}
      <header
        style={{
          background: "#1F2C34",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#E9EDEF",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Avatar with Verified Shield */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "#008751",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 15,
                color: "#FFFFFF",
              }}
            >
              Al
            </div>
            <div
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                background: "#00A86B",
                borderRadius: "50%",
                padding: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheckIcon size={12} color="#FFFFFF" />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Along Abuja Transit</span>
            </div>
            <div style={{ fontSize: 11, color: "#25D366" }}>
              Verified WhatsApp Business Account
            </div>
          </div>
        </div>

        {/* Action Call Icons */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#AEBAC1" }}>
          <WhatsAppVideoCallIcon size={18} color="#AEBAC1" />
          <WhatsAppPhoneCallIcon size={17} color="#AEBAC1" />
          <span style={{ fontSize: 18, cursor: "pointer" }}>⋮</span>
        </div>
      </header>

      {/* Language Selector Banner */}
      <div
        style={{
          background: "#182229",
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11.5,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span style={{ color: "#8696A0" }}>WhatsApp Bot Language:</span>
        <div style={{ display: "flex", gap: 4 }}>
          {(["pcm", "ha", "en"] as const).map((loc) => {
            const isSelected = activeLocale === loc;
            const label = loc === "pcm" ? "Pidgin" : loc === "ha" ? "Hausa" : "English";
            return (
              <button
                key={loc}
                onClick={() => onChangeLocale(loc)}
                style={{
                  background: isSelected ? "#008751" : "transparent",
                  color: isSelected ? "#FFFFFF" : "#8696A0",
                  border: isSelected ? "none" : "1px solid rgba(255,255,255,0.1)",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Messages Body with WhatsApp Wallpaper */}
      <div
        ref={chatScrollRef}
        style={{
          flex: 1,
          padding: 14,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "#0B141A",
          backgroundImage:
            "radial-gradient(#182229 1px, transparent 1px), radial-gradient(#182229 1px, #0B141A 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0, 12px 12px",
        }}
      >
        {/* End-to-End Encryption Banner */}
        <div
          style={{
            alignSelf: "center",
            background: "#182229",
            color: "#FFD279",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 11,
            textAlign: "center",
            maxWidth: "92%",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        >
          <WhatsAppLockIcon size={12} color="#FFD279" />
          <span>
            Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen.
          </span>
        </div>

        {/* Date Chip */}
        <div
          style={{
            alignSelf: "center",
            background: "#182229",
            color: "#8696A0",
            padding: "3px 10px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.03em",
          }}
        >
          TODAY
        </div>

        {/* Message Stream */}
        {messages.map((msg) => {
          const isUser = msg.sender === "user";

          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: isUser ? "85%" : "92%",
                position: "relative",
              }}
            >
              {/* Message Bubble Body */}
              <div
                style={{
                  background: isUser ? "#005C4B" : "#202C33",
                  color: "#E9EDEF",
                  padding: msg.isVoice ? "8px 12px 6px" : "8px 12px",
                  borderRadius: isUser ? "10px 2px 10px 10px" : "2px 10px 10px 10px",
                  fontSize: 13,
                  lineHeight: 1.4,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
                }}
              >
                {/* Voice Note Layout */}
                {msg.isVoice ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={() => togglePlayAudio(msg.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: isUser ? "#25D366" : "#00A86B",
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {playingAudioId === msg.id ? (
                        <PauseCircleIcon size={30} color={isUser ? "#25D366" : "#00A86B"} />
                      ) : (
                        <PlayCircleIcon size={30} color={isUser ? "#25D366" : "#00A86B"} />
                      )}
                    </button>

                    {/* Animated Waveform */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          height: 18,
                        }}
                      >
                        {[10, 18, 14, 8, 20, 12, 16, 9, 22, 14, 18, 10, 15, 7, 19, 11].map(
                          (h, idx) => (
                            <span
                              key={idx}
                              style={{
                                width: 3,
                                height: playingAudioId === msg.id ? (idx % 2 === 0 ? 20 : 8) : h,
                                background: idx < 8 ? "#25D366" : "#8696A0",
                                borderRadius: 1.5,
                                transition: "height 0.15s ease",
                              }}
                            />
                          )
                        )}
                      </div>
                      <div
                        className="tabular-nums"
                        style={{ fontSize: 10.5, color: "#8696A0", display: "flex", justifyContent: "space-between" }}
                      >
                        <span>{msg.voiceDuration || "0:04"}</span>
                        <span>{isUser ? "Voice Note" : "Audio Response"}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>{msg.text}</div>
                )}

                {/* Structured WhatsApp Corridor Quote Card */}
                {msg.quoteData && (
                  <div
                    style={{
                      background: "#182229",
                      borderRadius: 8,
                      marginTop: 8,
                      padding: 10,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: "#00A86B",
                        letterSpacing: "0.04em",
                        marginBottom: 4,
                      }}
                    >
                      SAFE ANCHOR PASS • {msg.quoteData.corridorId}
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                      {msg.quoteData.anchorName}
                    </div>
                    <div style={{ fontSize: 12, color: "#8696A0", marginBottom: 6 }}>
                      Drop-off: {msg.quoteData.destName}
                    </div>

                    <div
                      className="tabular-nums"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 6,
                        padding: "6px 0",
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        fontSize: 11.5,
                      }}
                    >
                      <div>
                        Seats: <strong>{msg.quoteData.seats}</strong>
                      </div>
                      <div>
                        Per Seat: <strong>{msg.quoteData.unitFare}</strong>
                      </div>
                      <div>
                        Escrow: <strong style={{ color: "#F59E0B" }}>{msg.quoteData.totalFare}</strong>
                      </div>
                      <div>
                        Boarding OTP: <strong style={{ color: "#25D366" }}>{msg.quoteData.otp}</strong>
                      </div>
                    </div>

                    {/* WhatsApp Native-Style Interactive Buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
                      <button
                        onClick={onConfirmBooking}
                        style={{
                          background: "#008751",
                          color: "#FFFFFF",
                          border: "none",
                          padding: "8px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <span>✓ Confirm Pod Booking (Lock Escrow)</span>
                      </button>

                      <button
                        onClick={onTriggerSos}
                        style={{
                          background: "transparent",
                          color: "#EF4444",
                          border: "1px solid rgba(239,68,68,0.3)",
                          padding: "6px 10px",
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <span>⚠ Report Emergency / SOS</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Timestamp & Double Checkmarks */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 3,
                    marginTop: 4,
                    fontSize: 10.5,
                    color: "#8696A0",
                  }}
                >
                  <span className="tabular-nums">{msg.timestamp}</span>
                  {isUser && <WhatsAppDoubleCheckIcon size={14} color="#53BDEB" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Active LLM Elapsed Timer Indicator */}
        {isProcessing && (
          <div
            style={{
              alignSelf: "flex-start",
              maxWidth: "85%",
              position: "relative",
            }}
          >
            <div
              style={{
                background: "#202C33",
                color: "#E9EDEF",
                padding: "8px 14px",
                borderRadius: "2px 10px 10px 10px",
                fontSize: 13,
                lineHeight: 1.4,
                boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#25D366",
                  animation: "along-skeleton-pulse 1s infinite",
                }}
              />
              <span className="tabular-nums">Finding ride options... ({elapsedSec}s)</span>
            </div>
          </div>
        )}

        {/* Live Audio Recording Visualizer Bar */}
        {isRecording && (
          <div
            style={{
              alignSelf: "center",
              background: "#182229",
              border: "1px solid #EF4444",
              borderRadius: 20,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#EF4444",
              fontSize: 12,
              fontWeight: 700,
              boxShadow: "0 4px 14px rgba(239,68,68,0.2)",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#EF4444",
                animation: "along-skeleton-pulse 1s infinite",
              }}
            />
            <span className="tabular-nums">Recording Voice Note: 0:{recordSeconds.toString().padStart(2, "0")}</span>
            <button
              onClick={stopRecordingAndSend}
              style={{
                background: "#008751",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 12,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Send Audio
            </button>
          </div>
        )}
      </div>

      {/* Quick Voice Chips Bar */}
      <div
        style={{
          background: "#111B21",
          padding: "6px 10px",
          display: "flex",
          gap: 6,
          overflowX: "auto",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span style={{ fontSize: 11, color: "#8696A0", alignSelf: "center", whiteSpace: "nowrap" }}>
          Sample Notes:
        </span>
        {QUICK_SAMPLES.map((sample) => (
          <button
            key={sample.id}
            onClick={() => {
              onChangeLocale(sample.locale);
              onSendMessage(sample.text, true);
            }}
            style={{
              background: "#202C33",
              color: "#E9EDEF",
              border: "1px solid rgba(255,255,255,0.06)",
              padding: "4px 9px",
              borderRadius: 12,
              fontSize: 11,
              whiteSpace: "nowrap",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <VoiceWaveIcon size={12} color="#25D366" />
            <span>{sample.label}</span>
          </button>
        ))}
      </div>

      {/* WhatsApp Input Footer */}
      <footer
        style={{
          background: "#202C33",
          padding: "8px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          style={{
            background: "transparent",
            border: "none",
            color: "#8696A0",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
          title="Smiley emoji"
        >
          <WhatsAppSmileyIcon size={20} color="#8696A0" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: "transparent",
            border: "none",
            color: "#8696A0",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
          title="Upload audio note"
        >
          <WhatsAppPaperclipIcon size={18} color="#8696A0" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Type a message (e.g. Dutse to Berger 2 seats)..."
          style={{
            flex: 1,
            background: "#2A3942",
            border: "none",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#E9EDEF",
            fontSize: 13,
            outline: "none",
          }}
        />

        {/* Dynamic Action Button: Mic when empty, Send Arrow when text entered */}
        {inputText.trim() ? (
          <button
            onClick={handleSend}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#00A884",
              border: "none",
              color: "#FFFFFF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <WhatsAppSendIcon size={16} color="#FFFFFF" />
          </button>
        ) : (
          <button
            onClick={isRecording ? stopRecordingAndSend : startRecording}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: isRecording ? "#EF4444" : "#00A884",
              border: "none",
              color: "#FFFFFF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.2s ease",
            }}
            title={isRecording ? "Stop recording" : "Hold or click to record voice note"}
          >
            <WhatsAppMicIcon size={18} color="#FFFFFF" />
          </button>
        )}
      </footer>
    </div>
  );
}
