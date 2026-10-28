import React from "react";

export interface AlongLogoProps {
  variant?: "dark" | "emerald" | "light";
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
}

const SIZE_MAP = {
  sm: { fontSize: 22, oBox: 16, stroke: 3.4, dot: 3.0 },
  md: { fontSize: 28, oBox: 20, stroke: 4.2, dot: 3.6 },
  lg: { fontSize: 38, oBox: 27, stroke: 5.5, dot: 4.6 },
  xl: { fontSize: 52, oBox: 36, stroke: 7.2, dot: 6.2 },
};

/**
 * Official Along Pure Geometric Wordmark (Uber / Bolt Benchmark - §14.1.1).
 * Renders "Along" with the Corridor Node dot centered inside the counter of the "o".
 */
export function AlongLogo({
  variant = "dark",
  size = "md",
  showTagline = false,
}: AlongLogoProps) {
  const dims = SIZE_MAP[size];

  const textColor =
    variant === "light" ? "#0A1410" : "#F3F6F4";
  const dotColor =
    variant === "emerald"
      ? "#F59E0B"
      : variant === "light"
      ? "#008751"
      : "#00A86B";

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          fontWeight: 800,
          fontSize: dims.fontSize,
          letterSpacing: "-0.045em",
          lineHeight: 1,
          color: textColor,
          userSelect: "none",
        }}
        aria-label="Along"
      >
        <span>Al</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: dims.oBox,
            height: dims.oBox,
            margin: "0 1px",
            transform: "translateY(1px)",
          }}
        >
          <svg
            viewBox="0 0 36 36"
            width={dims.oBox}
            height={dims.oBox}
            aria-hidden="true"
          >
            <circle
              cx="18"
              cy="18"
              r="13.2"
              fill="none"
              stroke={textColor}
              strokeWidth="6.8"
            />
            <circle cx="18" cy="18" r="4.6" fill={dotColor} />
          </svg>
        </span>
        <span>ng</span>
      </div>
      {showTagline && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: dotColor,
          }}
        >
          Abuja Corridor Transit
        </span>
      )}
    </div>
  );
}
