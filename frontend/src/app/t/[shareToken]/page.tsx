"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlongLogo } from "@/components/brand/AlongLogo";
import { ShieldCheckIcon, SosBeaconIcon } from "@/components/icons/AlongIcons";

export default function PublicTripSharePage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const [sosActive, setSosActive] = useState<boolean>(false);
  void params;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F7F8F6",
        color: "#0A1410",
        padding: "24px 16px 56px",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Link href="/">
            <AlongLogo variant="light" size="md" />
          </Link>
          <span
            style={{
              background: "rgba(0,135,81,0.12)",
              color: "#008751",
              padding: "5px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            LIVE FAMILY SAFETY TRACKER
          </span>
        </header>

        {/* Verified Driver & Pod Identity Card */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(10,20,16,0.1)",
            borderRadius: 16,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#008751" }}>
                POD-842A [Demo data] | BWR-DUT-WUS CORRIDOR
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
                Demo driver profile: Musa Danjuma (ABJ-412K [Demo data])
              </div>
              <div style={{ fontSize: 13, color: "#374740" }}>
                Toyota Corolla (Silver) | Safe Escrow Verified [Demo data]
              </div>
            </div>
            <ShieldCheckIcon size={28} color="#008751" />
          </div>

          <div
            className="tabular-nums"
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid rgba(10,20,16,0.08)",
              fontSize: 13,
            }}
          >
            <div>
              Boarded At: <strong>A.A. Rano Filling Station (Dutse First Gate)</strong>
            </div>
            <div style={{ marginTop: 4 }}>
              Current Location: <strong>Katampe Extension Bridge (On Corridor, 12m dev)</strong>
            </div>
            <div style={{ marginTop: 4 }}>
              Destination: <strong>Wuse Market Main Gate (ETA: 8 mins)</strong>
            </div>
          </div>
        </div>

        {/* 1-Tap Emergency SOS Button */}
        <div
          style={{
            background: sosActive ? "#FEF2F2" : "#FFFFFF",
            border: sosActive ? "2px solid #DC2626" : "1px solid rgba(10,20,16,0.1)",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <SosBeaconIcon size={20} color="#DC2626" />
            <span style={{ fontWeight: 800, fontSize: 15, color: "#DC2626" }}>
              Anti-&ldquo;One-Chance&rdquo; Family Safety Guard
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#374740", marginBottom: 14 }}>
            If the vehicle deviates &gt;800m off the Abuja corridor or you need
            immediate assistance, tap below to alert Along Operations Command
            and FCT Rapid Response.
          </p>
          <button
            onClick={() => setSosActive(true)}
            style={{
              width: "100%",
              background: "#DC2626",
              color: "#FFFFFF",
              border: "none",
              padding: "14px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            {sosActive
              ? "SOS ALERT ACTIVE - FCT DISPATCH NOTIFIED"
              : "TRIGGER 1-TAP EMERGENCY SOS"}
          </button>
        </div>
      </div>
    </main>
  );
}
