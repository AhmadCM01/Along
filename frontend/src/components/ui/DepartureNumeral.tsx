import React from "react";

export interface DepartureNumeralProps {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "neutral" | "brand" | "amber" | "danger";
  className?: string;
  ariaLabel?: string;
}

const SIZE_STYLES = {
  sm: { fontSize: 13, padding: "2px 6px" },
  md: { fontSize: 16, padding: "4px 10px" },
  lg: { fontSize: 22, padding: "6px 14px" },
  xl: { fontSize: 32, padding: "8px 18px" },
};

/**
 * Station Departure-Board Numeral Component.
 * High-contrast monospace tabular numbers with hairline border styling.
 */
export function DepartureNumeral({
  children,
  size = "md",
  variant = "neutral",
  className = "",
  ariaLabel,
}: DepartureNumeralProps) {
  const cfg = SIZE_STYLES[size];

  const variantStyles = {
    neutral: {
      background: "var(--bg-surface)",
      color: "var(--text-ink)",
      borderColor: "var(--border-strong)",
    },
    brand: {
      background: "var(--brand-soft)",
      color: "var(--brand-primary)",
      borderColor: "var(--brand-primary)",
    },
    amber: {
      background: "var(--signal-soft)",
      color: "var(--signal-ink)",
      borderColor: "var(--signal-amber)",
    },
    danger: {
      background: "var(--danger-soft)",
      color: "var(--danger-red)",
      borderColor: "var(--danger-red)",
    },
  }[variant];

  return (
    <span
      className={`station-numeral ${className}`}
      style={{
        ...cfg,
        ...variantStyles,
      }}
      aria-label={ariaLabel}
    >
      {children}
    </span>
  );
}
