"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ASRResponse,
  DemoChatResponse,
  ReplayRunItem,
  ResolverScores,
  StageTrace,
  getLiveReplayFile,
  sendDemoChat,
  transcribeAudio,
} from "@/lib/api";
import { useAlongTrip } from "@/context/AlongTripContext";

export interface ChatMessage {
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

export interface QuoteDetails {
  corridorId: string;
  originName: string;
  destName: string;
  anchorId: string;
  anchorName: string;
  seats: number;
  unitFare: string;
  totalFare: string;
  otp: string;
  shareToken?: string | null;
  podGross?: string;
  driverNet?: string;
  platformFee?: string;
}

export interface DriverDetails {
  podCode: string;
  driverName: string;
  plateNumber: string;
  vehicleDesc: string;
  phoneMode: string;
  ussdShortcode: string;
  boardingOtpExpected: string;
}

export interface ActiveResolverScores {
  originName: string;
  originScores: ResolverScores | null;
  destName: string;
  destScores: ResolverScores | null;
}

export function useAlongChat(initialPhone = "+2348031234567") {
  const trip = useAlongTrip();
  const [phone] = useState<string>(initialPhone);
  const [activeLocale, setActiveLocale] = useState<"en" | "pcm" | "ha">("pcm");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentQuote, setCurrentQuote] = useState<QuoteDetails | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverDetails | null>(null);
  const [traces, setTraces] = useState<StageTrace[]>([]);
  const [fallback, setFallback] = useState<boolean>(false);
  const [fallbackBanner, setFallbackBanner] = useState<string | null>(null);
  const [resolverScores, setResolverScores] = useState<ActiveResolverScores | null>(null);

  // Replay mode state
  const [isReplayAvailable, setIsReplayAvailable] = useState<boolean>(false);
  const [replayDate, setReplayDate] = useState<string | null>(null);
  const [replayRuns, setReplayRuns] = useState<ReplayRunItem[]>([]);
  const [replayMode, setReplayMode] = useState<boolean>(false);
  const [activeReplayRunId, setActiveReplayRunId] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    const startMs = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.max(0, parseFloat(((Date.now() - startMs) / 1000).toFixed(1))));
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getLiveReplayFile()
      .then((res) => {
        if (!mounted) return;
        if (res.available && res.replay && res.replay.runs.length > 0) {
          setIsReplayAvailable(true);
          setReplayDate(res.recorded_at);
          setReplayRuns(res.replay.runs);
        } else {
          setIsReplayAvailable(false);
          setReplayDate(null);
          setReplayRuns([]);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsReplayAvailable(false);
        }
      });

    return () => {
      mounted = false;
      stopTimer();
    };
  }, [stopTimer]);

  const applyBotResponse = useCallback(
    (data: DemoChatResponse, userUtterance: string) => {
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const botMsgId = `b_${Date.now() + 1}`;

      const whatsapp = data.pane1_whatsapp;
      const ledger = data.pane2_xray_and_ledger;
      const driver = data.pane3_driver;
      const xray = ledger.xray;
      const resolution = xray.resolution;

      if (whatsapp.locale) {
        setActiveLocale(whatsapp.locale);
        trip.setActiveLocale(whatsapp.locale);
      }

      setFallback(Boolean(data.fallback));
      setFallbackBanner(data.fallback_banner || null);

      const realTraces = data.traces && data.traces.length > 0 ? data.traces : xray.traces || [];
      setTraces(realTraces);
      trip.setTraces(realTraces);

      const isConfirmTurn =
        userUtterance.trim().toUpperCase() === "YES" || whatsapp.stage === "POOLING";

      const quote: QuoteDetails = {
        corridorId: ledger.corridor_id || "BWR-DUT-WUS",
        originName: ledger.origin_name || "Dutse First Gate",
        destName: ledger.destination_name || "Berger Roundabout Underbridge",
        anchorId: ledger.anchor_id || "ANC-DUT-01",
        anchorName: ledger.anchor_name || "A.A. Rano Filling Station (Dutse First Gate)",
        seats: 2,
        unitFare: ledger.unit_fare_naira,
        totalFare: ledger.total_fare_naira,
        otp: whatsapp.boarding_otp || "4817",
        shareToken: whatsapp.share_token || "share-bwr-4817",
        podGross: ledger.pod_gross_naira,
        driverNet: ledger.driver_net_90pct_naira,
        platformFee: ledger.platform_10pct_naira,
      };
      setCurrentQuote(quote);

      if (driver) {
        setDriverInfo({
          podCode: driver.pod_code,
          driverName: driver.driver_name,
          plateNumber: driver.plate_number,
          vehicleDesc: driver.vehicle_desc,
          phoneMode: driver.phone_mode,
          ussdShortcode: driver.ussd_shortcode,
          boardingOtpExpected: driver.boarding_otp_expected,
        });
      }

      if (resolution) {
        const scoreObj = {
          originName: resolution.origin_best || ledger.origin_name || "Origin",
          originScores: resolution.origin_scores || null,
          destName: resolution.destination_best || ledger.destination_name || "Destination",
          destScores: resolution.destination_scores || null,
        };
        setResolverScores(scoreObj);
        trip.setResolverScores(scoreObj);
      }

      const isSos = whatsapp.stage === "SOS_ACTIVE" || userUtterance.toLowerCase().includes("sos");

      trip.setPersistedMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: "bot",
          text: whatsapp.reply_text,
          timestamp: nowStr,
          isConfirmed: isConfirmTurn,
          isSos,
          quoteData: isSos
            ? undefined
            : {
                corridorId: quote.corridorId,
                anchorName: quote.anchorName,
                destName: quote.destName,
                seats: quote.seats,
                unitFare: quote.unitFare,
                totalFare: quote.totalFare,
                otp: quote.otp,
                shareToken: quote.shareToken,
              },
        },
      ]);
    },
    [trip]
  );

  const sendMessage = useCallback(
    async (
      text: string,
      isVoice = false,
      voiceDuration?: string,
      voiceLabel?: string
    ): Promise<DemoChatResponse | null> => {
      const trimmed = text.trim();
      if (!trimmed) return null;

      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const userMsgId = `u_${Date.now()}`;

      // Immediately render outgoing user bubble in WhatsApp stream
      trip.setPersistedMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          sender: "user",
          text: trimmed,
          isVoice,
          voiceDuration,
          voiceLabel,
          timestamp: nowStr,
        },
      ]);

      setIsLoading(true);
      setErrorMessage(null);
      startTimer();

      try {
        const data = await sendDemoChat({
          phone,
          message_text: trimmed,
        });
        applyBotResponse(data, trimmed);
        return data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to execute chat turn";
        setErrorMessage(msg);
        return null;
      } finally {
        stopTimer();
        setIsLoading(false);
      }
    },
    [phone, startTimer, stopTimer, applyBotResponse, trip]
  );

  const sendVoiceAudio = useCallback(
    async (audioBlob: Blob | File, filename = "voice_note.webm"): Promise<ASRResponse | null> => {
      setIsLoading(true);
      setErrorMessage(null);
      startTimer();

      try {
        const asrRes = await transcribeAudio(audioBlob, filename);
        const transcript = asrRes.transcript || "(No speech detected)";
        const asrLabel = "Whisper ASR";

        const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        trip.setPersistedMessages((prev) => [
          ...prev,
          {
            id: `u_${Date.now()}`,
            sender: "user",
            text: transcript,
            isVoice: true,
            voiceDuration: "0:04",
            voiceLabel: asrLabel,
            timestamp: nowStr,
          },
        ]);

        const chatRes = await sendDemoChat({
          phone,
          message_text: transcript,
        });

        applyBotResponse(chatRes, transcript);
        return asrRes;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "ASR speech recognition failed";
        setErrorMessage(msg);
        return null;
      } finally {
        stopTimer();
        setIsLoading(false);
      }
    },
    [phone, startTimer, stopTimer, applyBotResponse, trip]
  );

  const sendSampleInput = useCallback(
    (sampleText: string, isVoice = false) => {
      if (replayMode) {
        setReplayMode(false);
      }
      return sendMessage(sampleText, isVoice, isVoice ? "0:04" : undefined, isVoice ? "en-NG Voice" : undefined);
    },
    [replayMode, sendMessage]
  );

  const confirmBooking = useCallback(() => {
    return sendMessage("YES");
  }, [sendMessage]);

  const triggerSos = useCallback(() => {
    return sendMessage("Abeg help me o, driver refused to stop, one chance!");
  }, [sendMessage]);

  const selectReplayRun = useCallback(
    (runId: string) => {
      const run = replayRuns.find((r) => r.id === runId) || replayRuns[0];
      if (!run) return;

      setActiveReplayRunId(run.id);
      setActiveLocale(run.locale);
      setFallback(run.fallback);
      setFallbackBanner(run.fallback_banner || null);
      setTraces(run.traces);
      trip.setTraces(run.traces);

      const q = run.quote;
      setCurrentQuote({
        corridorId: q.corridor_id,
        originName: q.origin_name || "Dutse First Gate",
        destName: q.dest_name || "Berger Roundabout",
        anchorId: q.anchor_id || "ANC-DUT-01",
        anchorName: q.anchor_name || "A.A. Rano Filling Station",
        seats: q.seats,
        unitFare: q.unit_fare,
        totalFare: q.total_fare,
        otp: q.otp || "4817",
        shareToken: run.share_token,
        podGross: q.pod_gross,
        driverNet: q.driver_net,
        platformFee: q.platform_fee,
      });

      if (run.driver) {
        setDriverInfo({
          podCode: run.driver.pod_code,
          driverName: run.driver.driver_name,
          plateNumber: run.driver.plate_number,
          vehicleDesc: run.driver.vehicle_desc,
          phoneMode: "SMARTPHONE_AND_2G_USSD",
          ussdShortcode: "*384*247#",
          boardingOtpExpected: q.otp || "4817",
        });
      }

      trip.setPersistedMessages([
        {
          id: `rep_u_${run.id}`,
          sender: "user",
          text: run.utterance,
          timestamp: "12:44",
        },
        {
          id: `rep_b_${run.id}`,
          sender: "bot",
          text: run.reply_text,
          timestamp: "12:44",
          quoteData: {
            corridorId: q.corridor_id,
            anchorName: q.anchor_name || "A.A. Rano Filling Station",
            destName: q.dest_name || "Berger Roundabout",
            seats: q.seats,
            unitFare: q.unit_fare,
            totalFare: q.total_fare,
            otp: q.otp || "4817",
            shareToken: run.share_token,
          },
        },
      ]);
    },
    [replayRuns, trip]
  );

  const toggleReplayMode = useCallback(
    (enable?: boolean) => {
      const next = enable !== undefined ? enable : !replayMode;
      if (next && isReplayAvailable && replayRuns.length > 0) {
        setReplayMode(true);
        selectReplayRun(replayRuns[0].id);
      } else {
        setReplayMode(false);
        setActiveReplayRunId(null);
      }
    },
    [replayMode, isReplayAvailable, replayRuns, selectReplayRun]
  );

  return {
    messages: trip.persistedMessages,
    activeLocale,
    setActiveLocale,
    isLoading,
    elapsedSeconds,
    errorMessage,
    currentQuote,
    driverInfo,
    traces,
    fallback,
    fallbackBanner,
    resolverScores,
    sendMessage,
    sendVoiceAudio,
    sendSampleInput,
    confirmBooking,
    triggerSos,
    replayMode,
    replayDate,
    isReplayAvailable,
    replayRuns,
    activeReplayRunId,
    toggleReplayMode,
    selectReplayRun,
  };
}
