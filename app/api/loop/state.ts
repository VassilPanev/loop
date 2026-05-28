export type ReceptiveState =
  | "playful"
  | "low_bandwidth"
  | "overload"
  | "reflective"
  | "practical"
  | "ambiguous";

const seriousDistressSignals = [
  "my life is over",
  "it's over for me",
  "im done",
  "i'm done",
  "i can't do this anymore",
  "i cant do this anymore",
  "i hate myself",
  "i ruined everything",
  "there's no point",
  "theres no point"
];

const playfulSignals = [
  "lol",
  "lmao",
  "haha",
  "meme",
  "civilization collapsed",
  "humanity has fallen",
  "nato is collapsing",
  "it's so over",
  "its so over",
  "rip",
  "absurd",
  "unhinged"
];

const lowBandwidthSignals = [
  "i can't",
  "i cant",
  "can't think",
  "cant think",
  "can't process",
  "cant process",
  "can't even",
  "cant even",
  "too tired",
  "exhausted",
  "overwhelmed",
  "too big",
  "brain is fried",
  "brain's fried",
  "brain fried",
  "fried",
  "foggy",
  "fog",
  "shutdown",
  "shut down",
  "blank",
  "no words",
  "idk",
  "i don't know",
  "i dont know",
  "help"
];

const overloadSignals = [
  "everything",
  "all at once",
  "too much",
  "deadline",
  "deadlines",
  "future",
  "what if",
  "pressure",
  "uncertain",
  "uncertainty",
  "stressed",
  "panic",
  "spiraling"
];

const reflectiveSignals = [
  "i notice",
  "i wonder",
  "it feels like",
  "feels like",
  "feels weird",
  "internally",
  "emotionally",
  "part of me",
  "i'm realizing",
  "im realizing",
  "maybe",
  "pattern",
  "meaning"
];

const practicalSignals = [
  "how do i",
  "what should i do",
  "need to",
  "need help",
  "fix",
  "plan",
  "planning",
  "organize",
  "organizing",
  "email",
  "schedule",
  "scheduling",
  "call",
  "buy",
  "choose",
  "decide",
  "manage"
];

const externalOrientationSignals = [
  "morning",
  "mornings",
  "school",
  "work",
  "job",
  "students",
  "client",
  "clients",
  "lesson",
  "lessons",
  "piano",
  "loan",
  "loans",
  "money",
  "budget",
  "schedule",
  "calendar",
  "email",
  "call",
  "appointment",
  "deadline",
  "project",
  "task",
  "tasks",
  "homework",
  "application",
  "applications"
];

const internalStateSignals = [
  "brain",
  "rest",
  "emotionally",
  "internal",
  "internally",
  "existential",
  "overwhelmed",
  "fog",
  "foggy",
  "fried",
  "shutdown",
  "shut down",
  "process",
  "rendering",
  "loud"
];

const ambiguitySignals = [
  "i think i'm joking but maybe not",
  "i think i’m joking but maybe not",
  "i think im joking but maybe not",
  "joking but maybe not",
  "kidding but maybe not",
  "fine but also terrible",
  "fine but also",
  "where are my diapers",
  "diapers bro"
];

const negativeContrastSignals = [
  "terrible",
  "awful",
  "not fine",
  "bad",
  "panic",
  "spiraling",
  "overwhelmed"
];

function includesAny(input: string, signals: string[]) {
  return signals.some((signal) => input.includes(signal));
}

function hasManyConcerns(input: string) {
  const separators = input.match(/,|;|\band\b|\bor\b|\bthen\b/gi) ?? [];
  return separators.length >= 4 || input.split(/\s+/).length > 70;
}

function hasLowDetail(input: string, wordCount: number) {
  const separators = input.match(/,|;|\band\b|\bor\b|\bthen\b/gi) ?? [];
  return wordCount <= 14 && separators.length <= 1;
}

function hasPracticalIntent(input: string, hasPracticalSignal: boolean) {
  const hasExternalOrientation = includesAny(input, externalOrientationSignals);
  const hasInternalState = includesAny(input, internalStateSignals);
  const asksHow = input.includes("how do i") || input.includes("how can i");
  const asksForHelp =
    input.includes("need help") ||
    input.includes("help me") ||
    input.includes("what should i do");
  const actionLanguage =
    input.includes("plan") ||
    input.includes("organize") ||
    input.includes("schedule") ||
    input.includes("manage") ||
    input.includes("fix");

  if (!hasPracticalSignal || !hasExternalOrientation) {
    return false;
  }

  if (hasInternalState && !actionLanguage && !asksHow && !asksForHelp) {
    return false;
  }

  return actionLanguage || asksHow || asksForHelp;
}

function hasAmbiguousConflict(input: string, signals: {
  hasPlayfulSignal: boolean;
  hasSeriousDistress: boolean;
  hasLowBandwidthSignal: boolean;
  hasOverloadSignal: boolean;
}) {
  if (includesAny(input, ambiguitySignals)) {
    return true;
  }

  if (
    signals.hasPlayfulSignal &&
    (signals.hasSeriousDistress ||
      signals.hasLowBandwidthSignal ||
      signals.hasOverloadSignal)
  ) {
    return true;
  }

  return (
    input.includes("fine") &&
    input.includes("but") &&
    includesAny(input, negativeContrastSignals)
  );
}

export function detectReceptiveState(rawInput: string): ReceptiveState {
  const input = rawInput.trim().toLowerCase();
  const wordCount = input.split(/\s+/).filter(Boolean).length;
  const hasQuestion = input.includes("?");

  if (!input) {
    return "ambiguous";
  }

  const hasSeriousDistress = includesAny(input, seriousDistressSignals);
  const hasPlayfulSignal = includesAny(input, playfulSignals);
  const hasLowBandwidthSignal = includesAny(input, lowBandwidthSignals);
  const hasOverloadSignal = includesAny(input, overloadSignals);
  const hasReflectiveSignal = includesAny(input, reflectiveSignals);
  const hasPracticalSignal = includesAny(input, practicalSignals);
  const hasInternalStateSignal = includesAny(input, internalStateSignals);
  const hasPracticalActionIntent = hasPracticalIntent(
    input,
    hasPracticalSignal
  );
  const hasSemanticConflict = hasAmbiguousConflict(input, {
    hasPlayfulSignal,
    hasSeriousDistress,
    hasLowBandwidthSignal,
    hasOverloadSignal
  });

  if (hasSemanticConflict) {
    return "ambiguous";
  }

  if (hasPlayfulSignal && !hasSeriousDistress && !hasOverloadSignal) {
    return "playful";
  }

  if (hasSeriousDistress || (hasOverloadSignal && hasManyConcerns(input))) {
    return "overload";
  }

  if (
    hasLowBandwidthSignal &&
    hasLowDetail(input, wordCount) &&
    !hasManyConcerns(input)
  ) {
    return "low_bandwidth";
  }

  if (hasOverloadSignal || hasManyConcerns(input)) {
    return "overload";
  }

  if (hasPracticalActionIntent && !hasReflectiveSignal) {
    return "practical";
  }

  if (hasReflectiveSignal || hasInternalStateSignal || wordCount > 35) {
    return "reflective";
  }

  if (hasQuestion && hasPracticalActionIntent) {
    return "practical";
  }

  return "practical";
}

export function getRoutingInstruction(state: ReceptiveState) {
  const schemaBoundary =
    "Preserve the required JSON schema exactly. Do not mention receptive states, hidden routing, or internal guidance in any user-facing value.";
  const compressionBoundary =
    "Use minimum sufficient structure inside the existing sections: each field should usually be one compressed observation or stabilizing idea, not an explanation. Keep clarity, warmth, and usefulness. Do not force ultra-short replies unless the state calls for it.";

  switch (state) {
    case "playful":
      return `${schemaBoundary} ${compressionBoundary} The user likely has low real distress and is joking. responseShape should usually be one_line. The visible answer can often be one line: light, compressive, and free of overanalysis. If the existing inputClass is playful_joking, make reset the single line the UI should show.`;
    case "low_bandwidth":
      return `${schemaBoundary} ${compressionBoundary} The user likely has very little processing capacity. responseShape should usually be compact. Keep every visible field short, simple, and grounding. Avoid abstraction, philosophy, and explanatory buildup, but include enough language to be clear and steady.`;
    case "overload":
      return `${schemaBoundary} ${compressionBoundary} The user likely carries simultaneous concerns. responseShape should be compact for simple overload and standard for complex overload with many moving parts. Reduce simultaneity load, shrink the horizon, and offer one stabilizing move.`;
    case "reflective":
      return `${schemaBoundary} ${compressionBoundary} The user likely is thoughtful and stable. responseShape can be standard when nuance is useful, otherwise compact. Allow slight interpretation while staying concise. Avoid essay mode and over-insight.`;
    case "practical":
      return `${schemaBoundary} ${compressionBoundary} The user likely wants concrete help. responseShape can be compact for simple requests and standard when logistics need more structure. Be concise but actionable, with enough specifics to be useful. Stay light on emotional interpretation.`;
    case "ambiguous":
      return `${schemaBoundary} ${compressionBoundary} The user's intent or seriousness is unclear. responseShape should usually be compact unless safety or complexity requires standard. Keep the response cautious and light, avoid certainty, avoid dismissiveness, and use minimal interpretation.`;
  }
}
