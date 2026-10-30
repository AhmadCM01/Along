"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { StageTrace, ResolverScores } from "@/lib/api";

export interface PodPassenger {
  seatNumber: 1 | 2 | 3 | 4;
  seatLabel: string;
  passengerName: string;
  dropLocation: string;
  fareNaira: number;
  otpCode: string;
  isBoarded: boolean;
  isCurrentUser?: boolean;
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
  timestamp: string;
  isConfirmed?: boolean;
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

export type PodJourneyStage = "IDLE" | "PROPOSAL" | "CONFIRMED" | "IN_TRANSIT" | "COMPLETED";

interface AlongTripContextType {
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
  boardPassengerByOtp: (otp: string) => boolean;
  boardPassengerBySeat: (seatNumber: 1 | 2 | 3 | 4, boarded: boolean) => void;
  confirmBooking: () => void;
  resetAll: () => void;
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
  persistedMessages: PersistedChatMessage[];
  setPersistedMessages: React.Dispatch<React.SetStateAction<PersistedChatMessage[]>>;
}

const DEFAULT_PASSENGERS: PodPassenger[] = [
  {
    seatNumber: 1,
    seatLabel: "FRONT SEAT",
    passengerName: "Amina Bello",
    dropLocation: "Wuse Market",
    fareNaira: 900,
    otpCode: "9123",
    isBoarded: true,
  },
  {
    seatNumber: 2,
    seatLabel: "BACK LEFT",
    passengerName: "Emeka Nwosu",
    dropLocation: "Berger Roundabout",
    fareNaira: 900,
    otpCode: "6341",
    isBoarded: true,
  },
  {
    seatNumber: 3,
    seatLabel: "BACK MIDDLE",
    passengerName: "Bello K.",
    dropLocation: "Mabushi",
    fareNaira: 700,
    otpCode: "7820",
    isBoarded: true,
  },
  {
    seatNumber: 4,
    seatLabel: "BACK RIGHT",
    passengerName: "Commuter (You)",
    dropLocation: "Berger Roundabout Underbridge",
    fareNaira: 1800,
    otpCode: "4817",
    isBoarded: false,
    isCurrentUser: true,
  },
];

const DEFAULT_DRIVER: DriverInfo = {
  podCode: "POD-842A",
  driverName: "Musa Bello",
  plateNumber: "ABJ-402-AL",
  vehicleDesc: "Volkswagen Golf 4 (Silver)",
  phoneMode: "SMARTPHONE_AND_2G_USSD",
  ussdShortcode: "*384*247#",
};

const AlongTripContext = createContext<AlongTripContextType | undefined>(undefined);

const STORAGE_KEY = "along_trip_session_v4";

export function AlongTripProvider({ children }: { children: React.ReactNode }) {
  const [activeCorridorId, setActiveCorridorId] = useState<string>("BWR-DUT-WUS");
  const [activeLocale, setActiveLocale] = useState<"en" | "pcm" | "ha">("pcm");
  const [currentQuote, setCurrentQuote] = useState<TripQuote | null>(null);
  const [journeyStage, setJourneyStage] = useState<PodJourneyStage>("IDLE");
  const [driverInfo] = useState<DriverInfo>(DEFAULT_DRIVER);
  const [passengers, setPassengers] = useState<PodPassenger[]>(DEFAULT_PASSENGERS);
  const [activeShareToken, setActiveShareToken] = useState<string>("share-bwr-4817");
  const [traces, setTraces] = useState<StageTrace[]>([]);
  const [resolverScores, setResolverScores] = useState<any>(null);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState<boolean>(false);
  const [persistedMessages, setPersistedMessages] = useState<PersistedChatMessage[]>([]);

  // Restore from sessionStorage on client mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.activeCorridorId) setActiveCorridorId(parsed.activeCorridorId);
        if (parsed.activeLocale) setActiveLocale(parsed.activeLocale);
        if (parsed.currentQuote) setCurrentQuote(parsed.currentQuote);
        if (parsed.journeyStage) setJourneyStage(parsed.journeyStage);
        if (parsed.passengers) setPassengers(parsed.passengers);
        if (parsed.activeShareToken) setActiveShareToken(parsed.activeShareToken);
        if (Array.isArray(parsed.persistedMessages)) setPersistedMessages(parsed.persistedMessages);
        if (Array.isArray(parsed.traces)) setTraces(parsed.traces);
        if (parsed.resolverScores) setResolverScores(parsed.resolverScores);
      }
    } catch {}
  }, []);

  // Save to sessionStorage when key fields change
  useEffect(() => {
    try {
      const payload = {
        activeCorridorId,
        activeLocale,
        currentQuote,
        journeyStage,
        passengers,
        activeShareToken,
        persistedMessages,
        traces,
        resolverScores,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [
    activeCorridorId,
    activeLocale,
    currentQuote,
    journeyStage,
    passengers,
    activeShareToken,
    persistedMessages,
    traces,
    resolverScores,
  ]);

  // Synchronize seat 4 and activeCorridorId with currentQuote if available
  useEffect(() => {
    if (currentQuote) {
      if (currentQuote.corridorId) {
        setActiveCorridorId(currentQuote.corridorId);
      }
      setPassengers((prev) =>
        prev.map((p) => {
          if (p.isCurrentUser) {
            return {
              ...p,
              passengerName: `Commuter (${currentQuote.seats} ${currentQuote.seats === 1 ? "seat" : "seats"})`,
              dropLocation: currentQuote.destName,
              fareNaira: parseInt(currentQuote.totalFare.replace(/[^0-9]/g, "")) || 1800,
              otpCode: currentQuote.otp || "4817",
            };
          }
          return p;
        })
      );
      if (currentQuote.shareToken) {
        setActiveShareToken(currentQuote.shareToken);
      }
    }
  }, [currentQuote]);

  const confirmBooking = useCallback(() => {
    setJourneyStage("CONFIRMED");
  }, []);

  const boardPassengerByOtp = useCallback((otp: string): boolean => {
    const cleanOtp = otp.trim();
    let matched = false;
    setPassengers((prev) => {
      const updated = prev.map((p) => {
        if (p.otpCode === cleanOtp || (p.isCurrentUser && (cleanOtp === "4817" || cleanOtp === p.otpCode))) {
          matched = true;
          return { ...p, isBoarded: true };
        }
        return p;
      });

      const allBoarded = updated.every((p) => p.isBoarded);
      if (allBoarded || matched) {
        setJourneyStage("IN_TRANSIT");
      }
      return updated;
    });
    return matched;
  }, []);

  const boardPassengerBySeat = useCallback(
    (seatNumber: 1 | 2 | 3 | 4, boarded: boolean) => {
      setPassengers((prev) => {
        const updated = prev.map((p) => (p.seatNumber === seatNumber ? { ...p, isBoarded: boarded } : p));
        const allBoarded = updated.every((p) => p.isBoarded);
        if (allBoarded) {
          setJourneyStage("IN_TRANSIT");
        } else if (journeyStage === "IN_TRANSIT") {
          setJourneyStage("CONFIRMED");
        }
        return updated;
      });
    },
    [journeyStage]
  );

  const resetAll = useCallback(() => {
    setCurrentQuote(null);
    setJourneyStage("IDLE");
    setPassengers(DEFAULT_PASSENGERS);
    setActiveShareToken("share-bwr-4817");
    setTraces([]);
    setResolverScores(null);
    setPersistedMessages([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return (
    <AlongTripContext.Provider
      value={{
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
        persistedMessages,
        setPersistedMessages,
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
