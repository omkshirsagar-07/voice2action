"use client";

import { useEffect, useRef, useState } from "react";

export default function VoiceInput({ onTranscript }) {
  let [isSupported, setIsSupported] = useState(false);
  let [isListening, setIsListening] = useState(false);
  let [message, setMessage] = useState("Tap the mic to dictate your report.");
  let recognitionRef = useRef(null);

  useEffect(function prepareSpeech() {
    let SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      return;
    }

    let recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = function handleStart() {
      setIsListening(true);
      setMessage("Listening... describe the issue clearly.");
    };

    recognition.onend = function handleEnd() {
      setIsListening(false);
      setMessage("Voice captured. You can record again if needed.");
    };

    recognition.onerror = function handleError() {
      setIsListening(false);
      setMessage("Voice capture failed. Please try again.");
    };

    recognition.onresult = function handleResult(event) {
      let transcript = "";
      let index = 0;

      while (index < event.results.length) {
        transcript += `${event.results[index][0].transcript} `;
        index += 1;
      }

      onTranscript(transcript.trim());
    };

    recognitionRef.current = recognition;
    let supportTimer = window.setTimeout(function enableSpeech() {
      setIsSupported(true);
    }, 0);

    return function cleanupSpeech() {
      window.clearTimeout(supportTimer);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);

  function handleVoiceToggle() {
    if (!recognitionRef.current) {
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    recognitionRef.current.start();
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-950 p-4 text-white shadow-[0_18px_60px_rgba(15,23,42,0.24)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Voice reporter</p>
          <p className="mt-1 text-xs text-slate-300">{message}</p>
        </div>

        <button
          type="button"
          onClick={handleVoiceToggle}
          disabled={!isSupported}
          className={`inline-flex h-14 w-14 items-center justify-center rounded-full border transition ${
            isListening
              ? "border-rose-300 bg-rose-500 text-white shadow-[0_0_0_10px_rgba(244,63,94,0.16)]"
              : "border-white/20 bg-white/10 text-white hover:bg-white/20"
          } ${!isSupported ? "cursor-not-allowed opacity-50" : ""}`}
          aria-label="Toggle voice input"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Mic</span>
        </button>
      </div>
    </div>
  );
}
