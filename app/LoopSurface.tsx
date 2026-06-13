"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Mode = "landing" | "loop";

type LoopResponse = {
  inputClass: string;
  detectedState:
    | "playful"
    | "low_bandwidth"
    | "overload"
    | "reflective"
    | "practical"
    | "ambiguous";
  responseShape: "one_line" | "compact" | "standard";
  ambiguityLevel: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  whatsHappening: string;
  oneStabilizingMove: string;
  reset: string;
};

type VisibleSectionKey = Exclude<
  keyof LoopResponse,
  | "inputClass"
  | "detectedState"
  | "responseShape"
  | "ambiguityLevel"
  | "confidence"
>;

const sections: Array<{ key: VisibleSectionKey; title: string }> = [
  { key: "whatsHappening", title: "What's Happening" },
  { key: "oneStabilizingMove", title: "The Tragedy" },
  { key: "reset", title: "Reset" }
];

const promptExamples = [
  "I have way too many things to do and I'm stressed.",
  "I keep thinking about a conversation from three days ago.",
  "I don't know what to do next.",
  "I need to send one email and I've been avoiding it all day.",
  "I can't stop checking my phone even though nothing is happening."
];

const tactileClickVolume = 0.11;
const tactileClickBodyVolume = 0.04;
const tactileClickNoiseAmount = 0.28;
type WindowWithWebkitAudio = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

function isLocalDebugHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function getVisibleSections(response: LoopResponse) {
  return sections.map((section) => ({
    ...section,
    text: getVisibleSectionText(response[section.key])
  }));
}

function getVisibleSectionText(text: string) {
  const trimmedText = text.trim();
  const sentenceMatch = trimmedText.match(/^.*?[.!?](?:\s|$)/);

  return sentenceMatch ? sentenceMatch[0].trim() : trimmedText;
}

export default function LoopSurface({ initialMode = "landing" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<LoopResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isPlaceholderVisible, setIsPlaceholderVisible] = useState(true);
  const [isLocalDebugMode, setIsLocalDebugMode] = useState(false);
  const [currentHostname, setCurrentHostname] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);

  const hasResponse = useMemo(() => Boolean(response), [response]);
  const isLanding = mode === "landing";
  const layerTransition = isClosing
    ? "transition-opacity duration-500 ease-out"
    : "transition-none duration-0";

  useEffect(() => {
    const hostname = window.location.hostname;
    setCurrentHostname(hostname);
    setIsLocalDebugMode(isLocalDebugHostname(hostname));
  }, []);

  useEffect(() => {
    if (input.length > 0 || mode !== "loop") {
      setIsPlaceholderVisible(input.length === 0 && mode === "loop");
      return;
    }

    setIsPlaceholderVisible(true);

    let fadeTimeout: number | undefined;
    const rotationInterval = window.setInterval(() => {
      setIsPlaceholderVisible(false);
      fadeTimeout = window.setTimeout(() => {
        setPlaceholderIndex((currentIndex) => (
          currentIndex + 1
        ) % promptExamples.length);
        setIsPlaceholderVisible(true);
      }, 240);
    }, 7000);

    return () => {
      window.clearInterval(rotationInterval);
      if (fadeTimeout) {
        window.clearTimeout(fadeTimeout);
      }
    };
  }, [input.length, mode]);

  function playTactileClick() {
    console.log("click sound fired");

    try {
      const AudioContextConstructor =
        window.AudioContext ||
        (window as WindowWithWebkitAudio).webkitAudioContext;

      if (!AudioContextConstructor) {
        return;
      }

      const audioContext =
        audioContextRef.current ?? new AudioContextConstructor();
      audioContextRef.current = audioContext;

      void audioContext.resume().then(() => {
        const startTime = audioContext.currentTime;
        const output = audioContext.createGain();
        output.gain.setValueAtTime(0.0001, startTime);
        output.gain.exponentialRampToValueAtTime(
          tactileClickVolume,
          startTime + 0.004
        );
        output.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.055);
        output.connect(audioContext.destination);

        const noiseLength = Math.max(1, Math.floor(audioContext.sampleRate * 0.045));
        const noiseBuffer = audioContext.createBuffer(
          1,
          noiseLength,
          audioContext.sampleRate
        );
        const noiseData = noiseBuffer.getChannelData(0);

        for (let index = 0; index < noiseLength; index += 1) {
          const fade = 1 - index / noiseLength;
          noiseData[index] = (Math.random() * 2 - 1) * fade * tactileClickNoiseAmount;
        }

        const noise = audioContext.createBufferSource();
        noise.buffer = noiseBuffer;

        const noiseFilter = audioContext.createBiquadFilter();
        noiseFilter.type = "lowpass";
        noiseFilter.frequency.setValueAtTime(720, startTime);
        noiseFilter.Q.setValueAtTime(0.3, startTime);

        const body = audioContext.createOscillator();
        body.type = "sine";
        body.frequency.setValueAtTime(110, startTime);
        body.frequency.exponentialRampToValueAtTime(58, startTime + 0.045);

        const bodyGain = audioContext.createGain();
        bodyGain.gain.setValueAtTime(0.0001, startTime);
        bodyGain.gain.exponentialRampToValueAtTime(
          tactileClickBodyVolume,
          startTime + 0.003
        );
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.055);

        noise.connect(noiseFilter);
        noiseFilter.connect(output);
        body.connect(bodyGain);
        bodyGain.connect(output);

        noise.start(startTime);
        noise.stop(startTime + 0.045);
        body.start(startTime);
        body.stop(startTime + 0.06);

        window.setTimeout(() => {
          noise.disconnect();
          noiseFilter.disconnect();
          body.disconnect();
          bodyGain.disconnect();
          output.disconnect();
        }, 80);
      }).catch(() => undefined);
    } catch {
      // Audio is decorative; button behavior should never depend on it.
    }
  }

  function openLoop() {
    playTactileClick();
    setIsClosing(false);
    setMode("loop");
  }

  function closeLoop() {
    playTactileClick();
    setIsClosing(true);
    setMode("landing");
    window.setTimeout(() => {
      setInput("");
      setResponse(null);
      setError("");
      setIsLoading(false);
      setIsClosing(false);
    }, 520);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!input.trim()) {
      setResponse(null);
      setError("Write a little first.");
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const result = await fetch("/api/loop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ input })
      });

      if (!result.ok) {
        throw new Error("Request failed");
      }

      const data = (await result.json()) as { response: LoopResponse };
      setResponse(data.response);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="landing-surface relative z-10 min-h-screen overflow-hidden text-center">
      {isLocalDebugMode && (
        <div className="fixed left-3 top-3 z-[9999] space-y-0.5 bg-[#120f0d]/88 px-2 py-1 text-left text-[10px] font-normal uppercase leading-4 tracking-[0.08em] text-mist/78">
          <p>LOCAL DEBUG {isLocalDebugMode ? "TRUE" : "FALSE"}</p>
          <p className="normal-case tracking-normal">hostname: {currentHostname}</p>
          <p className="normal-case tracking-normal">
            response: {hasResponse ? "yes" : "no"}
          </p>
        </div>
      )}
      <div className="min-h-screen" aria-hidden="true" />
      <section
        aria-hidden={!isLanding}
        className={`absolute inset-0 z-10 flex min-h-screen flex-col px-6 py-8 ${layerTransition} ${
          isLanding ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <header className="relative z-10 mx-auto w-full max-w-4xl">
          <p className="text-sm font-normal tracking-[0.18em] text-mist/72">
            Loop
          </p>
        </header>

        <div className="landing-breath relative z-10 flex flex-1 flex-col items-center justify-center gap-8 pb-16">
          <h1 className="text-7xl font-normal leading-none tracking-normal text-mist/90 sm:text-9xl">
            Name the tragedy.
          </h1>
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={openLoop}
              className="rounded-full border border-[#e8dfd0]/10 bg-[#e8dfd0]/[0.018] px-8 py-4 text-2xl font-normal text-muted/75 opacity-95 transition-[background-color,border-color,color,opacity] duration-200 ease-in-out hover:border-[#e8dfd0]/20 hover:bg-[#e8dfd0]/[0.052] hover:text-mist/90 hover:opacity-100 sm:text-3xl"
            >
              Show me the loop
            </button>
            <p className="whitespace-pre-line text-xs font-light italic leading-5 text-muted/30">
              Continue your day.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-hidden={isLanding}
        className={`absolute inset-0 z-20 overflow-y-auto px-5 py-10 text-left ${layerTransition} sm:px-6 sm:py-12 lg:px-8 ${
          isLanding ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"
        }`}
      >
        <div className="mx-auto flex min-h-[calc(100vh-5.5rem)] w-full max-w-2xl flex-col justify-start gap-7 pt-[8vh] sm:pt-[10vh]">
          <section className="space-y-3">
            <p className="text-xs font-normal uppercase tracking-[0.18em] text-muted/62">
              Loop
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-normal italic leading-tight tracking-normal text-mist/88 sm:text-5xl">
                Name the tragedy.
              </h1>
            </div>
          </section>

          <form
            onSubmit={handleSubmit}
            className="loop-writing-box rounded-2xl border border-[#e8dfd0]/[0.065] bg-[#1a1511]/62 p-3 sm:p-4"
          >
            <textarea
              id="loop-prompt"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-48 w-full cursor-text resize-none rounded-xl border border-[#e8dfd0]/[0.13] bg-[#120f0d]/80 px-5 py-4 text-base font-normal leading-7 text-mist/86 caret-[#e8dfd0] outline-none transition-[background-color,border-color,box-shadow] duration-200 ease-in-out hover:border-[#e8dfd0]/[0.18] hover:bg-[#15110e]/84 focus:border-[#e8dfd0]/45 focus:bg-[#15110e]/88 focus:shadow-[0_0_0_1px_rgba(232,223,208,0.075)] sm:min-h-56"
            />

            <p
              className={`mt-3 min-h-5 px-2 text-xs font-normal leading-5 text-muted/34 transition-opacity duration-300 ease-in-out ${
                isPlaceholderVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              &ldquo;{promptExamples[placeholderIndex]}&rdquo;
            </p>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-h-6 text-sm font-normal text-[#c4b39c]/72">
                {error}
              </p>
              <button
                type="submit"
                onClick={playTactileClick}
                disabled={isLoading}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#e8dfd0]/[0.1] bg-[#e8dfd0] px-5 text-sm font-normal text-[#1a1511] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-in-out hover:scale-[1.01] hover:border-[#e8dfd0]/[0.16] hover:bg-[#f0e6d6] hover:text-[#120f0d] hover:shadow-[0_10px_28px_rgba(232,223,208,0.08)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                <span>{isLoading ? "Finding the shape..." : "Show me the loop"}</span>
              </button>
            </div>
          </form>

          {(isLoading || hasResponse) && (
            <section className="rounded-2xl border border-[#e8dfd0]/[0.058] bg-[#1a1511]/54 p-5 sm:p-6">
              {isLoading && (
                <div className="space-y-4">
                  <div className="h-4 w-32 animate-pulse rounded-full bg-[#e8dfd0]/[0.075]" />
                  <div className="space-y-3">
                    <div className="h-3 w-full animate-pulse rounded-full bg-[#e8dfd0]/[0.048]" />
                    <div className="h-3 w-5/6 animate-pulse rounded-full bg-[#e8dfd0]/[0.048]" />
                    <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#e8dfd0]/[0.048]" />
                  </div>
                </div>
              )}

              {response && (
                <div className="space-y-5">
                  {getVisibleSections(response).map((section) => (
                    <article
                      key={section.key}
                      className="space-y-1.5 border-t border-[#e8dfd0]/[0.05] pt-4 first:border-t-0 first:pt-0"
                    >
                      <h2 className="text-xs font-normal uppercase tracking-[0.13em] text-muted/54">
                        {section.title}
                      </h2>
                      <p className="text-base font-normal leading-7 text-mist/82">
                        {section.text}
                      </p>
                    </article>
                  ))}
                  {isLocalDebugMode && (
                    <div className="space-y-1 border-t border-[#e8dfd0]/[0.085] pt-4 text-xs font-normal text-muted/70">
                      <p className="uppercase tracking-[0.12em] text-mist/72">
                        LOCAL DEBUG MODE
                      </p>
                      <p>Detected class: {response.inputClass}</p>
                      <p>Detected state: {response.detectedState}</p>
                      <p>Ambiguity: {response.ambiguityLevel}</p>
                      <p>Response shape: {response.responseShape}</p>
                      <p>Confidence: {response.confidence}</p>
                    </div>
                  )}
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={closeLoop}
                      className="rounded-full border border-[#e8dfd0]/[0.14] bg-[#e8dfd0]/[0.03] px-6 py-2.5 text-sm font-medium text-muted/78 transition-[background-color,border-color,color,box-shadow] duration-200 ease-in-out hover:border-[#e8dfd0]/[0.22] hover:bg-[#e8dfd0]/[0.07] hover:text-mist/90 hover:shadow-[0_10px_28px_rgba(0,0,0,0.16)] focus-visible:border-[#e8dfd0]/40 focus-visible:bg-[#e8dfd0]/[0.08] focus-visible:text-mist/92 focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_rgba(232,223,208,0.13),0_10px_28px_rgba(0,0,0,0.18)]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
