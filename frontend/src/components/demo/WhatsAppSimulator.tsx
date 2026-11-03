"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CorridorNode } from "@/components/brand/CorridorNode";
import { DepartureNumeral } from "@/components/ui/DepartureNumeral";
import {
  VoiceWaveformPlayer,
  StudioMicIcon,
  ForecourtPinIcon,
  DialogueWaveIcon,
  PodNavIcon,
  SearchLensIcon,
  LockShieldIcon,
  TrashBinIcon,
  SendArrowIcon,
} from "@/components/icons/AlongIcons";
import { playAlongVoiceNote, stopAlongVoiceNote } from "@/lib/audio";
import { useAlongTrip } from "@/context/AlongTripContext";

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  isVoice?: boolean;
  voiceDuration?: string;
  voiceLabel?: string;
  audioUrl?: string;
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
  onSendVoiceAudio?: (
    blob: Blob | File,
    filename?: string,
    clientTranscript?: string,
    durationStr?: string,
    audioUrl?: string
  ) => void;
  onSendSampleInput?: (text: string, locale?: "en" | "pcm" | "ha", isVoiceSample?: boolean) => void;
  onConfirmBooking: () => void;
  onTriggerSos: () => void;
  onResetChat?: () => void;
  activeLocale: "en" | "pcm" | "ha";
  onChangeLocale?: (loc: "en" | "pcm" | "ha") => void;
  currentPhone?: string;
  onSwitchCommuter?: (phone: string) => void;
  isProcessing?: boolean;
  elapsedSeconds?: number;
  errorMessage?: string | null;
}

const QUICK_SCENARIOS = [
  {
    id: "pcm_dutse",
    title: "Pidgin Voice: Dutse to Berger",
    subtitle: "Abeg I dey Dutse first gate, two seats go Berger",
    shortLabel: "Pidgin Voice Note",
    iconType: "mic" as const,
    text: "Abeg I dey Dutse first gate, two seats go Berger",
    locale: "pcm" as const,
    isVoice: true,
    corridor: "BWR-DUT-WUS",
  },
  {
    id: "rel_sokale",
    title: "Landmark: Sokale to Katampe",
    subtitle: "Drop me for that Oando after Katampe bridge",
    shortLabel: "Sokale to Katampe",
    iconType: "pin" as const,
    text: "From Sokale roundabout, drop me for that Oando after Katampe bridge",
    locale: "en" as const,
    isVoice: false,
    corridor: "BWR-DUT-WUS",
  },
  {
    id: "ha_bwari",
    title: "Hausa: Bwari to Wuse Market",
    subtitle: "Ina Bwari zan je Kasuwar Wuse kujera biyu",
    shortLabel: "Hausa: Bwari to Wuse",
    iconType: "wave" as const,
    text: "Ina Bwari zan je Kasuwar Wuse kujera biyu",
    locale: "ha" as const,
    isVoice: false,
    corridor: "BWR-DUT-WUS",
  },
  {
    id: "lugbe_area1",
    title: "Airport Rd: Lugbe to Area 1",
    subtitle: "I dey Police signboard Lugbe, 1 seat go Area 1",
    shortLabel: "Lugbe to Area 1",
    iconType: "pod" as const,
    text: "I dey Police signboard Lugbe, 1 seat go Area 1",
    locale: "pcm" as const,
    isVoice: false,
    corridor: "GWL-LUG-AR1",
  },
];

function ScenarioIcon({ type }: { type: "mic" | "pin" | "wave" | "pod" }) {
  if (type === "mic") return <StudioMicIcon size={15} color="var(--brand-primary)" />;
  if (type === "pin") return <ForecourtPinIcon size={15} color="var(--brand-primary)" />;
  if (type === "wave") return <DialogueWaveIcon size={15} color="var(--brand-primary)" />;
  return <PodNavIcon size={15} color="var(--brand-primary)" />;
}

/**
 * Format WhatsApp markdown text into clean React typography without raw asterisks or backticks.
 */
function FormattedWhatsAppText({ text }: { text: string }) {
  if (!text) return null;
  const cleanedText = text.replace(/`([^`]+)`/g, "*$1*");
  const lines = cleanedText.split("\n");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} style={{ height: 2 }} />;

        const parts = trimmed.split(/(\*[^*]+\*)/g);
        return (
          <p key={lIdx} style={{ margin: 0, lineHeight: 1.48 }}>
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
 * Normalize common browser Web-Speech phonetic homophones for Abuja landmarks & Hausa/Pidgin in real time.
 */
function normalizeLiveSpeechPreview(raw: string): string {
  return raw
    .replace(/^\s*(?:just\s+sing|john\s+sing|zahn\s+sing|zan\s+sing)\s*$/gi, "Zan je Wuse daga Dutse")
    .replace(/\b(?:just\s+sing|zahn\s+we\s+say|zan\s+we\s+say|zan\s+who\s+say)\b/gi, "zan je Wuse")
    .replace(/\b(?:da\s+ga|dagga|dagger|dogger)\s+/gi, "daga ")
    .replace(/\b(?:do\s+say|du\s+say|do\s+stay|dutsay|duche|duste|dutsi|dot\s+say)\b/gi, "Dutse")
    .replace(/\b(?:who\s+say|we\s+say|wu\s+say|wusay|woosay)\b/gi, "Wuse")
    .replace(/\b(?:so\s+kale|so\s+call(?:ed)?|sokali|so\s+kali)\b/gi, "Sokale")
    .replace(/\b(?:cat\s+amp(?:e|y)?|cut\s+amp(?:e|y)?|ka\s+tampe)\b/gi, "Katampe")
    .replace(/\b(?:badger|baja|barja|burger)\b/gi, "Berger")
    .replace(/\b(?:buari|bohari|buhari|barry)\b/gi, "Bwari")
    .replace(/\b(?:look\s+be|lug\s+bay|lugbi)\b/gi, "Lugbe")
    .replace(/\b(?:cashew\s+war|kasuwa)\b/gi, "Kasuwar")
    .replace(/\b(?:coochie\s*ra|ku\s+jera|kujira)\b/gi, "kujera")
    .replace(/\b(?:are\s+begging|a\s+beg|i\s+beg)\b/gi, "Abeg")
    .replace(/\b(?:i\s+day|i\s+they)\b/gi, "I dey");
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
  currentPhone,
  onSwitchCommuter,
  isProcessing = false,
  errorMessage,
}: WhatsAppSimulatorProps) {
  const trip = useAlongTrip();
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [activeVoicePlayingId, setActiveVoicePlayingId] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const cancelledRecordingRef = useRef<boolean>(false);
  const recordSecondsRef = useRef<number>(0);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      const t1 = setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTo({
            top: chatScrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
      const t2 = setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
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

  /**
   * Start real microphone recording and send recorded audio directly to backend ASR + Meta AI
   */
  const startRecording = async () => {
    chunksRef.current = [];
    cancelledRecordingRef.current = false;
    recordSecondsRef.current = 0;
    setRecordSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mr.onstop = () => {
        if (cancelledRecordingRef.current) {
          return;
        }
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        const secs = Math.max(1, recordSecondsRef.current);
        const mins = Math.floor(secs / 60);
        const remSecs = String(secs % 60).padStart(2, "0");
        const durationStr = `${mins}:${remSecs}`;

        if (onSendVoiceAudio) {
          onSendVoiceAudio(audioBlob, "voice_note.webm", undefined, durationStr, audioUrl);
        }
      };

      mr.start(200);
      mediaRecorderRef.current = mr;
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
      }, 1000);
    } catch {
      alert(
        "Microphone access could not be started (check browser mic permissions or HTTPS/localhost). You can also click 'Play Pidgin Voice' at the top right."
      );
    }
  };

  const cleanupRecordingHandles = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const finishAndSendRecording = () => {
    cancelledRecordingRef.current = false;
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    cleanupRecordingHandles();
  };

  const cancelRecording = () => {
    cancelledRecordingRef.current = true;
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    cleanupRecordingHandles();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSendVoiceAudio) {
      const audioUrl = URL.createObjectURL(file);
      onSendVoiceAudio(file, file.name, undefined, "0:05", audioUrl);
    }
  };

  const handlePlayVoice = (msgId: string, text: string, customAudioUrl?: string) => {
    if (activeVoicePlayingId === msgId) {
      stopAlongVoiceNote();
      setActiveVoicePlayingId(null);
      return;
    }
    setActiveVoicePlayingId(msgId);
    playAlongVoiceNote({
      text,
      customAudioUrl,
      onStart: () => setActiveVoicePlayingId(msgId),
      onEnd: () => setActiveVoicePlayingId(null),
    });
  };

  const handleTriggerScenario = async (scn: (typeof QUICK_SCENARIOS)[number]) => {
    if (isProcessing) return;
    if (scn.isVoice) {
      setActiveVoicePlayingId("hero_sample");
      playAlongVoiceNote({
        text: scn.text,
        onStart: () => setActiveVoicePlayingId("hero_sample"),
        onEnd: () => setActiveVoicePlayingId(null),
      });
      if (onSendVoiceAudio) {
        try {
          const resp = await fetch("/audio/pidgin_voice_note.ogg");
          if (resp.ok) {
            const blob = await resp.blob();
            onSendVoiceAudio(
              blob,
              "pidgin_voice_note.ogg",
              undefined,
              "0:06",
              "/audio/pidgin_voice_note.ogg"
            );
            return;
          }
        } catch {}
      }
    }
    if (onSendSampleInput) {
      onSendSampleInput(scn.text, scn.locale, scn.isVoice);
    }
  };

  const isConfirmedRide = trip.journeyStage === "CONFIRMED" || trip.journeyStage === "IN_TRANSIT";
  const lastMsg = messages[messages.length - 1];
  const commuterSeat = trip.passengers.find((p) => p.isCurrentUser);
  const unifiedOtp = commuterSeat?.otpCode || trip.currentQuote?.otp || "4817";

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = String(s % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

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
          minWidth: 330,
          maxWidth: 330,
          boxSizing: "border-box",
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
            minHeight: 56,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
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
                whiteSpace: "nowrap",
              }}
            >
              WhatsApp-style demo chat
            </span>
          </div>

          {onResetChat && (
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
                cursor: messages.length > 0 ? "pointer" : "default",
                visibility: messages.length > 0 ? "visible" : "hidden",
                flexShrink: 0,
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Search Bar */}
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
            <SearchLensIcon size={14} color="var(--text-muted)" />
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
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: "var(--bg-paper)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  Demo
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
                : "Record a live voice note or type your Abuja destination"}
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
            minHeight: 0,
            overflowY: "auto",
            scrollbarGutter: "stable",
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
                gap: 4,
                width: "100%",
                boxSizing: "border-box",
                transition: "all 150ms ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "var(--text-ink)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <ScenarioIcon type={scn.iconType} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {scn.shortLabel}
                  </span>
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
                    flexShrink: 0,
                    marginLeft: 6,
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

        {/* How It Works & Affiliation Disclosure */}
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-paper)",
            fontSize: 11.5,
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--text-ink)", marginBottom: 4 }}>
            How it works
          </div>
          <div style={{ lineHeight: 1.45, marginBottom: 6 }}>
            Shared 4-seat commuter transit pods departing from safe filling-station forecourts across Abuja corridors.
          </div>
          <div style={{ fontSize: 10.5, fontStyle: "italic", color: "var(--text-muted)", lineHeight: 1.35 }}>
            Along is an independent project. It is not affiliated with or endorsed by WhatsApp or Meta.
          </div>
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
                  }}
                >
                  Along Bot
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: "var(--bg-paper)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-subtle)",
                    flexShrink: 0,
                  }}
                >
                  Demo
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: isProcessing ? "#25D366" : "var(--text-muted)",
                  fontWeight: isProcessing ? 700 : 500,
                }}
              >
                {isProcessing
                  ? "typing..."
                  : "Online · Abuja Corridor Coordinator"}
              </div>
            </div>
          </div>

          {/* Right Header Action: 1-Tap Native Male Nigerian Pidgin Voice Note */}
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
                padding: "6px 12px",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: isProcessing ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                boxShadow: "0 2px 8px rgba(37, 211, 102, 0.28)",
                whiteSpace: "nowrap",
              }}
            >
              <span>{activeVoicePlayingId === "hero_sample" ? "❚❚" : "▶"}</span>
              <span>Pidgin Voice</span>
            </button>
          </div>
        </header>

        {/* WhatsApp Chat Wallpaper & Messages Stream */}
        <div
          ref={chatScrollRef}
          className="along-chat-body"
          style={{
            flex: 1,
            padding: "16px 16px 28px",
            overflowY: "auto",
            scrollbarGutter: "stable",
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
              padding: "6px 13px",
              borderRadius: 10,
              border: "1px solid var(--border-subtle)",
              textAlign: "center",
              maxWidth: 450,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <LockShieldIcon size={13} color="var(--brand-primary)" />
            <span>
              Messages and voice notes are simulated in this demo. Fares are held in simulated atomic escrow until boarding OTP verification.
            </span>
          </div>

          {/* Empty State Onboarding Card inside Chat */}
          {messages.length === 0 && !isProcessing && (
            <div
              className="along-bubble-bot"
              style={{
                alignSelf: "flex-start",
                maxWidth: 430,
                padding: "12px 16px",
                borderRadius: "2px 14px 14px 14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                fontSize: 13.5,
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "var(--brand-primary)",
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CorridorNode size={14} variant="pickup" />
                <span>Along Abuja Corridor Coordinator</span>
              </div>
              <div>
                How far! Tap the <strong>microphone button</strong> below to record a live voice note, or type where you are standing and where you are heading in{" "}
                <strong>Pidgin, Hausa, or English</strong>. I will match you into a safe filling-station pod right away.
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
            const isConfirmationMsg = Boolean(m.isConfirmed);
            const msgOtp = m.quoteData?.otp || unifiedOtp;

            return (
              <div
                key={m.id}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "min(86%, 470px)",
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
                    lineHeight: 1.48,
                    borderRadius: isUser ? "14px 2px 14px 14px" : "2px 14px 14px 14px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    position: "relative",
                  }}
                >
                  {/* Native Nigerian or User-Recorded Voice Note Waveform Player */}
                  {m.isVoice && (
                    <div style={{ marginBottom: 8 }}>
                      <VoiceWaveformPlayer
                        isPlaying={isVoicePlaying}
                        onTogglePlay={() => handlePlayVoice(m.id, m.text, m.audioUrl)}
                        duration={m.voiceDuration || "0:04"}
                      />
                    </div>
                  )}

                  {/* Message Text */}
                  <FormattedWhatsAppText text={m.text} />

                  {/* TURN 1: Embedded WhatsApp Business Quote Card */}
                  {m.quoteData && !isConfirmationMsg && (
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

                      <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>Safe Pickup Anchor: </span>
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
                        <span>
                          ✓ Confirm & Lock {m.quoteData.seats}{" "}
                          {m.quoteData.seats === 1 ? "Seat" : "Seats"} ({m.quoteData.totalFare})
                        </span>
                      </button>
                    </div>
                  )}

                  {/* TURN 2: Confirmed Boarding Pass Card inside WhatsApp */}
                  {m.quoteData && isConfirmationMsg && (
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
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-primary)" }}>
                            BOARDING PASS · {trip.driverInfo.podCode || "POD-842A"}
                          </div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-ink)" }}>
                            {trip.driverInfo.driverName || "Musa Bello"} · {trip.driverInfo.plateNumber}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            {m.quoteData.anchorName} ➔ {m.quoteData.destName}
                          </div>
                        </div>

                        <div
                          style={{
                            background: "var(--signal-soft)",
                            border: "1px solid var(--signal-amber)",
                            borderRadius: 8,
                            padding: "6px 12px",
                            textAlign: "center",
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--signal-ink)" }}>
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
                            {msgOtp}
                          </div>
                        </div>
                      </div>

                      {/* Working Copy Family Link Button & Demo Shortcut Driver Link */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            const token = m.quoteData?.shareToken || trip.activeShareToken || "share-bwr-4817";
                            const base = typeof window !== "undefined" ? window.location.origin : "";
                            const url = `${base}/t/${token}`;
                            if (typeof navigator !== "undefined" && navigator.clipboard) {
                              navigator.clipboard.writeText(url);
                              setCopiedShareId(m.id);
                              setTimeout(() => setCopiedShareId(null), 2500);
                            }
                          }}
                          style={{
                            width: "100%",
                            background: "var(--bg-paper)",
                            border: "1px solid var(--border-strong)",
                            color: "var(--text-ink)",
                            borderRadius: 10,
                            padding: "9px 12px",
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <span>{copiedShareId === m.id ? "✓ Family link copied!" : "Copy family link"}</span>
                        </button>

                        {(() => {
                          const isUserBoarded =
                            trip.passengers.some((p) => p.isCurrentUser && p.isBoarded) ||
                            trip.journeyStage === "IN_TRANSIT";

                          return (
                            <Link
                              href={`/driver?code=${encodeURIComponent(msgOtp)}`}
                              style={{
                                textDecoration: "none",
                                background: isUserBoarded ? "#059669" : "var(--brand-primary)",
                                color: "#FFFFFF",
                                borderRadius: 10,
                                padding: "10px 14px",
                                fontSize: 13,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                transition: "background 0.2s ease",
                              }}
                            >
                              <span>
                                {isUserBoarded
                                  ? `✓ Boarded (${msgOtp}) · Simulated Escrow Captured`
                                  : "Open driver view with this code"}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: "rgba(255, 255, 255, 0.22)",
                                  padding: "2px 7px",
                                  borderRadius: 6,
                                }}
                              >
                                Demo shortcut
                              </span>
                            </Link>
                          );
                        })()}
                      </div>
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

          {/* Authentic WhatsApp 3-Dot Typing Bubble */}
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

        {/* Mobile Quick Prompt Pills */}
        <div
          className="whatsapp-mobile-prompts"
          style={{
            display: "none",
            flexWrap: "nowrap",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            gap: 8,
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
                flexShrink: 0,
                padding: "5px 12px",
                borderRadius: 999,
                background: "var(--bg-paper)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-ink)",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                whiteSpace: "nowrap",
              }}
            >
              <ScenarioIcon type={scn.iconType} />
              <span>{scn.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* WhatsApp Bottom Composer Bar (Normal Mode vs Live Voice Recording Mode) */}
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

          {isRecording ? (
            /* LIVE WHATSAPP VOICE RECORDING BAR */
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--bg-paper)",
                border: "1.5px solid #25D366",
                borderRadius: 999,
                padding: "6px 10px 6px 12px",
              }}
            >
              <button
                type="button"
                onClick={cancelRecording}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: "var(--danger-soft)",
                  color: "var(--danger-red)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                title="Cancel voice note"
                aria-label="Cancel voice note"
              >
                <TrashBinIcon size={15} color="var(--danger-red)" />
              </button>

              {/* Pulsing Red Mic Dot & Timer */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "var(--danger-red)",
                    animation: "recBlink 1s infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-ink)",
                  }}
                >
                  {formatTimer(recordSeconds)}
                </span>
              </div>

              {/* Authentic WhatsApp Live Recording Waveform (No Live Text Preview) */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  {[6, 12, 16, 9, 15, 11, 17, 8, 14, 10, 16, 12, 7, 13].map((h, idx) => (
                    <span
                      key={idx}
                      style={{
                        width: 2.5,
                        height: h,
                        borderRadius: 2,
                        background: "#25D366",
                        animation: `recBlink ${0.6 + (idx % 4) * 0.15}s infinite ease-in-out`,
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Recording voice note...
                </span>
              </div>

              {/* Send Recorded Voice Note Button */}
              <button
                type="button"
                onClick={finishAndSendRecording}
                style={{
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: "none",
                  background: "#25D366",
                  color: "#0B141A",
                  fontWeight: 800,
                  fontSize: 12.5,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                title="Send recorded voice note"
                aria-label="Send recorded voice note"
              >
                <SendArrowIcon size={14} color="#0B141A" />
                <span>Send Voice</span>
              </button>
            </div>
          ) : (
            /* STANDARD WHATSAPP COMPOSER */
            <>
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
                title="Upload audio file"
                aria-label="Upload audio file"
              >
                +
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message in Pidgin, Hausa, or English (or tap mic to speak)"
                disabled={isProcessing}
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
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  aria-label="Send message"
                >
                  <SendArrowIcon size={17} color="#0B141A" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
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
                    cursor: isProcessing ? "not-allowed" : "pointer",
                    flexShrink: 0,
                  }}
                  title="Tap to record live voice note"
                  aria-label="Tap to record live voice note"
                >
                  <StudioMicIcon size={18} color="#0B141A" />
                </button>
              )}
            </>
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

        @keyframes recBlink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.25;
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
