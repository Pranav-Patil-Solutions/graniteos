"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Thin React wrapper over the browser Web Speech API (SpeechRecognition). Powers
 * both the global voice command bar and voice notes. Feature-detected — on a
 * browser without it (or with mic denied) `supported` is false and the UI hides
 * the mic gracefully. The Web Speech types aren't in lib.dom yet, so we declare
 * the minimal shape we use.
 */

interface RecognitionAlternative { transcript: string }
interface RecognitionResult { 0: RecognitionAlternative; isFinal: boolean }
interface RecognitionResultList { length: number; [i: number]: RecognitionResult }
interface RecognitionEvent { resultIndex: number; results: RecognitionResultList }
interface RecognitionErrorEvent { error: string }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeech(lang: string) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    setSupported(getCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = getCtor();
      if (!Ctor) {
        setError("Voice isn't supported in this browser.");
        return;
      }
      setError(null);
      onFinalRef.current = onFinal;
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (e) => {
        let live = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const text = r[0]?.transcript ?? "";
          if (r.isFinal) {
            setInterim("");
            setListening(false);
            recRef.current = null;
            onFinalRef.current?.(text.trim());
            return;
          }
          live += text;
        }
        setInterim(live);
      };
      rec.onerror = (e) => {
        setError(e.error === "not-allowed" ? "Microphone permission denied." : "Didn't catch that — try again.");
        setListening(false);
        recRef.current = null;
      };
      rec.onend = () => {
        setListening(false);
        if (recRef.current === rec) recRef.current = null;
      };

      recRef.current = rec;
      setInterim("");
      setListening(true);
      try {
        rec.start();
      } catch {
        // start() throws if called while already running — ignore.
      }
    },
    [lang],
  );

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, listening, interim, error, start, stop };
}
