import React from "react";
import Link from "next/link";
import { AlongLogo } from "@/components/brand/AlongLogo";
import {
  CarPodIcon,
  CorridorNodeIcon,
  ShieldCheckIcon,
  VoiceWaveIcon,
} from "@/components/icons/AlongIcons";

const CORRIDORS = [
  {
    id: "BWR-DUT-WUS",
    name: "Bwari -> Dutse -> Gwarinpa -> Berger -> Wuse",
    km: "35.5 km",
    fare: "₦500 - ₦1,800",
    anchor: "A.A. Rano Dutse / Oando Katampe",
  },
  {
    id: "ZUB-KUB-WUS",
    name: "Zuba -> Dei-Dei -> Kubwa -> Berger -> Wuse",
    km: "34.2 km",
    fare: "₦500 - ₦1,500",
    anchor: "NNPC Kubwa Express / Total Dei-Dei",
  },
  {
    id: "ZUB-DEI-DUT",
    name: "Zuba -> Dei-Dei -> Kubwa -> Dutse -> Bwari",
    km: "29.8 km",
    fare: "₦500 - ₦1,400",
    anchor: "Conoil Dei-Dei / A.A. Rano Dutse",
  },
  {
    id: "ZUB-KRM-JAB",
    name: "Zuba -> Gwagwa -> Karmo -> Life Camp -> Jabi",
    km: "25.0 km",
    fare: "₦500 - ₦1,300",
    anchor: "Bovas Karmo / Total Life Camp",
  },
  {
    id: "GWL-LUG-AR1",
    name: "Gwagwalada -> Giri -> Lugbe -> City Gate -> Area 1",
    km: "38.0 km",
    fare: "₦600 - ₦1,800",
    anchor: "Conoil Lugbe Signboard / NIPCO Giri",
  },
  {
    id: "MRB-NYA-CEN",
    name: "Mararaba -> Karu -> Nyanya -> Kugbo -> Central Area",
    km: "21.5 km",
    fare: "₦500 - ₦1,200",
    anchor: "Matrix Orange Mkt / Oando Nyanya",
  },
];

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0A0F0D",
        color: "#F3F6F4",
        padding: "28px 32px 64px",
      }}
    >
      {/* Top Navigation */}
      <header
        style={{
          maxWidth: 1280,
          margin: "0 auto 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: 20,
        }}
      >
        <AlongLogo variant="dark" size="lg" showTagline />
        <nav style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Link
            href="/demo"
            style={{
              background: "#008751",
              color: "#FFFFFF",
              padding: "10px 18px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              border: "1px solid #00A86B",
            }}
          >
            Launch 3-Pane Judge Cockpit (/demo)
          </Link>
          <Link
            href="/driver"
            style={{
              background: "#17221E",
              color: "#F3F6F4",
              padding: "10px 16px",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Driver PWA (/driver)
          </Link>
          <Link
            href="/ops"
            style={{
              background: "#17221E",
              color: "#F3F6F4",
              padding: "10px 16px",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Ops Command (/ops)
          </Link>
          <Link
            href="/t/tok_demo_family_123"
            style={{
              background: "#17221E",
              color: "#F59E0B",
              padding: "10px 16px",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            Live Family Tracker (/t/...)
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: 1280,
          margin: "0 auto 56px",
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 36,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,168,107,0.14)",
              border: "1px solid rgba(0,168,107,0.35)",
              color: "#00A86B",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            <CorridorNodeIcon size={14} color="#00A86B" />
            <span>ABUJA SHARED URBAN CORRIDOR TRANSIT</span>
          </div>

          <h1
            style={{
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 1.08,
              marginBottom: 20,
            }}
          >
            Turn Chaotic Roadside{" "}
            <span style={{ color: "#00A86B" }}>&ldquo;Along&rdquo;</span> Rides
            Into Safe, AI-Orchestrated 4-Seat Pods.
          </h1>

          <p
            style={{
              fontSize: 17,
              color: "#9FB0A7",
              maxWidth: 640,
              marginBottom: 28,
            }}
          >
            Commuters message WhatsApp in English, Nigerian Pidgin, or Hausa (text
            or voice note). Along resolves colloquial Abuja landmarks in under
            15ms, snaps boarding to private filling station forecourts with zero
            Agbero extortion, and locks fares in a double-entry kobo escrow.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link
              href="/demo"
              style={{
                background: "#008751",
                color: "#FFFFFF",
                padding: "14px 26px",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 16,
                border: "1px solid #00A86B",
              }}
            >
              Open Interactive 3-Pane Judge Cockpit -&gt;
            </Link>
            <Link
              href="/ops"
              style={{
                background: "#111916",
                color: "#F3F6F4",
                padding: "14px 22px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 15,
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              Inspect 6-Corridor Command Center
            </Link>
          </div>
        </div>

        {/* Meta AI Stack Card */}
        <div
          style={{
            background: "#111916",
            border: "1px solid rgba(0,168,107,0.3)",
            borderRadius: 18,
            padding: 26,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#F59E0B",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Powered by Official Meta AI Stack
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                background: "#17221E",
                padding: 14,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: "#00A86B" }}>
                1. Meta Muse Spark (muse-spark-1.3) &amp; Muse Wonder
              </div>
              <div style={{ fontSize: 13, color: "#9FB0A7", marginTop: 4 }}>
                Fast multilingual slot extraction (English, Pidgin, Hausa) +
                frontier reasoning for relational Abuja landmarks (&ldquo;that
                Oando after Katampe bridge&rdquo;).
              </div>
            </div>

            <div
              style={{
                background: "#17221E",
                padding: 14,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: "#00A86B" }}>
                2. Meta Muse Voice Transcribe (muse-voice-transcribe)
              </div>
              <div style={{ fontSize: 13, color: "#9FB0A7", marginTop: 4 }}>
                Gazetteer-conditioned speech-to-text for WhatsApp voice notes
                across 140 Abuja landmarks and 1,208 street aliases.
              </div>
            </div>

            <div
              style={{
                background: "#17221E",
                padding: 14,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: "#00A86B" }}>
                3. Meta SAM 3.1 (sam-3.1) &amp; Meta FAISS (768-D)
              </div>
              <div style={{ fontSize: 13, color: "#9FB0A7", marginTop: 4 }}>
                One-time Driver KYC vehicle/plate/4-seat cabin segmentation +
                sub-15ms hybrid vector + Jaro-Winkler landmark resolution.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Abuja Corridors Grid */}
      <section style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>
            6 Active Abuja Commuter Corridors (24 Private Filling Station Anchors)
          </h2>
          <span style={{ fontSize: 13, color: "#9FB0A7" }} className="tabular-nums">
            140 Landmarks | 1,208 Multilingual Aliases | 90% Driver Take-Home
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {CORRIDORS.map((c) => (
            <div
              key={c.id}
              style={{
                background: "#111916",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  className="tabular-nums"
                  style={{
                    background: "rgba(0,168,107,0.16)",
                    color: "#00A86B",
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {c.id}
                </span>
                <span
                  className="tabular-nums"
                  style={{ fontSize: 13, color: "#F59E0B", fontWeight: 700 }}
                >
                  {c.fare}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                {c.name}
              </div>
              <div style={{ fontSize: 12, color: "#9FB0A7" }}>
                Safe Anchors: <strong style={{ color: "#F3F6F4" }}>{c.anchor}</strong> ({c.km})
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
