import React from "react";

export interface RouteLineProps {
  points: string;
  isActive?: boolean;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

/**
 * RouteLine SVG component.
 * Active corridor line draws itself in 700ms using ease-out stroke animation.
 * Inactive lines render quietly in neutral corridor grey.
 */
export function RouteLine({
  points,
  isActive = false,
  color,
  strokeWidth = 4.5,
  className = "",
}: RouteLineProps) {
  const strokeColor =
    color || (isActive ? "var(--brand-primary)" : "var(--corridor-inactive)");

  return (
    <polyline
      points={points}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${isActive ? "route-hero-line" : ""} ${className}`}
    />
  );
}
