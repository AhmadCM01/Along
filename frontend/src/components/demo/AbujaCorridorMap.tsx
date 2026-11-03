"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { CorridorNode } from "@/components/brand/CorridorNode";
import { useAlongTrip } from "@/context/AlongTripContext";

export interface Waypoint {
  id: string;
  name: string;
  km: number;
  x: number;
  y: number;
  isAnchor: boolean;
  partner: string;
  labelPos: "top" | "bottom";
  keywords: string[];
}

export interface CorridorDefinition {
  id: string;
  name: string;
  highway: string;
  unitFare: string;
  waypoints: Waypoint[];
}

export const CORRIDOR_DATA: Record<string, CorridorDefinition> = {
  "BWR-DUT-WUS": {
    id: "BWR-DUT-WUS",
    name: "Bwari to Wuse",
    highway: "Bwari-Dutse-Murtala Mohammed Expwy (ONEX)",
    unitFare: "₦900",
    waypoints: [
      {
        id: "BWR",
        name: "Bwari / Ushafa",
        km: 0.0,
        x: 105,
        y: 54,
        isAnchor: true,
        partner: "Bwari Central / Ushafa Jct",
        labelPos: "top",
        keywords: ["bwari", "ushafa", "usman dam", "usuma dam", "law school", "nipco"],
      },
      {
        id: "SOK",
        name: "Sokale / Muko",
        km: 11.5,
        x: 195,
        y: 96,
        isAnchor: true,
        partner: "Sokale Roundabout / Dutse Mkt",
        labelPos: "bottom",
        keywords: ["sokale", "muko", "dutse market", "duste market", "alhaji market", "bovas", "matrix"],
      },
      {
        id: "DUT",
        name: "Dutse 1st Gate",
        km: 15.1,
        x: 282,
        y: 78,
        isAnchor: true,
        partner: "Dutse First Gate",
        labelPos: "top",
        keywords: ["dutse", "duste", "dutse first gate", "dutse 1st gate", "dutse alhaji", "a.a. rano dutse"],
      },
      {
        id: "GAL",
        name: "Galadima / Dawaki",
        km: 19.0,
        x: 365,
        y: 122,
        isAnchor: true,
        partner: "Galadima / Dawaki Jct",
        labelPos: "bottom",
        keywords: ["galadima", "galadimawa", "dawaki", "news engineering"],
      },
      {
        id: "GWA",
        name: "Gwarinpa / Oando",
        km: 24.5,
        x: 452,
        y: 102,
        isAnchor: true,
        partner: "Gwarinpa / Oando Katampe",
        labelPos: "top",
        keywords: ["gwarinpa", "3rd avenue", "1st avenue", "katampe", "oando", "setraco"],
      },
      {
        id: "BER",
        name: "Mabushi / Berger",
        km: 31.0,
        x: 548,
        y: 168,
        isAnchor: true,
        partner: "Berger Roundabout",
        labelPos: "bottom",
        keywords: ["mabushi", "berger", "gadar", "underbridge", "utako"],
      },
      {
        id: "WUS",
        name: "Banex / Wuse",
        km: 35.5,
        x: 648,
        y: 138,
        isAnchor: true,
        partner: "Wuse Market / Banex",
        labelPos: "top",
        keywords: ["wuse", "kasuwar", "banex", "mpape", "central area", "secretariat", "maitama", "area 1", "aya"],
      },
    ],
  },
  "ZUB-KUB-WUS": {
    id: "ZUB-KUB-WUS",
    name: "Zuba to Wuse",
    highway: "Kubwa Expressway (Murtala Mohammed Way)",
    unitFare: "₦900",
    waypoints: [
      {
        id: "ZUB",
        name: "Zuba",
        km: 0.0,
        x: 72,
        y: 94,
        isAnchor: true,
        partner: "Conoil Zuba",
        labelPos: "top",
        keywords: ["zuba"],
      },
      {
        id: "DEI",
        name: "Dei-Dei",
        km: 8.5,
        x: 178,
        y: 148,
        isAnchor: true,
        partner: "NNPC Dei-Dei",
        labelPos: "bottom",
        keywords: ["dei-dei", "deidei"],
      },
      {
        id: "KUB",
        name: "Kubwa Arab Rd",
        km: 18.0,
        x: 292,
        y: 112,
        isAnchor: true,
        partner: "TotalEnergies Kubwa",
        labelPos: "top",
        keywords: ["kubwa", "arab", "nnpc"],
      },
      {
        id: "GWA",
        name: "Gwarinpa",
        km: 26.4,
        x: 412,
        y: 164,
        isAnchor: true,
        partner: "Gwarinpa 3rd Ave Gate",
        labelPos: "bottom",
        keywords: ["gwarinpa", "galadima", "dawaki", "3rd avenue"],
      },
      {
        id: "MAB",
        name: "Utako / Berger",
        km: 33.1,
        x: 536,
        y: 182,
        isAnchor: false,
        partner: "Berger Roundabout",
        labelPos: "bottom",
        keywords: ["utako", "berger", "mabushi"],
      },
      {
        id: "WUS",
        name: "Banex / Wuse",
        km: 38.2,
        x: 662,
        y: 158,
        isAnchor: true,
        partner: "Banex / Wuse Mkt",
        labelPos: "top",
        keywords: ["wuse", "kasuwar", "banex", "mpape", "central area"],
      },
    ],
  },
  "ZUB-DEI-DUT": {
    id: "ZUB-DEI-DUT",
    name: "Zuba to Dutse",
    highway: "Outer Northern Expressway -> Dutse Arterial",
    unitFare: "₦700",
    waypoints: [
      {
        id: "ZUB",
        name: "Zuba",
        km: 0.0,
        x: 72,
        y: 94,
        isAnchor: true,
        partner: "Conoil Zuba",
        labelPos: "top",
        keywords: ["zuba"],
      },
      {
        id: "DEI",
        name: "Dei-Dei Mkt",
        km: 8.2,
        x: 192,
        y: 146,
        isAnchor: true,
        partner: "NNPC Dei-Dei",
        labelPos: "bottom",
        keywords: ["dei-dei", "deidei"],
      },
      {
        id: "KUB",
        name: "Kubwa Express",
        km: 15.0,
        x: 330,
        y: 114,
        isAnchor: false,
        partner: "Kubwa Flyover",
        labelPos: "top",
        keywords: ["kubwa", "dawaki"],
      },
      {
        id: "DUT",
        name: "Dutse Junction",
        km: 20.3,
        x: 472,
        y: 98,
        isAnchor: true,
        partner: "A.A. Rano Dutse",
        labelPos: "bottom",
        keywords: ["dutse", "alhaji", "first gate"],
      },
      {
        id: "BWR",
        name: "Bwari Terminal",
        km: 28.0,
        x: 615,
        y: 62,
        isAnchor: true,
        partner: "NIPCO Bwari",
        labelPos: "top",
        keywords: ["bwari"],
      },
    ],
  },
  "ZUB-KRM-JAB": {
    id: "ZUB-KRM-JAB",
    name: "Zuba to Jabi",
    highway: "Karimo-Life Camp Arterial",
    unitFare: "₦700",
    waypoints: [
      {
        id: "ZUB",
        name: "Zuba",
        km: 0.0,
        x: 72,
        y: 94,
        isAnchor: true,
        partner: "Conoil Zuba",
        labelPos: "top",
        keywords: ["zuba"],
      },
      {
        id: "GWG",
        name: "Gwagwa",
        km: 8.5,
        x: 185,
        y: 172,
        isAnchor: false,
        partner: "Gwagwa Jct",
        labelPos: "bottom",
        keywords: ["gwagwa"],
      },
      {
        id: "KRM",
        name: "Karimo Mkt",
        km: 14.5,
        x: 300,
        y: 196,
        isAnchor: true,
        partner: "A.A. Rano Karimo",
        labelPos: "bottom",
        keywords: ["karimo", "karmo"],
      },
      {
        id: "LIF",
        name: "Life Camp",
        km: 22.0,
        x: 416,
        y: 168,
        isAnchor: true,
        partner: "Oando Life Camp",
        labelPos: "top",
        keywords: ["life camp", "lifecamp"],
      },
      {
        id: "JAB",
        name: "Jabi / Utako",
        km: 28.5,
        x: 538,
        y: 198,
        isAnchor: true,
        partner: "Mobil Jabi Park",
        labelPos: "bottom",
        keywords: ["jabi", "utako", "lake"],
      },
    ],
  },
  "GWL-LUG-AR1": {
    id: "GWL-LUG-AR1",
    name: "Gwagwalada to Area 1",
    highway: "Umaru Musa Yar'Adua Airport Expressway",
    unitFare: "₦1,000",
    waypoints: [
      {
        id: "GWL",
        name: "Gwagwalada",
        km: 0.0,
        x: 78,
        y: 274,
        isAnchor: true,
        partner: "NNPC Mega Gwagwalada",
        labelPos: "top",
        keywords: ["gwagwalada"],
      },
      {
        id: "GIR",
        name: "Giri / Airport Jct",
        km: 12.0,
        x: 205,
        y: 254,
        isAnchor: false,
        partner: "Airport Interchange",
        labelPos: "top",
        keywords: ["giri", "airport"],
      },
      {
        id: "LUG",
        name: "Lugbe Police Signboard",
        km: 27.5,
        x: 356,
        y: 238,
        isAnchor: true,
        partner: "Conoil / Total Lugbe",
        labelPos: "bottom",
        keywords: ["lugbe", "police", "signboard", "conoil"],
      },
      {
        id: "CIT",
        name: "City Gate",
        km: 38.0,
        x: 494,
        y: 218,
        isAnchor: false,
        partner: "City Gate Monument",
        labelPos: "top",
        keywords: ["city gate", "stadium"],
      },
      {
        id: "AR1",
        name: "Area 1 / Central",
        km: 45.0,
        x: 618,
        y: 212,
        isAnchor: true,
        partner: "Total Area 1 Roundabout",
        labelPos: "bottom",
        keywords: ["area 1", "area1", "central", "garki"],
      },
    ],
  },
  "MRB-NYA-CEN": {
    id: "MRB-NYA-CEN",
    name: "Mararaba to Central",
    highway: "Abuja-Keffi Expressway",
    unitFare: "₦600",
    waypoints: [
      {
        id: "MRB",
        name: "Mararaba Orange Mkt",
        km: 0.0,
        x: 702,
        y: 268,
        isAnchor: true,
        partner: "A.A. Rano Mararaba",
        labelPos: "bottom",
        keywords: ["mararaba", "orange", "one man"],
      },
      {
        id: "NYA",
        name: "Nyanya / Karu",
        km: 6.2,
        x: 632,
        y: 244,
        isAnchor: true,
        partner: "Bovas Nyanya Bridge",
        labelPos: "top",
        keywords: ["nyanya", "karu"],
      },
      {
        id: "KUG",
        name: "Kugbo",
        km: 11.5,
        x: 572,
        y: 228,
        isAnchor: false,
        partner: "Kugbo Furniture Mkt",
        labelPos: "bottom",
        keywords: ["kugbo"],
      },
      {
        id: "AYA",
        name: "AYA Asokoro",
        km: 18.0,
        x: 668,
        y: 198,
        isAnchor: true,
        partner: "Total AYA Asokoro",
        labelPos: "top",
        keywords: ["aya", "asokoro"],
      },
      {
        id: "CEN",
        name: "Federal Secretariat",
        km: 23.5,
        x: 604,
        y: 186,
        isAnchor: true,
        partner: "NNPC Central Area",
        labelPos: "top",
        keywords: ["secretariat", "central", "area 10"],
      },
    ],
  },
};

/**
 * Build a smooth Cubic Bezier SVG path through a list of waypoints.
 */
function buildSmoothCurvePath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX},${p0.y} ${midX},${p1.y} ${p1.x},${p1.y}`;
  }
  return d;
}

/**
 * Evaluate cubic bezier point between p0 and p1 at parameter t in [0, 1]
 */
function evalCubicSegment(p0: { x: number; y: number }, p1: { x: number; y: number }, t: number) {
  const midX = (p0.x + p1.x) / 2;
  const cx1 = midX;
  const cy1 = p0.y;
  const cx2 = midX;
  const cy2 = p1.y;

  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  const x = uuu * p0.x + 3 * uu * t * cx1 + 3 * u * tt * cx2 + ttt * p1.x;
  const y = uuu * p0.y + 3 * uu * t * cy1 + 3 * u * tt * cy2 + ttt * p1.y;
  return { x, y };
}

interface AbujaCorridorMapProps {
  corridorId?: string;
  originName?: string;
  destName?: string;
  anchorName?: string;
  journeyStage?: string;
  progressPct?: number;
  driverMarkerLabel?: string;
  onTripCompleted?: () => void;
}

export function AbujaCorridorMap({
  corridorId = "BWR-DUT-WUS",
  originName,
  destName,
  anchorName,
  journeyStage,
  progressPct,
  driverMarkerLabel,
  onTripCompleted,
}: AbujaCorridorMapProps) {
  const trip = useAlongTrip();
  const currentCorridorId = trip.currentQuote?.corridorId || trip.activeCorridorId || corridorId;
  const corridor = CORRIDOR_DATA[currentCorridorId] || CORRIDOR_DATA["BWR-DUT-WUS"];

  const effectiveStage = journeyStage || trip.journeyStage;
  // Strict Lifecycle: Corridor moves when driver has initiated the trip (IN_TRANSIT)
  const isTripInitiated = effectiveStage === "IN_TRANSIT" || effectiveStage === "IN_TRIP";
  const isTripCompleted = effectiveStage === "COMPLETED" || effectiveStage === "ARRIVED";
  const isStandbyOrIdle =
    !effectiveStage ||
    effectiveStage === "IDLE" ||
    effectiveStage === "WAITING_FOR_DRIVER" ||
    effectiveStage === "STANDBY";
  const hasBookingOrQuote =
    !isStandbyOrIdle &&
    (Boolean(trip.currentQuote) ||
      trip.journeyStage === "PROPOSAL" ||
      trip.journeyStage === "CONFIRMED" ||
      isTripInitiated ||
      isTripCompleted);

  // Progress along booked segment [0..1]
  // Starts at 0.0 before trip initiation; progresses to 1.0 when IN_TRANSIT
  const [segmentProgress, setSegmentProgress] = useState<number>(() => {
    if (typeof progressPct === "number") return Math.min(1, Math.max(0, progressPct / 100));
    return isTripInitiated ? 0.06 : 0.0;
  });
  const [hasArrived, setHasArrived] = useState<boolean>(isTripCompleted);

  // Sync with external progressPct if provided
  useEffect(() => {
    if (typeof progressPct === "number") {
      const p = Math.min(1, Math.max(0, progressPct / 100));
      setSegmentProgress(p);
      const arrived = (p >= 1.0 || isTripCompleted) && !isStandbyOrIdle;
      setHasArrived(arrived);
      if (arrived) {
        onTripCompleted?.();
      }
    }
  }, [progressPct, isTripCompleted, isStandbyOrIdle, onTripCompleted]);

  // Reset or start progress when journeyStage or route changes
  useEffect(() => {
    if (typeof progressPct === "number") return;
    if (isTripInitiated) {
      setHasArrived(false);
      setSegmentProgress((prev) => (prev <= 0.02 || prev >= 0.99 ? 0.04 : prev));
    } else if (isTripCompleted) {
      setHasArrived(true);
      setSegmentProgress(1.0);
    } else {
      setHasArrived(false);
      setSegmentProgress(0.0);
    }
  }, [isTripInitiated, isTripCompleted, currentCorridorId, trip.currentQuote?.originName, trip.currentQuote?.destName, progressPct]);

  // Identify pickup and drop-off waypoint indices dynamically from the booked route (supports both North->South and South->North)
  const { pickupIdx, dropIdx, displayAnchorName, displayDestName, shortOriginLabel, shortDestLabel } = useMemo(() => {
    const wps = corridor.waypoints;
    const rawOrigin = trip.currentQuote?.originName || originName || "";
    const rawAnchor = trip.currentQuote?.anchorName || anchorName || "";
    const rawDest = trip.currentQuote?.destName || destName || "";

    const pickupSearch = `${rawOrigin} ${rawAnchor}`.toLowerCase();
    const dropSearch = rawDest.toLowerCase();

    const findBestWaypointIndex = (search: string, excludeIdx = -1) => {
      if (!search.trim()) return -1;
      let bestIdx = -1;
      let bestScore = 0;
      wps.forEach((w, idx) => {
        if (idx === excludeIdx) return;
        const wName = w.name.toLowerCase();
        if (search.includes(wName) && wName.length > bestScore) {
          bestScore = wName.length;
          bestIdx = idx;
        }
        for (const k of w.keywords) {
          if (search.includes(k) && k.length > bestScore) {
            bestScore = k.length;
            bestIdx = idx;
          }
        }
      });
      return bestIdx;
    };

    let pIdx = findBestWaypointIndex(pickupSearch);
    if (pIdx < 0) pIdx = 0;

    let dIdx = findBestWaypointIndex(dropSearch, pIdx);
    if (dIdx < 0 || dIdx === pIdx) {
      dIdx = pIdx < wps.length - 1 ? wps.length - 1 : 0;
    }

    const pWp = wps[pIdx];
    const dWp = wps[dIdx];

    const shortenLabel = (full: string, fallback: string) => {
      if (!full) return fallback;
      const cleaned = full
        .replace(/\b(?:Filling Station|Main Gate|Roundabout Underbridge|Express Junction|Hillside Junction|Setraco Gate|Crush Rock|Old Secretariat|Building Materials Market|Eagle Square)\b/gi, "")
        .replace(/\s*\([^)]*\)/g, "")
        .trim();
      return cleaned.length >= 3 && cleaned.length <= 24 ? cleaned : fallback;
    };

    return {
      pickupIdx: pIdx,
      dropIdx: dIdx,
      displayAnchorName: rawOrigin || rawAnchor || pWp.partner,
      displayDestName: rawDest || dWp.name,
      shortOriginLabel: shortenLabel(rawOrigin || rawAnchor, pWp.name),
      shortDestLabel: shortenLabel(rawDest, dWp.name),
    };
  }, [corridor, trip.currentQuote, anchorName, originName, destName]);

  const pickupWp = corridor.waypoints[pickupIdx];
  const dropWp = corridor.waypoints[dropIdx];

  // Animate vehicle ONLY when trip is initiated (IN_TRANSIT) and until it reaches destination (1.0)
  useEffect(() => {
    if (typeof progressPct === "number" || !isTripInitiated || hasArrived) return;
    const interval = setInterval(() => {
      setSegmentProgress((prev) => {
        const next = prev + 0.008;
        if (next >= 1.0) {
          setHasArrived(true);
          onTripCompleted?.();
          return 1.0;
        }
        return next;
      });
    }, 180);
    return () => clearInterval(interval);
  }, [isTripInitiated, hasArrived, progressPct, onTripCompleted]);

  // All 6 corridors for background Abuja transit network rendering
  const otherCorridors = useMemo(
    () =>
      Object.values(CORRIDOR_DATA)
        .filter((c) => c.id !== corridor.id)
        .map((c) => ({ id: c.id, pathD: buildSmoothCurvePath(c.waypoints) })),
    [corridor.id]
  );

  // Full selected corridor path & booked segment path (supports both forward & reverse travel)
  const fullPathD = useMemo(() => buildSmoothCurvePath(corridor.waypoints), [corridor]);
  const bookedWaypoints = useMemo(() => {
    if (pickupIdx <= dropIdx) {
      return corridor.waypoints.slice(pickupIdx, dropIdx + 1);
    }
    return corridor.waypoints.slice(dropIdx, pickupIdx + 1).reverse();
  }, [corridor, pickupIdx, dropIdx]);
  const bookedPathD = useMemo(() => buildSmoothCurvePath(bookedWaypoints), [bookedWaypoints]);

  // Interpolate vehicle position strictly along bookedWaypoints (Pickup -> Destination)
  const vehicleInfo = useMemo(() => {
    const segCount = Math.max(1, bookedWaypoints.length - 1);
    const clampedProgress = Math.min(1, Math.max(0, segmentProgress));
    const scaled = Math.min(segCount - 0.0001, clampedProgress * segCount);
    const segIdx = Math.max(0, Math.min(Math.floor(scaled), segCount - 1));
    const localT = clampedProgress >= 1 ? 1 : scaled - segIdx;

    const p0 = bookedWaypoints[segIdx];
    const p1 = bookedWaypoints[segIdx + 1] || p0;
    const pos = evalCubicSegment(p0, p1, localT);

    const totalKm = Math.max(1.2, Math.abs(dropWp.km - pickupWp.km));
    const remainingKm = Math.max(0.0, totalKm * (1 - clampedProgress)).toFixed(1);
    const etaMins = clampedProgress >= 1 ? 0 : Math.max(1, Math.ceil(Number(remainingKm) * 0.65));

    return {
      x: pos.x,
      y: pos.y,
      nextStopName: clampedProgress >= 1 ? dropWp.name : p1.name,
      remainingKm,
      etaMins,
      pct: Math.round(clampedProgress * 100),
    };
  }, [bookedWaypoints, segmentProgress, pickupWp, dropWp]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--border-subtle)",
        overflow: "hidden",
        boxShadow: "var(--shadow-soft)",
      }}
      aria-label="Abuja FCT Cartographic Corridor Map"
      role="region"
    >
      {/* Top Map Telemetry Header Bar */}
      <div
        style={{
          padding: "14px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CorridorNode size={18} variant={isTripInitiated ? "pickup" : "default"} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-ink)" }}>
              Abuja FCT Transit Map · {corridor.name} ({corridor.id})
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              {hasBookingOrQuote ? (
                <>
                  Route: <strong>{shortOriginLabel}</strong> ➔ <strong>{shortDestLabel}</strong> ({corridor.highway})
                </>
              ) : (
                <>{corridor.highway} · Select a corridor or book a ride on WhatsApp</>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Trip Lifecycle Status Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isTripInitiated && !hasArrived ? (
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: 999,
                background: "var(--brand-soft)",
                color: "var(--brand-primary)",
                border: "1px solid rgba(5, 150, 105, 0.3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              ● IN TRANSIT · Next: {vehicleInfo.nextStopName} ({vehicleInfo.etaMins} min · {vehicleInfo.remainingKm} km)
            </div>
          ) : hasArrived ? null : hasBookingOrQuote ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: "5px 11px",
                  borderRadius: 999,
                  background: "var(--signal-soft)",
                  color: "var(--signal-ink)",
                  border: "1px solid var(--signal-amber)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                ● STANDBY AT {pickupWp.name.toUpperCase()} · POD BOARDING
              </div>
              <Link
                href={
                  (trip.passengers.find((p) => p.isCurrentUser)?.otpCode || trip.currentQuote?.otp)
                    ? `/driver?code=${encodeURIComponent(
                        trip.passengers.find((p) => p.isCurrentUser)?.otpCode || trip.currentQuote?.otp || ""
                      )}`
                    : "/driver"
                }
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  padding: "5px 11px",
                  borderRadius: 8,
                  background: "var(--brand-primary)",
                  color: "#FFFFFF",
                  textDecoration: "none",
                }}
              >
                Demo Shortcut: Open Driver Terminal ➔
              </Link>
            </div>
          ) : (
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: "5px 11px",
                borderRadius: 999,
                background: "var(--bg-paper)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-mono)",
              }}
            >
              ○ CORRIDOR STANDBY · NO ACTIVE TRIP
            </div>
          )}
        </div>
      </div>

      {/* Styled Abuja FCT Cartographic Map Viewport */}
      <div
        className="along-map-canvas"
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "43%",
          minHeight: 285,
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 760 325"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
          aria-hidden="true"
        >
          <defs>
            <pattern id="abujaCartoGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="var(--border-subtle)"
                strokeWidth="0.5"
                opacity="0.45"
              />
            </pattern>
            <filter id="emeraldRouteGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Cartographic Base Grid */}
          <rect width="760" height="325" fill="url(#abujaCartoGrid)" />

          {/* 2. Abuja Geographic Water Bodies (Usuma Reservoir in Bwari/Ushafa & Jabi Lake) */}
          <path
            d="M 165,18 C 195,14 212,28 198,42 C 184,52 154,46 152,32 Z"
            className="abuja-water-poly"
          />
          <text x="180" y="34" textAnchor="middle" className="abuja-water-label">
            Usuma Dam
          </text>

          <path
            d="M 486,184 C 512,178 525,196 510,208 C 492,216 476,202 486,184 Z"
            className="abuja-water-poly"
          />
          <text x="498" y="199" textAnchor="middle" className="abuja-water-label">
            Jabi Lake
          </text>

          {/* 3. Aso Rock & Katampe Hill Topographic Contours */}
          <ellipse
            cx="712"
            cy="72"
            rx="34"
            ry="18"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.4"
          />
          <text x="712" y="75" textAnchor="middle" className="abuja-district-label">
            ASO ROCK
          </text>

          {/* 4. Abuja District Cartographic Labels (Positioned in clear cartographic margins) */}
          <g className="abuja-district-layer">
            <text x="24" y="24" className="abuja-district-label">BWARI AREA COUNCIL</text>
            <text x="240" y="52" className="abuja-district-label">DUTSE ALHAJI</text>
            <text x="265" y="165" className="abuja-district-label">KUBWA</text>
            <text x="415" y="88" className="abuja-district-label">KATAMPE EXTENSION</text>
            <text x="380" y="212" className="abuja-district-label">GWARINPA / LIFE CAMP</text>
            <text x="595" y="76" className="abuja-district-label">MAITAMA</text>
            <text x="585" y="114" className="abuja-district-label">WUSE II</text>
            <text x="580" y="256" className="abuja-district-label">GARKI / AREA 1</text>
            <text x="695" y="222" className="abuja-district-label">ASOKORO</text>
            <text x="345" y="278" className="abuja-district-label">LUGBE AIRPORT RD</text>
            <text x="95" y="306" className="abuja-district-label">GWAGWALADA</text>
            <text x="650" y="306" className="abuja-district-label">MARARABA / KARU</text>
          </g>

          {/* 5. Other 5 Abuja Corridors (Subtle Slate Transit Network) */}
          {otherCorridors.map((oc) => (
            <path
              key={oc.id}
              d={oc.pathD}
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.35"
            />
          ))}

          {/* 6. Selected Corridor Full Spine */}
          <path
            d={fullPathD}
            fill="none"
            stroke={hasBookingOrQuote ? "var(--corridor-inactive)" : "var(--brand-primary)"}
            strokeWidth={hasBookingOrQuote ? "5.5" : "4"}
            strokeLinecap="round"
            strokeDasharray={hasBookingOrQuote ? "6 6" : "8 5"}
            opacity={hasBookingOrQuote ? 0.65 : 0.45}
          />

          {/* 7. Active Booked Corridor Route Segment (Pickup -> Drop-off) */}
          {hasBookingOrQuote && (
            <>
              <path
                d={bookedPathD}
                fill="none"
                stroke={isTripInitiated || hasArrived ? "var(--brand-primary)" : "var(--signal-amber)"}
                strokeWidth="8"
                strokeLinecap="round"
                filter="url(#emeraldRouteGlow)"
                opacity={isTripInitiated || hasArrived ? 0.32 : 0.18}
              />
              <path
                d={bookedPathD}
                fill="none"
                stroke={isTripInitiated || hasArrived ? "var(--brand-primary)" : "var(--signal-amber)"}
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={isTripInitiated || hasArrived ? "none" : "8 5"}
              />
            </>
          )}

          {/* 8. Waypoint Stations on Selected Corridor */}
          {corridor.waypoints.map((wp, idx) => {
            const isPickup = hasBookingOrQuote && idx === pickupIdx;
            const isDrop = hasBookingOrQuote && idx === dropIdx;
            const minIdx = Math.min(pickupIdx, dropIdx);
            const maxIdx = Math.max(pickupIdx, dropIdx);
            const isWithinTrip = !hasBookingOrQuote || (idx >= minIdx && idx <= maxIdx);
            const labelY = wp.labelPos === "top" ? -14 : 21;
            const badgeY = wp.labelPos === "top" ? -26 : 33;
            const nodeDisplayLabel = isPickup ? shortOriginLabel : isDrop ? shortDestLabel : wp.name;

            return (
              <g
                key={wp.id}
                transform={`translate(${wp.x}, ${wp.y})`}
                style={{ opacity: isWithinTrip ? 1 : 0.42 }}
              >
                {/* Pulsing Ring for Active Pickup or Drop-off */}
                {(isPickup || isDrop) && (
                  <circle
                    cx="0"
                    cy="0"
                    r="15"
                    fill="none"
                    stroke={isPickup ? "var(--brand-primary)" : "var(--signal-amber)"}
                    strokeWidth="2"
                    className="along-pulse-ring"
                  />
                )}

                {/* Station Node Circle */}
                <circle
                  cx="0"
                  cy="0"
                  r={isPickup || isDrop ? 8 : wp.isAnchor ? 5.5 : 4.5}
                  fill={
                    isPickup
                      ? "var(--brand-primary)"
                      : isDrop
                      ? "var(--signal-amber)"
                      : "var(--bg-surface)"
                  }
                  stroke={
                    isPickup || isDrop
                      ? "#FFFFFF"
                      : isWithinTrip
                      ? "var(--brand-primary)"
                      : "var(--border-strong)"
                  }
                  strokeWidth={isPickup || isDrop ? 2.5 : 2}
                />

                {/* Station Name */}
                <text
                  x="0"
                  y={labelY}
                  textAnchor="middle"
                  style={{
                    fontSize: isPickup || isDrop ? 11.5 : 10,
                    fontWeight: isPickup || isDrop ? 800 : 700,
                    fill: "var(--text-ink)",
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  {nodeDisplayLabel}
                </text>

                {/* Role Badge only on Active Pickup & Drop-off to keep intermediate spine uncluttered */}
                {(isPickup || isDrop) && (
                  <text
                    x="0"
                    y={badgeY}
                    textAnchor="middle"
                    style={{
                      fontSize: 8.5,
                      fontWeight: 800,
                      fill: isPickup ? "var(--brand-primary)" : "var(--signal-amber)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {isPickup ? "SAFE PICKUP" : "DESTINATION"}
                  </text>
                )}
              </g>
            );
          })}

          {/* 9. Pod Vehicle Marker (Stationary at Pickup before OTP; Moving along corridor when IN_TRANSIT) */}
          {hasBookingOrQuote && (
            <g
              transform={`translate(${vehicleInfo.x}, ${vehicleInfo.y})`}
              style={{ transition: "transform 160ms linear" }}
            >
              {/* Radar Glow */}
              <circle
                cx="0"
                cy="0"
                r="14"
                fill={isTripInitiated || hasArrived ? "var(--brand-primary)" : "var(--signal-amber)"}
                opacity="0.25"
              />
              {/* Pod Core Dot */}
              <circle
                cx="0"
                cy="0"
                r="7"
                fill={isTripInitiated || hasArrived ? "var(--brand-primary)" : "var(--signal-amber)"}
                stroke="#FFFFFF"
                strokeWidth="2.5"
              />

              {/* Leader Line & Elevated Floating Callout Pill */}
              <line
                x1="0"
                y1="-8"
                x2="0"
                y2="-38"
                stroke={isTripInitiated || hasArrived ? "var(--brand-primary)" : "var(--signal-amber)"}
                strokeWidth="1.5"
              />
              <rect
                x={driverMarkerLabel ? "-86" : "-58"}
                y="-58"
                width={driverMarkerLabel ? "172" : "116"}
                height="20"
                rx="10"
                fill={isTripInitiated || hasArrived ? "var(--brand-primary)" : "#D97706"}
              />
              <text
                x="0"
                y="-44.5"
                textAnchor="middle"
                style={{
                  fontSize: driverMarkerLabel ? 8.6 : 9.2,
                  fontWeight: 800,
                  fill: "#FFFFFF",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {driverMarkerLabel
                  ? `${driverMarkerLabel} · ${vehicleInfo.pct}%`
                  : isTripInitiated
                  ? `POD-842A · ${vehicleInfo.pct}%`
                  : hasArrived
                  ? "POD-842A · ARRIVED"
                  : "POD-842A · BOARDING"}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Dynamic Route Summary Footer (Reflects exact booked anchor & destination, or Preview Mode when idle) */}
      <div
        style={{
          padding: "12px 18px",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-paper)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          fontSize: 12.5,
        }}
      >
        {hasBookingOrQuote ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Safe Pickup Anchor: </span>
                <strong style={{ color: "var(--brand-primary)" }}>{displayAnchorName}</strong>
              </div>
              <span style={{ color: "var(--text-faint)" }}>➔</span>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Booked Destination: </span>
                <strong style={{ color: "var(--text-ink)" }}>{displayDestName}</strong>
              </div>
            </div>

            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {isTripInitiated
                ? `Live GPS Telemetry · ${vehicleInfo.pct}% Complete`
                : hasArrived
                ? "Trip Completed · Simulated Escrow Settled (90/10)"
                : "Waiting for Driver OTP Initiation"}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ color: "var(--text-muted)" }}>Corridor Network Preview:</span>
              <strong style={{ color: "var(--text-ink)" }}>
                {corridor.waypoints[0].name} ➔ {corridor.waypoints[corridor.waypoints.length - 1].name}
              </strong>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                ({corridor.waypoints.length} Safe Corridor Stops · From {corridor.unitFare})
              </span>
            </div>

            <Link
              href="/"
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: "var(--brand-primary)",
                textDecoration: "none",
                fontFamily: "var(--font-mono)",
              }}
            >
              No Active Trip · Book on WhatsApp ➔
            </Link>
          </>
        )}
      </div>

      <style jsx global>{`
        [data-theme="light"] .along-map-canvas {
          background: radial-gradient(circle at 50% 45%, #FFFFFF 0%, #EEF3F7 100%) !important;
        }
        [data-theme="dark"] .along-map-canvas {
          background: radial-gradient(circle at 50% 45%, #162229 0%, #0E171D 100%) !important;
        }

        [data-theme="light"] .abuja-water-poly {
          fill: rgba(14, 165, 233, 0.12);
          stroke: rgba(14, 165, 233, 0.28);
          stroke-width: 1;
        }
        [data-theme="dark"] .abuja-water-poly {
          fill: rgba(56, 189, 248, 0.1);
          stroke: rgba(56, 189, 248, 0.22);
          stroke-width: 1;
        }

        .abuja-water-label {
          font-size: 8px;
          font-weight: 700;
          fill: #0284C7;
          opacity: 0.7;
          font-family: var(--font-mono);
        }

        .abuja-district-label {
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          fill: var(--text-muted);
          opacity: 0.35;
          font-family: var(--font-heading);
          user-select: none;
        }

        @keyframes pulseRing {
          0% {
            r: 8;
            opacity: 0.85;
          }
          100% {
            r: 21;
            opacity: 0;
          }
        }
        .along-pulse-ring {
          animation: pulseRing 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
