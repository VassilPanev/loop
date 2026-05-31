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
  theLoop: string;
  whatIsAddingLoad: string;
  whatActuallyMattersNow: string;
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
  { key: "theLoop", title: "The Loop" },
  { key: "whatIsAddingLoad", title: "What Is Adding Load" },
  { key: "whatActuallyMattersNow", title: "What Actually Matters Now" },
  { key: "oneStabilizingMove", title: "One Stabilizing Move" },
  { key: "reset", title: "Reset" }
];

const compactSectionKeys: VisibleSectionKey[] = [
  "whatsHappening",
  "whatActuallyMattersNow",
  "oneStabilizingMove",
  "reset"
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
const localDebugHostnames = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

type WindowWithWebkitAudio = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

function getOneLineResponse(response: LoopResponse) {
  return response.reset || response.oneStabilizingMove || response.whatsHappening;
}

function getVisibleSections(response: LoopResponse) {
  if (response.responseShape === "standard") {
    return sections;
  }

  return sections.filter(
    (section) =>
      compactSectionKeys.includes(section.key) &&
      response[section.key].trim().length > 0
  );
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
  const [showDebugFooter, setShowDebugFooter] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const hasResponse = useMemo(() => Boolean(response), [response]);
  const isLanding = mode === "landing";
  const layerTransition = isClosing
    ? "transition-opacity duration-500 ease-out"
    : "transition-none duration-0";

  useEffect(() => {
    setShowDebugFooter(localDebugHostnames.has(window.location.hostname));
  }, []);

  useEffect(() => {
    if (input.length > 0 || mode !== "loop") {
      setIsPlaceholderVisible(false);
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
            Hello.
          </h1>
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={openLoop}
              className="rounded-full border border-white/10 bg-white/[0.015] px-8 py-4 text-2xl font-normal text-muted/75 opacity-95 transition-[background-color,border-color,color,opacity] duration-200 ease-in-out hover:border-white/[0.18] hover:bg-[#ded8ce]/[0.045] hover:text-mist/90 hover:opacity-100 sm:text-3xl"
            >
              Continue
            </button>
            <p className="whitespace-pre-line text-xs font-light italic leading-5 text-muted/30">
              &ldquo;Touch grass.{"\n"}Continue your day.&rdquo;
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
              <p className="max-w-xl text-base font-normal italic leading-7 text-muted/72 sm:text-lg">
                Continue your day.
              </p>
            </div>
          </section>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/[0.055] bg-[#1c1a18]/62 p-3 sm:p-4"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={promptExamples[placeholderIndex]}
              className={`loop-prompt-input min-h-48 w-full resize-none rounded-xl border border-white/[0.055] bg-[#151413]/72 px-5 py-4 text-base font-normal leading-7 text-mist/86 outline-none transition-colors placeholder:text-muted/42 focus:border-white/[0.11] sm:min-h-56 ${
                isPlaceholderVisible ? "" : "placeholder-fade-out"
              }`}
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-h-6 text-sm font-normal text-[#c4a184]/72">
                {error}
              </p>
              <button
                type="submit"
                onClick={playTactileClick}
                disabled={isLoading}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/[0.08] bg-[#ded8ce] px-5 text-sm font-normal text-[#201d1a] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-in-out hover:scale-[1.01] hover:border-white/[0.13] hover:bg-[#e6dfd4] hover:text-[#161310] hover:shadow-[0_10px_28px_rgba(222,216,206,0.08)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                <span>{isLoading ? "Finding the shape..." : "Show me the loop"}</span>
              </button>
            </div>
          </form>

          {(isLoading || hasResponse) && (
            <section className="rounded-2xl border border-white/[0.052] bg-[#1c1a18]/50 p-5 sm:p-6">
              {isLoading && (
                <div className="space-y-4">
                  <div className="h-4 w-32 animate-pulse rounded-full bg-white/[0.07]" />
                  <div className="space-y-3">
                    <div className="h-3 w-full animate-pulse rounded-full bg-white/[0.045]" />
                    <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/[0.045]" />
                    <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/[0.045]" />
                  </div>
                </div>
              )}

              {response && (
                <div className="space-y-5">
                  {response.responseShape === "one_line" ? (
                    <p className="text-base leading-7 text-mist/90">
                      {getOneLineResponse(response)}
                    </p>
                  ) : (
                    getVisibleSections(response).map((section) => (
                      <article
                        key={section.key}
                        className="space-y-1.5 border-t border-white/[0.045] pt-4 first:border-t-0 first:pt-0"
                      >
                        <h2 className="text-xs font-normal uppercase tracking-[0.13em] text-muted/54">
                          {section.title}
                        </h2>
                        <p className="text-base font-normal leading-7 text-mist/82">
                          {response[section.key]}
                        </p>
                      </article>
                    ))
                  )}
                  {showDebugFooter && (
                    <div className="space-y-1 border-t border-white/[0.04] pt-4 text-xs font-normal text-muted/48">
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
                      className="rounded-full border border-white/[0.09] bg-white/[0.01] px-4 py-2 text-sm font-medium text-muted/68 transition-colors duration-200 ease-in-out hover:border-white/[0.14] hover:bg-white/[0.035] hover:text-mist/82"
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
