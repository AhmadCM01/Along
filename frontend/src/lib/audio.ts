/**
 * Audio playback utility for Along WhatsApp voice notes.
 * Plays the real native Nigerian English (en-NG) audio fixture (/audio/pidgin_voice_note.ogg)
 * so every laptop and mobile phone hears an authentic Nigerian accent instead of a European OS robot.
 */

let activeAudioElement: HTMLAudioElement | null = null;

export function stopAlongVoiceNote() {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {}
    activeAudioElement = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

export function playAlongVoiceNote({
  text = "How far boss! Abeg, I dey Dutse First Gate now now. Make I get two seats go Berger Underbridge sharp sharp!",
  customAudioUrl,
  onStart,
  onEnd,
}: {
  text?: string;
  customAudioUrl?: string;
  onStart?: () => void;
  onEnd?: () => void;
}) {
  if (typeof window === "undefined") return;

  stopAlongVoiceNote();
  onStart?.();

  // 1. Subtle WhatsApp voice-note start chime via Web Audio API
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    }
  } catch {}

  // 2. Play either the user's live recorded voice Blob URL or the authentic pidgin_voice_note.ogg
  try {
    const srcUrl = customAudioUrl || "/audio/pidgin_voice_note.ogg";
    const audio = new Audio(srcUrl);
    activeAudioElement = audio;
    audio.playbackRate = 1.0;

    audio.onended = () => {
      activeAudioElement = null;
      onEnd?.();
    };

    audio.onerror = () => {
      activeAudioElement = null;
      fallbackNigerianSpeech(text, onEnd);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        activeAudioElement = null;
        fallbackNigerianSpeech(text, onEnd);
      });
    }
    return;
  } catch {
    fallbackNigerianSpeech(text, onEnd);
  }
}

function fallbackNigerianSpeech(text: string, onEnd?: () => void) {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-NG";
      utterance.rate = 0.94;
      utterance.pitch = 0.92;

      const voices = window.speechSynthesis.getVoices();
      const ngVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().includes("en-ng") ||
          v.name.toLowerCase().includes("nigeria") ||
          v.name.toLowerCase().includes("abeo") ||
          v.name.toLowerCase().includes("ezinne")
      );
      if (ngVoice) {
        utterance.voice = ngVoice;
      }

      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();
      window.speechSynthesis.speak(utterance);
      return;
    } catch {}
  }
  setTimeout(() => onEnd?.(), 3200);
}
