/**
 * Audio playback utility for Along WhatsApp voice notes.
 * Uses Web Audio synthesizer + Web SpeechSynthesis with fallback to ensure
 * real, audible sound plays through laptop and phone speakers.
 */

export function playAlongVoiceNote({
  text = "Abeg I dey Dutse first gate, two seats go Berger",
  onStart,
  onEnd,
}: {
  text?: string;
  onStart?: () => void;
  onEnd?: () => void;
}) {
  if (typeof window === "undefined") return;

  onStart?.();

  // 1. Play WhatsApp voice note start chirp via Web Audio API
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(640, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch {}

  // 2. Play spoken audio via SpeechSynthesis
  let speechSucceeded = false;
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.includes("en-NG") ||
          v.lang.includes("en-GB") ||
          v.lang.includes("en-US") ||
          v.lang.includes("en")
      );
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        onEnd?.();
      };

      utterance.onerror = () => {
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
      speechSucceeded = true;
    } catch {
      speechSucceeded = false;
    }
  }

  // 3. Fallback timer if speech synthesis not triggered
  if (!speechSucceeded) {
    setTimeout(() => {
      onEnd?.();
    }, 3500);
  }
}
