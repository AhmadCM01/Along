import React from "react";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Matte Black Pulse Loading Skeleton for Along AI (§14.1).
 * Smoothly pulses without UI layout shift during local Llama or Muse model inference.
 */
export function Skeleton({
  width = "100%",
  height = 18,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background:
          "linear-gradient(90deg, #111916 0%, #17221E 50%, #111916 100%)",
        backgroundSize: "200% 100%",
        animation: "along-skeleton-pulse 1.8s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function ChatBubbleSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        background: "#17221E",
        borderRadius: 12,
        maxWidth: "85%",
      }}
    >
      <Skeleton width="45%" height={12} />
      <Skeleton width="90%" height={14} />
      <Skeleton width="75%" height={14} />
    </div>
  );
}

export function AiXRaySkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        background: "#111916",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Skeleton width="40%" height={18} />
        <Skeleton width="25%" height={18} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Skeleton height={60} borderRadius={10} />
        <Skeleton height={60} borderRadius={10} />
      </div>
    </div>
  );
}

export function CarSeatGridSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        padding: 12,
        background: "#111916",
        borderRadius: 12,
      }}
    >
      <Skeleton height={48} borderRadius={8} />
      <Skeleton height={48} borderRadius={8} />
      <Skeleton height={48} borderRadius={8} />
      <Skeleton height={48} borderRadius={8} />
    </div>
  );
}
