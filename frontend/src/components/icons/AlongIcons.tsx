"use client";

import React from "react";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Aerodynamic 4-Seat Shared Transit Pod
 */
export function PodNavIcon({ size = 20, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 15V10C4 6.686 6.686 4 10 4H14C17.314 4 20 6.686 20 10V15C20 16.657 18.657 18 17 18H7C5.343 18 4 16.657 4 15Z" />
      <path d="M7 11H17" />
      <circle cx="8" cy="18" r="2" fill={color} />
      <circle cx="16" cy="18" r="2" fill={color} />
      <path d="M8 8H16" strokeWidth="1.5" strokeDasharray="1 2" />
    </svg>
  );
}

/**
 * Driver Cockpit & Steering HUD Icon
 */
export function SteeringNavIcon({ size = 20, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3V9" />
      <path d="M4.5 16.5L9.5 13.5" />
      <path d="M19.5 16.5L14.5 13.5" />
    </svg>
  );
}

/**
 * Live Trip Radar & Safety Beacon Icon
 */
export function RadarNavIcon({ size = 20, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 0-10 10c0 3.2 1.5 6 3.8 7.8L12 22l6.2-2.2A10 10 0 0 0 12 2z" />
      <circle cx="12" cy="10" r="3" />
      <path d="M8.5 7.5a5 5 0 0 1 7 0" />
    </svg>
  );
}

// Aliases for legacy component compatibility
export const CarPodIcon = PodNavIcon;
export const SteeringWheelIcon = SteeringNavIcon;
export const ShieldCheckIcon = RadarNavIcon;

/**
 * Studio Condenser Microphone Icon (Replaces generic OS mic emoji)
 */
export function StudioMicIcon({ size = 18, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

/**
 * Architectural Forecourt Waypoint Pin Icon (Replaces generic red pushpin emoji)
 */
export function ForecourtPinIcon({ size = 18, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2.5" fill={color} />
    </svg>
  );
}

/**
 * Multilingual Voice Dialogue Wave Icon (Replaces generic speaking head emoji)
 */
export function DialogueWaveIcon({ size = 18, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path d="M9 11.5v1" />
      <path d="M12 9.5v5" />
      <path d="M15 11.5v1" />
    </svg>
  );
}

/**
 * Search Lens Icon
 */
export function SearchLensIcon({ size = 15, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16.2" y2="16.2" />
    </svg>
  );
}

/**
 * Escrow & End-to-End Encryption Lock Shield Icon
 */
export function LockShieldIcon({ size = 14, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/**
 * Share Link Chain Icon
 */
export function LinkChainIcon({ size = 14, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/**
 * Emergency SOS Beacon Icon
 */
export function SosBeaconIcon({ size = 16, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2L2 19h20L12 2z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <circle cx="12" cy="16.5" r="0.8" fill={color} />
    </svg>
  );
}

/**
 * Trash Bin Icon (Cancel Voice Recording)
 */
export function TrashBinIcon({ size = 16, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/**
 * Send Paper Plane / Arrow Icon
 */
export function SendArrowIcon({ size = 16, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

/**
 * Voice Note Audio Waveform Player with real Web Audio / Speech feedback
 */
export function VoiceWaveformPlayer({
  isPlaying,
  onTogglePlay,
  duration = "0:04",
  accentColor = "var(--brand-primary)",
}: {
  isPlaying: boolean;
  onTogglePlay: () => void;
  duration?: string;
  accentColor?: string;
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onTogglePlay();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 12px",
        background: "rgba(11, 110, 79, 0.08)",
        borderRadius: 20,
        cursor: "pointer",
        userSelect: "none",
        border: "1px solid rgba(11, 110, 79, 0.2)",
      }}
      title="Tap to play voice note"
    >
      <button
        type="button"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: accentColor,
          color: "#fff",
          border: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          cursor: "pointer",
          flexShrink: 0,
        }}
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
      >
        {isPlaying ? "❚❚" : "▶"}
      </button>

      {/* Waveform bars */}
      <div style={{ display: "flex", alignItems: "center", gap: 3, height: 20 }}>
        {[8, 14, 18, 10, 16, 20, 12, 18, 14, 9, 15, 7].map((height, idx) => (
          <span
            key={idx}
            style={{
              width: 3,
              height: isPlaying ? `${Math.min(20, Math.max(5, height + (idx % 3) * 3))}px` : `${height}px`,
              backgroundColor: accentColor,
              borderRadius: 2,
              opacity: isPlaying ? 1 : 0.65,
              animation: isPlaying ? `waveformPulse 0.6s ease-in-out infinite alternate ${idx * 0.05}s` : "none",
              transition: "height 0.15s ease",
            }}
          />
        ))}
      </div>

      <span
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {duration}
      </span>

      <style jsx>{`
        @keyframes waveformPulse {
          0% {
            transform: scaleY(0.4);
          }
          100% {
            transform: scaleY(1.2);
          }
        }
      `}</style>
    </div>
  );
}
