import React from "react";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function CorridorNodeIcon({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.5" />
      <circle cx="12" cy="12" r="3.5" fill={color} />
    </svg>
  );
}

export function ShieldCheckIcon({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2L4 5.5V11.5C4 16.8 7.4 21.6 12 23C16.6 21.6 20 16.8 20 11.5V5.5L12 2Z"
        stroke={color}
        strokeWidth="2.2"
      />
      <path
        d="M8.5 12.2L10.8 14.5L15.8 9.5"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VoiceWaveIcon({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="9" width="2.5" height="6" rx="1.2" fill={color} />
      <rect x="7.5" y="5" width="2.5" height="14" rx="1.2" fill={color} />
      <rect x="12" y="3" width="2.5" height="18" rx="1.2" fill={color} />
      <rect x="16.5" y="7" width="2.5" height="10" rx="1.2" fill={color} />
      <rect x="20.5" y="10" width="2.5" height="4" rx="1.2" fill={color} />
    </svg>
  );
}

export function CarPodIcon({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 11L7 6H17L19 11M4 11H20V17H4V11Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="17" r="2" fill={color} />
      <circle cx="16.5" cy="17" r="2" fill={color} />
    </svg>
  );
}

export function SosBeaconIcon({ size = 18, color = "#EF4444" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.2" />
      <path d="M12 7V13" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="12" cy="16.8" r="1.4" fill={color} />
    </svg>
  );
}

export function WhatsAppDoubleCheckIcon({ size = 16, color = "#53BDEB" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 15" fill="none" aria-hidden="true">
      <path
        d="M1 8.5L5.5 13L13.5 2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 8.5L10.5 12.5L18.5 2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WhatsAppMicIcon({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill={color} />
      <path
        d="M5 10C5 13.866 8.13401 17 12 17C15.866 17 19 13.866 19 10"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M12 17V21" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8 21H16" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function WhatsAppSendIcon({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 20L22 12L3 4L3 10L14 12L3 14L3 20Z"
        fill={color}
      />
    </svg>
  );
}

export function WhatsAppPaperclipIcon({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21.438 11.662L12.247 20.854C9.806 23.294 5.848 23.294 3.408 20.854C0.967 18.414 0.967 14.456 3.408 12.016L12.599 2.824C14.226 1.197 16.865 1.197 18.492 2.824C20.119 4.452 20.119 7.091 18.492 8.718L9.3 17.91C8.487 18.723 7.167 18.723 6.354 17.91C5.541 17.097 5.541 15.777 6.354 14.964L14.843 6.475"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WhatsAppSmileyIcon({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.8" />
      <circle cx="9" cy="10" r="1.3" fill={color} />
      <circle cx="15" cy="10" r="1.3" fill={color} />
      <path
        d="M8 14.5C9.2 16.5 14.8 16.5 16 14.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WhatsAppLockIcon({ size = 13, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2.5" fill={color} />
      <path
        d="M8 10V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V10"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15.5" r="1.2" fill="#0A0F0D" />
    </svg>
  );
}

export function WhatsAppPhoneCallIcon({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 16.92V19.92C22 20.48 21.54 20.93 20.97 20.92C10.49 20.35 3.65 13.51 3.08 3.03C3.07 2.46 3.52 2 4.08 2H7.08C7.58 2 8 2.37 8.08 2.87C8.22 3.82 8.5 4.74 8.91 5.6C9.06 5.92 8.98 6.3 8.73 6.55L6.97 8.31C8.42 11.36 10.64 13.58 13.69 15.03L15.45 13.27C15.7 13.02 16.08 12.94 16.4 13.09C17.26 13.5 18.18 13.78 19.13 13.92C19.63 14 20 14.42 20 14.92V16.92Z"
        fill={color}
      />
    </svg>
  );
}

export function WhatsAppVideoCallIcon({ size = 19, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="13" height="12" rx="2.5" fill={color} />
      <path d="M16 10L21 6.5V17.5L16 14V10Z" fill={color} />
    </svg>
  );
}

export function PlayCircleIcon({ size = 26, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill={color} />
      <polygon points="12,10 23,16 12,22" fill="#FFFFFF" />
    </svg>
  );
}

export function PauseCircleIcon({ size = 26, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill={color} />
      <rect x="11" y="10" width="3.5" height="12" rx="1" fill="#FFFFFF" />
      <rect x="17.5" y="10" width="3.5" height="12" rx="1" fill="#FFFFFF" />
    </svg>
  );
}

export function SteeringWheelIcon({ size = 22, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.2" />
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
      <path d="M12 3V9" stroke={color} strokeWidth="2" />
      <path d="M4.5 16.5L9.5 13.5" stroke={color} strokeWidth="2" />
      <path d="M19.5 16.5L14.5 13.5" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function PinLocationIcon({ size = 18, color = "#008751" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        fill={color}
      />
      <circle cx="12" cy="9" r="3.2" fill="#FFFFFF" />
    </svg>
  );
}
