"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ASRResponse,
  DemoChatResponse,
  LiveReplayDoc,
  ReplayRunItem,
  ResolverScores,
  StageTrace,
  getLiveReplayFile,
  sendDemoChat,
  transcribeAudio,
} from "@/lib/api";

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  isVoice?: boolean;
  voiceDuration?: string;
  voiceLabel?: string;
  timestamp: string;
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
  const [phone] = useState<string>(initialPhone);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  // Check if real replay file exists on mount
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

  const applyTurnResponse = useCallback(
    (
      data: DemoChatResponse,
      userUtterance: string,
      isVoice = false,
      voiceDuration?: string,
      voiceLabel?: string
    ) => {
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const userMsgId = `u_${Date.now()}`;
      const botMsgId = `b_${Date.now() + 1}`;

      const whatsapp = data.pane1_whatsapp;
      const ledger = data.pane2_xray_and_ledger;
      const driver = data.pane3_driver;
      const xray = ledger.xray;
      const resolution = xray.resolution;

      if (whatsapp.locale) {
        setActiveLocale(whatsapp.locale);
      }

      setFallback(Boolean(data.fallback));
      setFallbackBanner(data.fallback_banner || null);

      const realTraces = data.traces && data.traces.length > 0 ? data.traces : xray.traces || [];
      setTraces(realTraces);

      const quote: QuoteDetails = {
        corridorId: ledger.corridor_id || "BWR-DUT-WUS",
        originName: ledger.origin_name || "Origin Forecourt",
        destName: ledger.destination_name || "Destination",
        anchorId: ledger.anchor_id || "ANC-DUT-01",
        anchorName: ledger.anchor_name || "Virtual Anchor Point",
        seats: 2,
        unitFare: ledger.unit_fare_naira,
        totalFare: ledger.total_fare_naira,
        otp: whatsapp.boarding_otp || "4829",
        shareToken: whatsapp.share_token,
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
        setResolverScores({
          originName: resolution.origin_best || ledger.origin_name || "Origin",
          originScores: resolution.origin_scores || null,
          destName: resolution.destination_best || ledger.destination_name || "Destination",
          destScores: resolution.destination_scores || null,
        });
      }

      const isSos = whatsapp.stage === "SOS_ACTIVE" || userUtterance.toLowerCase().includes("sos");

      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          sender: "user",
          text: userUtterance,
          isVoice,
          voiceDuration,
          voiceLabel,
          timestamp: nowStr,
        },
        {
          id: botMsgId,
          sender: "bot",
          text: whatsapp.reply_text,
          timestamp: nowStr,
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
    []
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

      setIsLoading(true);
      setErrorMessage(null);
      startTimer();

      try {
        const data = await sendDemoChat({
          phone,
          message_text: trimmed,
        });
        applyTurnResponse(data, trimmed, isVoice, voiceDuration, voiceLabel);
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
    [phone, startTimer, stopTimer, applyTurnResponse]
  );

  const sendVoiceAudio = useCallback(
    async (audioBlob: Blob | File, filename = "voice_note.webm"): Promise<ASRResponse | null> => {
      setIsLoading(true);
      setErrorMessage(null);
      startTimer();

      try {
        const asrRes = await transcribeAudio(audioBlob, filename);
        const transcript = asrRes.transcript || "(No speech detected)";
        const asrLabel = "Non-Meta ASR (Whisper)";

        const chatRes = await sendDemoChat({
          phone,
          message_text: transcript,
        });

        applyTurnResponse(chatRes, transcript, true, "0:04", asrLabel);
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
    [phone, startTimer, stopTimer, applyTurnResponse]
  );

  const sendSampleInput = useCallback(
    (sampleText: string) => {
      if (replayMode) {
        setReplayMode(false);
      }
      return sendMessage(sampleText);
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

      const q = run.quote;
      setCurrentQuote({
        corridorId: q.corridor_id,
        originName: q.origin_name || "Origin Forecourt",
        destName: q.dest_name || "Destination",
        anchorId: q.anchor_id || "ANC-DUT-01",
        anchorName: q.anchor_name || "Virtual Anchor Point",
        seats: q.seats,
        unitFare: q.unit_fare,
        totalFare: q.total_fare,
        otp: q.otp,
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
          boardingOtpExpected: q.otp,
        });
      }

      const xray = run.xray as { resolution?: Record<string, unknown> } | undefined;
      const res = xray?.resolution as {
        origin_best?: string;
        origin_scores?: ResolverScores;
        destination_best?: string;
        destination_scores?: ResolverScores;
      } | undefined;

      if (res) {
        setResolverScores({
          originName: res.origin_best || q.origin_name || "Origin",
          originScores: res.origin_scores || null,
          destName: res.destination_best || q.dest_name || "Destination",
          destScores: res.destination_scores || null,
        });
      }

      setMessages([
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
            anchorName: q.anchor_name || "Virtual Anchor Point",
            destName: q.dest_name || "Destination",
            seats: q.seats,
            unitFare: q.unit_fare,
            totalFare: q.total_fare,
            otp: q.otp,
            shareToken: run.share_token,
          },
        },
      ]);
    },
    [replayRuns]
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
    messages,
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
