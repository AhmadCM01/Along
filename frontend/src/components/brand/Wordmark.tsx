import React from "react";
import { CorridorNode } from "./CorridorNode";

export interface WordmarkProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  sm: { fontSize: 22, nodeSize: 16 },
  md: { fontSize: 28, nodeSize: 20 },
  lg: { fontSize: 36, nodeSize: 26 },
  xl: { fontSize: 48, nodeSize: 34 },
};

/**
 * Along Transit Wordmark: Al(o)ng with the CorridorNode as the 'o'.
 */
export function Wordmark({
  size = "md",
  showTagline = false,
  className = "",
}: WordmarkProps) {
  const cfg = SIZE_CONFIG[size];

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 2,
        userSelect: "none",
      }}
      className={className}
      aria-label="Along"
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          fontFamily: "var(--font-heading)",
          fontWeight: 800,
          fontSize: cfg.fontSize,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          color: "var(--text-ink)",
        }}
      >
        <span>Al</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 1.5px",
            transform: "translateY(1.5px)",
          }}
        >
          <CorridorNode size={cfg.nodeSize} />
        </span>
        <span>ng</span>
      </div>
      {showTagline && (
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          Abuja Transit Map
        </span>
      )}
    </div>
  );
}
