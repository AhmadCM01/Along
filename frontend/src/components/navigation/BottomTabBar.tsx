"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface BottomTabBarProps {
  activeShareToken?: string | null;
}

export function BottomTabBar({ activeShareToken }: BottomTabBarProps) {
  const pathname = usePathname();
  const familyHref = activeShareToken ? `/t/${activeShareToken}` : "/t/tok_demo_family_123";

  return (
    <nav
      className="along-bottom-tab-bar"
      style={{
        display: "none",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        padding: "8px 16px max(8px, env(safe-area-inset-bottom))",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 50,
      }}
      aria-label="Mobile Navigation"
    >
      <Link
        href="/"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          color: pathname === "/" ? "var(--brand-primary)" : "var(--text-muted)",
          fontWeight: pathname === "/" ? 700 : 500,
          fontSize: 12,
        }}
      >
        <span style={{ fontSize: 18 }}>🚗</span>
        <span>Ride</span>
      </Link>

      <Link
        href="/driver"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          color: pathname === "/driver" ? "var(--brand-primary)" : "var(--text-muted)",
          fontWeight: pathname === "/driver" ? 700 : 500,
          fontSize: 12,
        }}
      >
        <span style={{ fontSize: 18 }}>📋</span>
        <span>Driver</span>
      </Link>

      <Link
        href={familyHref}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          color: pathname.startsWith("/t/") ? "var(--brand-primary)" : "var(--text-muted)",
          fontWeight: pathname.startsWith("/t/") ? 700 : 500,
          fontSize: 12,
        }}
      >
        <span style={{ fontSize: 18 }}>🛡️</span>
        <span>Family</span>
      </Link>

      <style jsx>{`
        @media (max-width: 768px) {
          .along-bottom-tab-bar {
            display: flex !important;
          }
        }
      `}</style>
    </nav>
  );
}
