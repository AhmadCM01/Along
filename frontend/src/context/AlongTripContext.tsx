"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  StageTrace,
  ResolverScores,
  ActivePodPassenger,
  getActivePod,
  resetActivePod,
  getOrCreateSessionId,
  verifyBoardingOtp,
} from "@/lib/api";

export interface PodPassenger {
  seatNumber: 1 | 2 | 3 | 4;
  seatLabel: string;
  passengerName: string;
  dropLocation: string;
  fareNaira: number;
  otpCode: string;
  isBoarded: boolean;
  isCurrentUser?: boolean;
  simulated?: boolean;
  seatsOccupied?: number;
  request_id?: string;
}

export interface TripQuote {
  corridorId: string;
  originName: string;
  destName: string;
  anchorId: string;
  anchorName: string;
  seats: number;
  unitFare: string;
  totalFare: string;
  otp: string;
  shareToken: string;
  podGross?: string;
  driverNet?: string;
  platformFee?: string;
}

export interface DriverInfo {
  podCode: string;
  driverName: string;
  plateNumber: string;
  vehicleDesc: string;
  phoneMode: string;
  ussdShortcode: string;
}

export interface PersistedChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  isVoice?: boolean;
  voiceDuration?: string;
  voiceLabel?: string;
  audioUrl?: string;
  timestamp: string;
  isConfirmed?: boolean;
  isSampleOffline?: boolean;
  quoteData?: {
    corridorId: string;
    anchorName: string;
    destName: string;
    seats: number;
    unitFare: string;
    totalFare: string;
    otp: string;
    shareToken?: string | null;
  };
  isSos?: boolean;
}

export type PodJourneyStage =
  | "IDLE"
  | "PROPOSAL"
  | "CONFIRMED"
  | "WAITING_FOR_DRIVER"
  | "DRIVER_ON_THE_WAY"
  | "BOARDING"
  | "IN_TRANSIT"
  | "COMPLETED";

export interface ServerTripSnapshot {
  podId: string;
  stage: string;
  stageLabel: string;
  progress: number;
  position: { lat: number; lon: number } | null;
  previousWaypoint: string;
  nextWaypoint: string;
  etaSeconds: number;
  boardedCount: number;
  passengers: ActivePodPassenger[];
  driver: DriverInfo;
  serverTime: number;
  departedAt: number | null;
  sosActive: boolean;
}

interface AlongTripContextType {
  sessionId: string;
  shareToken: string;
  podId: string;
  serverSnapshot: ServerTripSnapshot | null;
  setServerSnapshot: React.Dispatch<React.SetStateAction<ServerTripSnapshot | null>>;
  activeCorridorId: string;
  setActiveCorridorId: (id: string) => void;
  activeLocale: "en" | "pcm" | "ha";
  setActiveLocale: (locale: "en" | "pcm" | "ha") => void;
  currentQuote: TripQuote | null;
  setCurrentQuote: (q: TripQuote | null) => void;
  journeyStage: PodJourneyStage;
  setJourneyStage: (stage: PodJourneyStage) => void;
  driverInfo: DriverInfo;
  passengers: PodPassenger[];
  boardPassengerByOtp: (otp: string) => Promise<boolean>;
  boardPassengerBySeat: (seatNumber: 1 | 2 | 3 | 4, boarded: boolean) => void;
  confirmBooking: () => void;
  startCorridorTrip: () => void;
  resetAll: () => Promise<void>;
  activeShareToken: string;
  traces: StageTrace[];
  setTraces: (t: StageTrace[]) => void;
  resolverScores: {
    originName: string;
    originScores: ResolverScores | null;
    destName: string;
    destScores: ResolverScores | null;
  } | null;
  setResolverScores: (scores: any) => void;
  audioPlaying: boolean;
  setAudioPlaying: (playing: boolean) => void;
  aiDrawerOpen: boolean;
  setAiDrawerOpen: (open: boolean) => void;
  multiRiderDrawerOpen: boolean;
  setMultiRiderDrawerOpen: (open: boolean) => void;
  persistedMessages: PersistedChatMessage[];
  setPersistedMessages: React.Dispatch<React.SetStateAction<PersistedChatMessage[]>>;
  refreshServerPod: (podIdOverride?: string) => Promise<void>;
}

const DEFAULT_DRIVER: DriverInfo = {
  podCode: "POD-842A",
  driverName: "Musa Bello",
  plateNumber: "ABJ-402-AL",
  vehicleDesc: "Volkswagen Golf 4 (Emerald Green)",
  phoneMode: "SMARTPHONE_AND_2G_USSD",
  ussdShortcode: "*384*247#",
};

const AlongTripContext = createContext<AlongTripContextType | undefined>(undefined);

const STORAGE_KEY = "along_trip_session_v7";

export function AlongTripProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string>("");
  const [activeCorridorId, setActiveCorridorId] = useState<string>("BWR-DUT-WUS");
  const [activeLocale, setActiveLocale] = useState<"en" | "pcm" | "ha">("pcm");
  const [currentQuote, setCurrentQuote] = useState<TripQuote | null>(null);
  const [activeShareToken, setActiveShareToken] = useState<string>("");
  const [podId, setPodId] = useState<string>("POD-842A");
  const [serverSnapshot, setServerSnapshot] = useState<ServerTripSnapshot | null>(null);

  const [traces, setTraces] = useState<StageTrace[]>([]);
  const [resolverScores, setResolverScores] = useState<any>(null);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState<boolean>(false);
  const [multiRiderDrawerOpen, setMultiRiderDrawerOpen] = useState<boolean>(false);
  const [persistedMessages, setPersistedMessages] = useState<PersistedChatMessage[]>([]);
  const [isBooked, setIsBooked] = useState<boolean>(false);

  // Initialize session ID from localStorage on mount
  useEffect(() => {
    const sid = getOrCreateSessionId();
    setSessionId(sid);
  }, []);

  // Restore cached user messages & quote
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.activeCorridorId) setActiveCorridorId(parsed.activeCorridorId);
        if (parsed.activeLocale) setActiveLocale(parsed.activeLocale);
        if (parsed.currentQuote) setCurrentQuote(parsed.currentQuote);
        if (parsed.activeShareToken) setActiveShareToken(parsed.activeShareToken);
        if (parsed.podId) setPodId(parsed.podId);
        if (parsed.isBooked) setIsBooked(Boolean(parsed.isBooked));
        if (Array.isArray(parsed.persistedMessages)) setPersistedMessages(parsed.persistedMessages);
      }
    } catch {}
  }, []);

  // Save session info
  useEffect(() => {
    try {
      const payload = {
        activeCorridorId,
        activeLocale,
        currentQuote,
        activeShareToken,
        podId,
        isBooked,
        persistedMessages,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [activeCorridorId, activeLocale, currentQuote, activeShareToken, podId, isBooked, persistedMessages]);

  // Sync share token & corridor from quote
  useEffect(() => {
    if (currentQuote) {
      if (currentQuote.shareToken) {
        setActiveShareToken(currentQuote.shareToken);
      }
      if (currentQuote.corridorId) {
        setActiveCorridorId(currentQuote.corridorId);
      }
    }
  }, [currentQuote]);

  // Derive driver info from server snapshot or quote
  const driverInfo: DriverInfo = serverSnapshot?.driver || {
    ...DEFAULT_DRIVER,
    podCode: serverSnapshot?.podId || podId,
  };

  // Derive journey stage from server snapshot (authoritative)
  const journeyStage: PodJourneyStage = (() => {
    if (serverSnapshot?.stage) {
      const s = serverSnapshot.stage.toUpperCase();
      if (s === "COMPLETED") return "COMPLETED";
      if (s === "IN_TRANSIT") return "IN_TRANSIT";
      if (s === "BOARDING") return "BOARDING";
      if (s === "DRIVER_ON_THE_WAY") return "DRIVER_ON_THE_WAY";
      if (s === "WAITING_FOR_DRIVER") return "WAITING_FOR_DRIVER";
      return s as PodJourneyStage;
    }
    if (isBooked) return "CONFIRMED";
    if (currentQuote) return "PROPOSAL";
    return "IDLE";
  })();

  const setJourneyStage = useCallback((stage: PodJourneyStage) => {
    if (stage === "CONFIRMED") setIsBooked(true);
    else if (stage === "IDLE") setIsBooked(false);
  }, []);

  // Poll server pod state
  const refreshServerPod = useCallback(
    async (podIdOverride?: string) => {
      try {
        const targetPod = podIdOverride || podId;
        const res = await getActivePod(activeCorridorId, targetPod !== "POD-842A" ? targetPod : undefined);
        if (res && res.pod) {
          const p = res.pod;
          if (p.pod_id) setPodId(p.pod_id);
          setServerSnapshot({
            podId: p.pod_id,
            stage: p.stage || p.status || "WAITING_FOR_DRIVER",
            stageLabel: p.stage_label || p.status || "Standing by",
            progress: p.progress ?? 0.0,
            position: p.anchor_lat && p.anchor_lng ? { lat: p.anchor_lat, lon: p.anchor_lng } : null,
            previousWaypoint: "",
            nextWaypoint: "",
            etaSeconds: 0,
            boardedCount: p.passengers.filter((x) => x.is_boarded).reduce((acc, x) => acc + (x.seats || 1), 0),
            passengers: p.passengers,
            driver: {
              podCode: p.pod_id,
              driverName: p.driver_name || "Musa Bello",
              plateNumber: p.plate_number || "ABJ-402-AL",
              vehicleDesc: p.vehicle_desc || "Volkswagen Golf 4 (Emerald Green)",
              phoneMode: "SMARTPHONE_AND_2G_USSD",
              ussdShortcode: "*384*247#",
            },
            serverTime: Date.now() / 1000,
            departedAt: p.departed_at || null,
            sosActive: false,
          });
        }
      } catch {
        // Ignore network polling failure
      }
    },
    [activeCorridorId, podId]
  );

  // Derive passengers strictly from server snapshot
  const passengers: PodPassenger[] = (serverSnapshot?.passengers || []).map((p, idx) => {
    const seatNum = (idx + 1) as 1 | 2 | 3 | 4;
    const isUser = !p.simulated || p.display_name.includes("(you)");
    return {
      seatNumber: seatNum,
      seatLabel: `SEAT ${seatNum}`,
      passengerName: p.display_name,
      dropLocation: p.destination,
      fareNaira: p.fare_naira,
      otpCode: p.otp_code,
      isBoarded: p.is_boarded,
      isCurrentUser: isUser,
      simulated: p.simulated,
      seatsOccupied: p.seats,
      request_id: p.request_id,
    };
  });

  const confirmBooking = useCallback(() => {
    setIsBooked(true);
    refreshServerPod().catch(() => {});
  }, [refreshServerPod]);

  const startCorridorTrip = useCallback(() => {
    // Stage advances only via server dispatch
    refreshServerPod().catch(() => {});
  }, [refreshServerPod]);

  const boardPassengerByOtp = useCallback(
    async (otp: string): Promise<boolean> => {
      try {
        const targetPod = serverSnapshot?.podId || podId;
        const res = await verifyBoardingOtp("DRV-001", targetPod, otp.trim(), "auto");
        await refreshServerPod();
        return res.status === "BOARDED";
      } catch {
        return false;
      }
    },
    [serverSnapshot?.podId, podId, refreshServerPod]
  );

  const boardPassengerBySeat = useCallback(
    (_seatNumber: 1 | 2 | 3 | 4, _boarded: boolean) => {
      // Direct seat toggles without server are disabled; triggers pod refresh
      refreshServerPod().catch(() => {});
    },
    [refreshServerPod]
  );

  const resetAll = useCallback(async () => {
    setCurrentQuote(null);
    setIsBooked(false);
    setActiveShareToken("");
    setServerSnapshot(null);
    setTraces([]);
    setResolverScores(null);
    setPersistedMessages([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    try {
      await resetActivePod(activeCorridorId);
    } catch {}
  }, [activeCorridorId]);

  return (
    <AlongTripContext.Provider
      value={{
        sessionId,
        shareToken: activeShareToken,
        podId,
        serverSnapshot,
        setServerSnapshot,
        activeCorridorId,
        setActiveCorridorId,
        activeLocale,
        setActiveLocale,
        currentQuote,
        setCurrentQuote,
        journeyStage,
        setJourneyStage,
        driverInfo,
        passengers,
        boardPassengerByOtp,
        boardPassengerBySeat,
        confirmBooking,
        startCorridorTrip,
        resetAll,
        activeShareToken,
        traces,
        setTraces,
        resolverScores,
        setResolverScores,
        audioPlaying,
        setAudioPlaying,
        aiDrawerOpen,
        setAiDrawerOpen,
        multiRiderDrawerOpen,
        setMultiRiderDrawerOpen,
        persistedMessages,
        setPersistedMessages,
        refreshServerPod,
      }}
    >
      {children}
    </AlongTripContext.Provider>
  );
}

export function useAlongTrip() {
  const ctx = useContext(AlongTripContext);
  if (!ctx) {
    throw new Error("useAlongTrip must be used within an AlongTripProvider");
  }
  return ctx;
}
