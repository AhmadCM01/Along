import React from "react";

export function HonestyTable() {
  const rows = [
    {
      capability: "Multilingual slot extraction",
      status: "Live",
      details: "Llama-3.1-70B / muse-spark-open via Baseten (sub-3s)",
    },
    {
      capability: "Speech to text (Voice notes)",
      status: "Live",
      details: "Whisper ASR via Groq (Non-Meta ASR label)",
    },
    {
      capability: "Landmark & corridor resolution",
      status: "Live",
      details: "Character n-gram hashing and Jaro-Winkler scoring (sub-15ms)",
    },
    {
      capability: "Boarding code security",
      status: "Live",
      details: "Per-trip random OTP, HMAC verification, 30m expiry, 5-attempt lock",
    },
    {
      capability: "Double-entry escrow ledger",
      status: "Simulated",
      details: "Atomic ledger balance simulated for hackathon demo without live NIP",
    },
    {
      capability: "Pod vehicle & GPS",
      status: "Simulated",
      details: "Driver and vehicle telemetry simulated along real Abuja road coordinates",
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
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: r.status === "Live" ? "var(--brand-soft)" : "var(--signal-soft)",
                      color: r.status === "Live" ? "var(--brand-primary)" : "var(--signal-ink)",
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
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: r.status === "Live" ? "var(--brand-soft)" : "var(--signal-soft)",
                  color: r.status === "Live" ? "var(--brand-primary)" : "var(--signal-ink)",
                }}
              >
                {r.status}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.35 }}>
              {r.details}
            </p>
          </div>
        ))}
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
