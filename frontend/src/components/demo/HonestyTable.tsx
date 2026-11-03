"use client";

import React, { useState, useEffect } from "react";

export function HonestyTable() {
  const [liveModel, setLiveModel] = useState<string>("Muse Spark Open (via Baseten)");

  useEffect(() => {
    fetch("/api/v1/status")
      .then((res) => res.json())
      .then((data) => {
        const primary = data?.levels?.primary;
        const modelLabel =
          primary?.model_label || primary?.response_model_id || primary?.requested_model;
        if (modelLabel && modelLabel !== "none") {
          setLiveModel(modelLabel);
        }
      })
      .catch(() => {});
  }, []);

  const rows = [
    {
      capability: "Multilingual slot extraction & NLU",
      status: "Live",
      details: `${liveModel} (primary) & Llama 3.2 Vision via NVIDIA NIM (fallback)`,
    },
    {
      capability: "Speech to text",
      status: "Live",
      details: "OpenAI Whisper (whisper-large-v3-turbo via Groq) & Web Audio API (sub-500ms)",
    },
    {
      capability: "Landmark & corridor resolution",
      status: "Live",
      details: "Character n-gram hashing + Jaro-Winkler reranking over FAISS index (142 landmarks, 1,122 aliases)",
    },
    {
      capability: "Boarding code verification",
      status: "Live",
      details: "Per-trip 4-digit OTP, HMAC-SHA256 verification, 30m expiry, 3-attempt lock, 150m anchor geofence",
    },
    {
      capability: "Escrow ledger",
      status: "Simulated",
      details: "Simulated escrow ledger with 90/10 driver split (live NIP banking integration on Roadmap)",
    },
    {
      capability: "Pod vehicle & GPS",
      status: "Simulated",
      details: "Driver and vehicle telemetry simulated along real Abuja road coordinates",
    },
    {
      capability: "Vehicle KYC & NIN",
      status: "Roadmap",
      details: "Meta SAM 3.1 vehicle segmentation & NIN identity verification (on Roadmap; simulated in prototype)",
    },
  ];

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-card)",
        padding: "16px 20px",
        boxShadow: "var(--shadow-soft)",
      }}
      aria-label="Evaluation Transparency Table"
    >
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-ink)", margin: 0 }}>
          What runs live vs simulated
        </h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, marginBottom: 0 }}>
          Full technical honesty for Meta AI Hackathon evaluators.
        </p>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, marginBottom: 0, fontStyle: "italic" }}>
          Data note: Landmarks, local names and fares were compiled from local knowledge and driver input. They are approximate and illustrative.
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="along-honesty-desktop" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                textAlign: "left",
                color: "var(--text-muted)",
              }}
            >
              <th style={{ padding: "6px 8px 8px 0" }}>Component</th>
              <th style={{ padding: "6px 8px 8px 0", width: 90 }}>Status</th>
              <th style={{ padding: "6px 0 8px 0" }}>Implementation Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: i < rows.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}
              >
                <td style={{ padding: "8px 8px 8px 0", fontWeight: 600, color: "var(--text-ink)" }}>
                  {r.capability}
                </td>
                <td style={{ padding: "8px 8px 8px 0" }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background:
                        r.status === "Live"
                          ? "var(--brand-soft)"
                          : r.status === "Roadmap"
                          ? "rgba(100, 116, 139, 0.12)"
                          : "var(--signal-soft)",
                      color:
                        r.status === "Live"
                          ? "var(--brand-primary)"
                          : r.status === "Roadmap"
                          ? "var(--text-muted)"
                          : "var(--signal-ink)",
                    }}
                  >
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: "8px 0", color: "var(--text-muted)", fontSize: 12.5 }}>
                  {r.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Stack View */}
      <div className="along-honesty-mobile" style={{ display: "none", flexDirection: "column", gap: 8 }}>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              padding: "10px 12px",
              background: "var(--bg-paper)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-button)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-ink)" }}>
                {r.capability}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background:
                    r.status === "Live"
                      ? "var(--brand-soft)"
                      : r.status === "Roadmap"
                      ? "rgba(100, 116, 139, 0.12)"
                      : "var(--signal-soft)",
                  color:
                    r.status === "Live"
                      ? "var(--brand-primary)"
                      : r.status === "Roadmap"
                      ? "var(--text-muted)"
                      : "var(--signal-ink)",
                }}
              >
                {r.status}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.35 }}>
              {r.details}
            </p>
          </div>
        ))}
      </div>

      {/* How It Works & Affiliation Disclosure */}
      <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--border-subtle)", fontSize: 11.5, color: "var(--text-muted)" }}>
        <div style={{ fontWeight: 700, color: "var(--text-ink)", marginBottom: 3 }}>How it works</div>
        <p style={{ margin: "2px 0 6px", lineHeight: 1.45 }}>
          Riders request shared corridor trips by voice or text. Along matches riders into 4-seat pods departing from safe private filling station forecourts, secured by simulated double-entry escrow.
        </p>
        <p style={{ margin: 0, fontStyle: "italic", fontSize: 11 }}>
          Along is an independent project. It is not affiliated with or endorsed by WhatsApp or Meta.
        </p>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          .along-honesty-desktop {
            display: none !important;
          }
          .along-honesty-mobile {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
