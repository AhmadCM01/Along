"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { StageTrace, ResolverScores, resetActivePod } from "@/lib/api";

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
  startCorridorTrip: () => void;
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
  multiRiderDrawerOpen: boolean;
  setMultiRiderDrawerOpen: (open: boolean) => void;
  persistedMessages: PersistedChatMessage[];
  setPersistedMessages: React.Dispatch<React.SetStateAction<PersistedChatMessage[]>>;
}

const CORRIDOR_CO_RIDERS: Record<
  string,
  Array<{ name: string; drop: string; fare: number; otp: string }>
> = {
  "BWR-DUT-WUS": [
    { name: "Rider B", drop: "Katampe Bridge (Oando)", fare: 900, otp: "8241" },
    { name: "Rider C", drop: "Berger Underbridge", fare: 900, otp: "5190" },
    { name: "Rider D", drop: "Wuse Market Main Gate", fare: 1200, otp: "3764" },
  ],
  "ZUB-KUB-WUS": [
    { name: "Hauwa Sani", drop: "Kubwa NNPC Junction", fare: 700, otp: "6412" },
    { name: "Tunde Bakare", drop: "Gwarinpa 3rd Avenue", fare: 900, otp: "2908" },
    { name: "Ngozi Eze", drop: "Wuse Market", fare: 900, otp: "7531" },
  ],
  "ZUB-DEI-DUT": [
    { name: "Suleiman Bello", drop: "Dei-Dei Market", fare: 500, otp: "4182" },
    { name: "Grace Okafor", drop: "Kubwa Arab Road", fare: 700, otp: "9045" },
    { name: "Yusuf Garba", drop: "Dutse Sokale", fare: 700, otp: "6329" },
  ],
  "ZUB-KRM-JAB": [
    { name: "Fatima Aliyu", drop: "Karimo Market", fare: 600, otp: "5821" },
    { name: "David Ojo", drop: "Life Camp Junction", fare: 700, otp: "3194" },
    { name: "Zainab Lawal", drop: "Jabi Lake Mall", fare: 700, otp: "8470" },
  ],
  "GWL-LUG-AR1": [
    { name: "Blessing Nwachukwu", drop: "Airport Junction", fare: 700, otp: "7124" },
    { name: "Abdullahi Shehu", drop: "City Gate Abuja", fare: 900, otp: "3958" },
    { name: "Samuel Adeyemi", drop: "Area 1 Roundabout", fare: 1000, otp: "6204" },
  ],
  "MRB-NYA-CEN": [
    { name: "Ezekiel Audu", drop: "Nyanya Underbridge", fare: 500, otp: "5309" },
    { name: "Halima Usman", drop: "AYA Asokoro", fare: 600, otp: "8146" },
    { name: "Patience Udoh", drop: "Federal Secretariat", fare: 600, otp: "2793" },
  ],
};

function buildCorridorPassengers(quote: TripQuote | null, corridorId: string): PodPassenger[] {
  if (!quote) {
    return [];
  }

  const coRiders = CORRIDOR_CO_RIDERS[quote.corridorId || corridorId] || CORRIDOR_CO_RIDERS["BWR-DUT-WUS"];
  const userSeats = Math.min(4, Math.max(1, quote.seats || 1));
  const unitFareNum = parseInt((quote.unitFare || "900").replace(/[^0-9]/g, ""), 10) || 900;
  const totalFareNum = parseInt((quote.totalFare || "1800").replace(/[^0-9]/g, ""), 10) || unitFareNum * userSeats;
  const seatLabels = ["FRONT SEAT", "BACK LEFT", "BACK MIDDLE", "BACK RIGHT"];

  const coRiderCount = Math.max(0, 4 - userSeats);
  const list: PodPassenger[] = [];

  for (let i = 0; i < coRiderCount; i++) {
    const cr = coRiders[i % coRiders.length];
    list.push({
      seatNumber: (i + 1) as 1 | 2 | 3 | 4,
      seatLabel: seatLabels[i],
      passengerName: cr.name,
      dropLocation: cr.drop,
      fareNaira: unitFareNum,
      otpCode: cr.otp,
      // First co-rider(s) already boarded at forecourt; last co-rider if 3 co-riders can be toggled/verified
      isBoarded: i < coRiderCount - 1 || coRiderCount === 1,
      isCurrentUser: false,
      simulated: true,
      seatsOccupied: 1,
    });
  }

  const userSeatLabel =
    userSeats === 1
      ? seatLabels[coRiderCount] || "BACK RIGHT"
      : `SEATS ${coRiderCount + 1}-${4} (${userSeats} SEATS BOOKED)`;

  list.push({
    seatNumber: 4,
    seatLabel: userSeatLabel,
    passengerName: `You (${userSeats} ${userSeats === 1 ? "Seat" : "Seats"} via WhatsApp)`,
    dropLocation: quote.destName,
    fareNaira: totalFareNum,
    otpCode: quote.otp || "4817",
    isBoarded: false,
    isCurrentUser: true,
    seatsOccupied: userSeats,
  });

  return list;
}

const CORRIDOR_DRIVERS: Record<string, DriverInfo> = {
  "BWR-DUT-WUS": {
    podCode: "POD-842A",
    driverName: "Musa Bello",
    plateNumber: "ABJ-402-AL",
    vehicleDesc: "Volkswagen Golf 4 (Emerald Green)",
    phoneMode: "SMARTPHONE_AND_2G_USSD",
    ussdShortcode: "*384*247#",
  },
  "ZUB-KUB-WUS": {
    podCode: "POD-519K",
    driverName: "Chukwudi Nwosu",
    plateNumber: "ABJ-106-AL",
    vehicleDesc: "Toyota Camry (Black)",
    phoneMode: "SMARTPHONE_AND_2G_USSD",
    ussdShortcode: "*384*247#",
  },
  "ZUB-DEI-DUT": {
    podCode: "POD-208D",
    driverName: "Tunde Adeyemi",
    plateNumber: "ABJ-108-AL",
    vehicleDesc: "Toyota Corolla (Wine Red)",
    phoneMode: "SMARTPHONE_AND_2G_USSD",
    ussdShortcode: "*384*247#",
  },
  "ZUB-KRM-JAB": {
    podCode: "POD-612J",
    driverName: "Bala Mohammed",
    plateNumber: "ABJ-110-AL",
    vehicleDesc: "Volkswagen Golf 4 (Silver)",
    phoneMode: "SMARTPHONE_AND_2G_USSD",
    ussdShortcode: "*384*247#",
  },
  "GWL-LUG-AR1": {
    podCode: "POD-304L",
    driverName: "Peter Okon",
    plateNumber: "ABJ-112-AL",
    vehicleDesc: "Toyota Corolla (Gold)",
    phoneMode: "SMARTPHONE_AND_2G_USSD",
    ussdShortcode: "*384*247#",
  },
  "MRB-NYA-CEN": {
    podCode: "POD-721M",
    driverName: "Kingsley Nnamdi",
    plateNumber: "ABJ-116-AL",
    vehicleDesc: "Toyota Corolla (Blue)",
    phoneMode: "SMARTPHONE_AND_2G_USSD",
    ussdShortcode: "*384*247#",
  },
};

const DEFAULT_DRIVER: DriverInfo = CORRIDOR_DRIVERS["BWR-DUT-WUS"];

const AlongTripContext = createContext<AlongTripContextType | undefined>(undefined);

const STORAGE_KEY = "along_trip_session_v6";

export function AlongTripProvider({ children }: { children: React.ReactNode }) {
  const [activeCorridorId, setActiveCorridorId] = useState<string>("BWR-DUT-WUS");
  const [activeLocale, setActiveLocale] = useState<"en" | "pcm" | "ha">("pcm");
  const [currentQuote, setCurrentQuote] = useState<TripQuote | null>(null);
  const [journeyStage, setJourneyStage] = useState<PodJourneyStage>("IDLE");
  const [driverInfo, setDriverInfo] = useState<DriverInfo>(DEFAULT_DRIVER);
  const [passengers, setPassengers] = useState<PodPassenger[]>([]);
  const [activeShareToken, setActiveShareToken] = useState<string>("");
  const [traces, setTraces] = useState<StageTrace[]>([]);
  const [resolverScores, setResolverScores] = useState<any>(null);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState<boolean>(false);
  const [multiRiderDrawerOpen, setMultiRiderDrawerOpen] = useState<boolean>(false);
  const [persistedMessages, setPersistedMessages] = useState<PersistedChatMessage[]>([]);

  // Keep driver profile dynamically aligned with active corridor
  useEffect(() => {
    const cid = currentQuote?.corridorId || activeCorridorId;
    if (cid && CORRIDOR_DRIVERS[cid]) {
      setDriverInfo(CORRIDOR_DRIVERS[cid]);
    }
  }, [currentQuote?.corridorId, activeCorridorId]);

  // Restore from sessionStorage on client mount
  useEffect(() => {
    try {
      sessionStorage.removeItem("along_trip_session_v5");
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.activeCorridorId) setActiveCorridorId(parsed.activeCorridorId);
        if (parsed.activeLocale) setActiveLocale(parsed.activeLocale);
        if (parsed.currentQuote) setCurrentQuote(parsed.currentQuote);
        if (parsed.journeyStage) setJourneyStage(parsed.journeyStage);
        if (Array.isArray(parsed.passengers)) setPassengers(parsed.passengers);
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

  // Synchronize dynamic corridor pod manifest whenever currentQuote changes
  useEffect(() => {
    if (currentQuote) {
      if (currentQuote.corridorId) {
        setActiveCorridorId(currentQuote.corridorId);
      }
      setPassengers((prev) => {
        const existingUser = prev.find((p) => p.isCurrentUser);
        const sameQuote =
          existingUser &&
          existingUser.otpCode === currentQuote.otp &&
          existingUser.dropLocation === currentQuote.destName &&
          existingUser.seatsOccupied === currentQuote.seats;
        if (sameQuote) {
          return prev;
        }
        return buildCorridorPassengers(currentQuote, currentQuote.corridorId || activeCorridorId);
      });
      if (currentQuote.shareToken) {
        setActiveShareToken(currentQuote.shareToken);
      }
    } else {
      setPassengers([]);
    }
  }, [currentQuote, activeCorridorId]);

  const confirmBooking = useCallback(() => {
    setJourneyStage("CONFIRMED");
  }, []);

  const startCorridorTrip = useCallback(() => {
    setJourneyStage("IN_TRANSIT");
  }, []);

  const boardPassengerByOtp = useCallback((otp: string): boolean => {
    const cleanOtp = otp.trim();
    let matched = false;
    setPassengers((prev) => {
      const updated = prev.map((p) => {
        if (p.otpCode === cleanOtp || (p.isCurrentUser && cleanOtp === p.otpCode)) {
          matched = true;
          return { ...p, isBoarded: true };
        }
        return p;
      });

      const userSeat = updated.find((p) => p.isCurrentUser);
      if (matched && userSeat?.isBoarded) {
        const totalBoardedSeats = updated.reduce(
          (acc, p) => acc + (p.isBoarded ? p.seatsOccupied || 1 : 0),
          0
        );
        if (totalBoardedSeats >= 4 && updated.every((p) => p.isBoarded)) {
          setJourneyStage("IN_TRANSIT");
        }
      }
      return updated;
    });
    return matched;
  }, []);

  const boardPassengerBySeat = useCallback(
    (seatNumber: 1 | 2 | 3 | 4, boarded: boolean) => {
      setPassengers((prev) => {
        const updated = prev.map((p) => (p.seatNumber === seatNumber ? { ...p, isBoarded: boarded } : p));
        const allBoarded = updated.length > 0 && updated.every((p) => p.isBoarded);
        if (allBoarded) {
          setJourneyStage("IN_TRANSIT");
        } else if (!boarded && journeyStage === "IN_TRANSIT") {
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
    setPassengers([]);
    setActiveShareToken("");
    setTraces([]);
    setResolverScores(null);
    setPersistedMessages([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    resetActivePod().catch(() => {});
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
