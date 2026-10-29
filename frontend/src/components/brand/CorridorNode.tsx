import React from "react";

export interface CorridorNodeProps {
  size?: number;
  variant?: "default" | "pickup" | "stepper" | "driver" | "loading";
  color?: string;
  dotColor?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Signature Corridor Node Primitive.
 * Reused as pickup pin, active stepper node, live driver marker, and loading indicator.
 */
export function CorridorNode({
  size = 20,
  variant = "default",
  color,
  dotColor,
  className = "",
  ariaLabel = "Corridor node",
}: CorridorNodeProps) {
  const outerStroke = color || "var(--text-ink)";
  const innerDot =
    dotColor ||
    (variant === "driver"
      ? "var(--signal-amber)"
      : variant === "pickup"
      ? "var(--brand-primary)"
      : "var(--brand-primary)");

  if (variant === "loading") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
        }}
        className={className}
        aria-label={ariaLabel}
        role="status"
      >
        <svg
          viewBox="0 0 36 36"
          width={size}
          height={size}
          style={{ animation: "along-spin 1.2s linear infinite" }}
        >
          <circle
            cx="18"
            cy="18"
            r="13"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="5"
          />
          <circle
            cx="18"
            cy="18"
            r="13"
            fill="none"
            stroke="var(--brand-primary)"
            strokeWidth="5"
            strokeDasharray="30 60"
            strokeLinecap="round"
          />
          <circle cx="18" cy="18" r="4.5" fill="var(--brand-primary)" />
        </svg>
        <style jsx>{`
          @keyframes along-spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        position: "relative",
      }}
      className={className}
      aria-label={ariaLabel}
    >
      <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true">
        <circle
          cx="18"
          cy="18"
          r="13.2"
          fill={variant === "pickup" ? "var(--bg-surface)" : "none"}
          stroke={outerStroke}
          strokeWidth={variant === "pickup" ? "4.5" : "6.5"}
        />
        <circle cx="18" cy="18" r={variant === "stepper" ? "5.5" : "4.8"} fill={innerDot} />
      </svg>
      {variant === "pickup" && (
        <span
          style={{
            position: "absolute",
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: "50%",
            border: "1.5px solid var(--brand-primary)",
            opacity: 0.35,
            pointerEvents: "none",
          }}
        />
      )}
    </span>
  );
}
