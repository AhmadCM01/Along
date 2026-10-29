import React from "react";
import { StageTrace } from "@/lib/api";

export interface BehindTheScenesProps {
  traces?: StageTrace[];
  resolverScores?: Array<{
    candidate: string;
    score: number;
    corridor: string;
    alias_type?: string;
  }>;
  fallback?: boolean;
  fallbackBanner?: string | null;
  replayMode?: boolean;
  replayDate?: string | null;
  onToggleReplay?: () => void;
  isLoading?: boolean;
  elapsedSeconds?: number;
  errorMessage?: string | null;
}

/**
 * Behind The Scenes AI Inspector.
 * Strictly renders real backend traces, model IDs, measured latencies, and resolver scores.
 */
export function BehindTheScenes({
  traces = [],
  resolverScores = [],
  fallback = false,
  fallbackBanner,
  replayMode = false,
  replayDate,
  onToggleReplay,
  isLoading = false,
  elapsedSeconds = 0,
  errorMessage,
}: BehindTheScenesProps) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-card)",
        padding: "18px 20px",
        boxShadow: "var(--shadow-soft)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
      aria-label="Behind the scenes AI telemetry"
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-ink)" }}>
            Behind the Scenes: Meta AI & Pipeline Telemetry
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Real traces returned by the backend inference pipeline.
          </p>
        </div>

        {onToggleReplay && replayDate && (
          <button
            onClick={onToggleReplay}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: "var(--radius-chip)",
              background: replayMode ? "var(--brand-soft)" : "var(--bg-paper)",
              color: replayMode ? "var(--brand-primary)" : "var(--text-muted)",
              border: `1px solid ${replayMode ? "var(--brand-primary)" : "var(--border-subtle)"}`,
            }}
          >
            {replayMode ? "Replay active" : "Replay mode"}
          </button>
        )}
      </div>

      {/* Replay Notice */}
      {replayMode && replayDate && (
        <div
          style={{
            padding: "8px 12px",
            background: "var(--brand-soft)",
            border: "1px solid var(--brand-primary)",
            borderRadius: "var(--radius-input)",
            fontSize: 12,
            color: "var(--brand-primary)",
            fontWeight: 600,
          }}
        >
          Replayed trace recorded on {replayDate}
        </div>
      )}

      {/* Fallback Banner */}
      {fallback && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--signal-soft)",
            border: "1px solid var(--signal-amber)",
            borderRadius: "var(--radius-input)",
            fontSize: 12.5,
            color: "var(--signal-ink)",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>⚠️</span>
          <span>{fallbackBanner || "The AI model did not answer, so a simpler rule-based answer was used"}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--danger-soft)",
            border: "1px solid var(--danger-red)",
            borderRadius: "var(--radius-input)",
            fontSize: 12.5,
            color: "var(--danger-red)",
            fontWeight: 600,
          }}
        >
          Backend error: {errorMessage}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--brand-soft)",
            border: "1px solid var(--brand-primary)",
            borderRadius: "var(--radius-input)",
            fontSize: 13,
            color: "var(--brand-primary)",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span className="along-pulse">●</span>
          <span>Processing pipeline request ({elapsedSeconds.toFixed(1)}s elapsed)...</span>
        </div>
      )}

      {/* Real Pipeline Traces */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 8,
          }}
        >
          Inference Pipeline Stages ({traces.length})
        </div>

        {traces.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
            Awaiting first chat or voice interaction to capture live trace.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {traces.map((t, idx) => (
              <div
                key={idx}
                style={{
                  padding: "10px 12px",
                  background: "var(--bg-paper)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-input)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12.5,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text-ink)" }}>
                    {idx + 1}. {t.stage}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                    Provider: <strong>{t.provider_label}</strong> · Model: <code>{t.model_id}</code>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: t.fallback ? "var(--signal-amber)" : "var(--brand-primary)",
                    }}
                  >
                    {t.latency_ms}ms
                  </span>
                  {t.fallback && (
                    <div style={{ fontSize: 10, color: "var(--signal-amber)", fontWeight: 700 }}>
                      FALLBACK
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real Resolver Scores from Backend */}
      {resolverScores.length > 0 && (
        <div style={{ paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Real Landmark Resolver Confidence Scores
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {resolverScores.map((score, sIdx) => (
              <div
                key={sIdx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                  padding: "6px 8px",
                  background: "var(--bg-paper)",
                  borderRadius: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-ink)" }}>
                    {score.candidate}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    ({score.corridor})
                  </span>
                </div>
                <span
                  className="tabular-nums"
                  style={{
                    fontWeight: 700,
                    color: score.score > 0.85 ? "var(--brand-primary)" : "var(--text-muted)",
                  }}
                >
                  {(score.score * 100).toFixed(1)}% match
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
