/*
  Local Loop batch tester.

  How to run:
  1. Start the local dev server in another terminal:
     npm run dev
  2. Run:
     node scripts/loop-batch-test.mjs

  Run a smaller local batch:
     node scripts/loop-batch-test.mjs --limit 10

  Optional environment variables:
  - LOOP_API_URL: local Loop API URL. Defaults to http://localhost:3000/api/loop
  - LRQI_JUDGE_MODEL: OpenAI judge model. Defaults to gpt-4.1-mini
  - LRQI_JUDGE_BATCH_SIZE: responses judged per OpenAI request. Defaults to 10

  This script calls the local Loop API for Loop responses, uses OpenAI only
  for LRQI judging, and writes loop-batch-results.csv.
  It does not import app internals, change the UI, or change response generation.
*/

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const { loadEnvConfig } = nextEnv;
const existingOpenAIKey = process.env.OPENAI_API_KEY;
loadEnvConfig(projectRoot);
if (existingOpenAIKey) {
  process.env.OPENAI_API_KEY = existingOpenAIKey;
}

const doctrinePath = path.join(projectRoot, "LOOP_DOCTRINE.md");
const outputPath = path.join(projectRoot, "loop-batch-results.csv");

const loopApiUrl = process.env.LOOP_API_URL ?? "http://localhost:3000/api/loop";
const judgeModel = process.env.LRQI_JUDGE_MODEL ?? "gpt-4.1-mini";
const judgeBatchSize = Number.parseInt(process.env.LRQI_JUDGE_BATCH_SIZE ?? "10", 10);
const promptLimit = parsePromptLimit(process.argv.slice(2));

const prompts = [
  "I have three deadlines this week and every one of them feels like proof that I am bad at life.",
  "My friend hasn't replied in two days and now I am reviewing every sentence I sent like it was evidence.",
  "I opened my inbox, saw 47 unread emails, and immediately wanted to close my laptop forever.",
  "I know I need to clean the apartment, but the mess feels like a verdict on who I am.",
  "My boss said 'we should talk tomorrow' and my brain has already prepared seven resignation speeches.",
  "I have to choose between two normal options and somehow it feels like choosing the entire rest of my life.",
  "I slept badly, and now everything feels impossible and permanent.",
  "I keep checking my phone for one message and calling it patience.",
  "I got useful feedback, but I heard it as 'you are secretly incompetent.'",
  "I need to start the application, but I keep simulating the rejection instead.",
  "I have money stuff to handle, but every number turns into a future disaster.",
  "I am tired, behind, and convinced the whole thing is already ruined.",
  "Someone sounded slightly off in a meeting and I cannot stop making it about me.",
  "I have one task to finish, but my brain keeps dragging in every unfinished task since 2019.",
  "I do not know if I am avoiding the work or protecting myself from burnout.",
  "I made a small mistake and now I feel like the whole project is contaminated.",
  "I need to send one email and somehow it has become a personality test.",
  "I am waiting for clarity before moving, but I think I might be waiting for certainty.",
  "The day is technically fine, but internally everything is too loud.",
  "I have plans tonight and part of me wants to cancel because existing feels expensive.",
  "My relationship is fine, but one awkward conversation made me question all of it.",
  "I keep calling it a decision when really I am trying to avoid disappointing someone.",
  "I finished something important and immediately started worrying about the next thing.",
  "I keep refreshing the tracking page like my package contains emotional closure.",
  "I am not sad exactly. I just feel like the future is staring at me.",
  "I need to prepare for class tomorrow, but my brain is treating it like a trial.",
  "Every option has a downside, so I keep pretending there is a hidden perfect option.",
  "I feel guilty for resting even though I am exhausted.",
  "I got one weird text and now the entire friendship feels unstable.",
  "I have to make a phone call and my body thinks this is a bear attack.",
  "I keep researching the problem instead of touching the problem.",
  "My calendar is full, and even the empty spaces feel claimed.",
  "I am overwhelmed by things that are individually not that hard.",
  "I know the answer is probably simple, but everything in me wants a 19-step analysis.",
  "I keep thinking I need motivation, but maybe I just need the task to stop being huge.",
  "I had one unproductive day and now my brain says the semester is doomed.",
  "I am scared to open the document because then the vague dread becomes a real task.",
  "I want to respond kindly, but I also do not want to perform calmness I do not feel.",
  "I have too many tabs open and each one feels like a tiny obligation judging me.",
  "I am not sure whether I need to act or just stop narrating.",
  "My client asked a reasonable question and I turned it into a referendum on my competence.",
  "I miss someone, but I keep converting that into a plan I am not ready for.",
  "I am trying to decide where to live and every apartment feels like a prophecy.",
  "I have laundry, invoices, messages, and dinner to deal with, and now it is all one monster.",
  "I think I am fine, but my chest is doing a PowerPoint about doom.",
  "I am avoiding a conversation because I want it to be painless, which it will not be.",
  "I made progress today, but it does not count because I did not finish everything.",
  "I keep wanting permission to stop even though nobody is currently forcing me.",
  "The plan changed and now I feel personally betrayed by logistics.",
  "I have no idea what to do about work.",
  "Everything is complicated.",
  "My partner.",
  "I don't know what's wrong.",
  "School is bad and I don't know what to do.",
  "Help.",
  "I can't think.",
  "No words, just fog.",
  "I am done lol but maybe not lol.",
  "Humanity has fallen because my coffee order was wrong.",
  "Civilization collapsed when I saw the group chat had 83 messages.",
  "It is so over because I forgot to buy toothpaste.",
  "The meeting could have been an email and now I require justice.",
  "I opened one spreadsheet and immediately aged eight years.",
  "The laundry chair has become a second location.",
  "My to-do list is now a haunted scroll.",
  "I need to plan meals for the week without turning dinner into a civic institution.",
  "How do I organize a messy week when I have work, errands, and one appointment?",
  "I need help deciding whether to reply now or wait until I am less irritated.",
  "I have to make a budget, but I keep treating every expense like a moral failure.",
  "I need to ask for an extension, and I am making it mean I should not be in the program.",
  "How do I manage a packed morning without spiraling before 9 a.m.?",
  "I need to choose a birthday gift, but now it feels like evidence of how well I know them.",
  "I have to cancel something, and I keep confusing inconvenience with betrayal.",
  "I need to tell the client the timeline slipped, but I am mentally attending my own trial.",
  "I want to clean my room, but I keep seeing the whole house.",
  "I need to study, but I keep calculating how behind I am instead of reading.",
  "I notice I only feel ready after the moment has already passed.",
  "It feels like my brain wants a guarantee before it allows a beginning.",
  "Part of me knows this is small, and part of me has hired a disaster orchestra.",
  "I am realizing I call it uncertainty when I mean loss of control.",
  "Maybe I am not confused; maybe I am trying to make both outcomes painless.",
  "I keep mistaking intensity for information.",
  "It feels weird that nothing is wrong but I still feel braced.",
  "I wonder if I am using analysis to stay near the decision without entering it.",
  "I can see the pattern, but seeing it has not moved anything.",
  "There is a difference between wanting to be ready and needing to be ready, but I keep merging them.",
  "I hate myself for missing the deadline.",
  "I ruined everything and there is no point trying.",
  "I can't do this anymore, haha.",
  "My life is over because I sent the wrong attachment.",
  "I am scared I am failing, but I also know I am exhausted.",
  "I feel like one bad week erased all the good weeks.",
  "I keep making the next step carry the whole future.",
  "I got rejected and now every possible path looks fake.",
  "The silence after I sent the message feels like an answer.",
  "I am trying to prove I am okay before I let myself be okay.",
  "Loop keeps giving me something too advice-like; I want it to name the distortion.",
  "What is Loop supposed to do when I give it a messy prompt?",
  "Can Loop tell me exactly what action to take next?",
  "Why does this app avoid advice when advice is what I asked for?"
];

const columns = [
  "prompt",
  "whatsHappening",
  "theTragedy",
  "reset",
  "inputClass",
  "detectedState",
  "ambiguityLevel",
  "responseShape",
  "confidence",
  "compressionScore",
  "recognitionScore",
  "loopVoiceScore",
  "nonPrescriptiveScore",
  "clarityScore",
  "totalLRQI",
  "note",
  "weakestLine",
  "suggestedTragedy"
];

function parsePromptLimit(args) {
  const limitIndex = args.indexOf("--limit");

  if (limitIndex === -1) {
    return 100;
  }

  const rawLimit = args[limitIndex + 1];
  const limit = Number.parseInt(rawLimit ?? "", 10);

  if (!Number.isInteger(limit) || String(limit) !== rawLimit || limit < 1 || limit > 100) {
    throw new Error("--limit must be an integer from 1 to 100.");
  }

  return limit;
}

function assertSetup() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY. Add it to .env.local or set it in the environment before running this script.");
  }

  if (prompts.length !== 100) {
    throw new Error(`Expected exactly 100 prompts, found ${prompts.length}.`);
  }

  if (!Number.isFinite(judgeBatchSize) || judgeBatchSize < 1 || judgeBatchSize > 25) {
    throw new Error("LRQI_JUDGE_BATCH_SIZE must be a number from 1 to 25.");
  }
}

function csvCell(value) {
  const stringValue = value == null ? "" : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function csvRow(row) {
  return columns.map((column) => csvCell(row[column])).join(",");
}

function clampScore(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(max, Math.max(min, number));
}

async function callLoop(prompt) {
  let response;

  try {
    response = await fetch(loopApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: prompt })
    });
  } catch (error) {
    throw new Error(
      `Local Loop API is not reachable at ${loopApiUrl}. Start the local dev server with "npm run dev" and run this script again.`
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = payload.error ? ` API said: ${payload.error}` : "";
    throw new Error(`Local Loop API returned HTTP ${response.status}.${message}`);
  }

  if (!payload.response) {
    throw new Error("Local Loop API response did not include a response object.");
  }

  return payload.response;
}

async function collectLoopResponses(batchPrompts) {
  const rows = [];

  for (const [index, prompt] of batchPrompts.entries()) {
    const response = await callLoop(prompt);

    rows.push({
      prompt,
      whatsHappening: response.whatsHappening ?? "",
      theTragedy: response.oneStabilizingMove ?? "",
      reset: response.reset ?? "",
      inputClass: response.inputClass ?? "",
      detectedState: response.detectedState ?? "",
      ambiguityLevel: response.ambiguityLevel ?? "",
      responseShape: response.responseShape ?? "",
      confidence: response.confidence ?? "",
      compressionScore: "",
      recognitionScore: "",
      loopVoiceScore: "",
      nonPrescriptiveScore: "",
      clarityScore: "",
      totalLRQI: "",
      note: "",
      weakestLine: "",
      suggestedTragedy: ""
    });

    console.log(`Loop ${index + 1}/${batchPrompts.length}`);
  }

  return rows;
}

function scoreSchema(batchLength) {
  return {
    name: "lrqi_batch_scores",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        scores: {
          type: "array",
          minItems: batchLength,
          maxItems: batchLength,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              index: { type: "integer" },
              compressionScore: { type: "integer", minimum: 0, maximum: 2 },
              recognitionScore: { type: "integer", minimum: 0, maximum: 3 },
              loopVoiceScore: { type: "integer", minimum: 0, maximum: 2 },
              nonPrescriptiveScore: { type: "integer", minimum: 0, maximum: 1 },
              clarityScore: { type: "integer", minimum: 0, maximum: 2 },
              totalLRQI: { type: "integer", minimum: 0, maximum: 10 },
              note: { type: "string" },
              weakestLine: {
                type: "string",
                enum: ["whatsHappening", "theTragedy", "reset", "none"]
              },
              suggestedTragedy: { type: "string" }
            },
            required: [
              "index",
              "compressionScore",
              "recognitionScore",
              "loopVoiceScore",
              "nonPrescriptiveScore",
              "clarityScore",
              "totalLRQI",
              "note",
              "weakestLine",
              "suggestedTragedy"
            ]
          }
        }
      },
      required: ["scores"]
    }
  };
}

function judgePrompt(rows, offset) {
  return rows.map((row, localIndex) => ({
    index: offset + localIndex,
    prompt: row.prompt,
    loopResponse: {
      whatsHappening: row.whatsHappening,
      theTragedy: row.theTragedy,
      reset: row.reset,
      inputClass: row.inputClass,
      detectedState: row.detectedState,
      ambiguityLevel: row.ambiguityLevel,
      responseShape: row.responseShape,
      confidence: row.confidence
    }
  }));
}

async function judgeBatch(rows, offset, doctrine) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: judgeModel,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: scoreSchema(rows.length)
      },
      messages: [
        {
          role: "system",
          content: [
            "You are the LRQI judge for Loop responses.",
            "Use the provided Loop doctrine as the scoring standard.",
            "Score only the visible response fields: whatsHappening, theTragedy, and reset.",
            "LRQI is 0-10 total from these subscores: Compression 0-2, Recognition 0-3, Loop Voice 0-2, Non-Prescriptive 0-1, Clarity 0-2.",
            "Compression: few words, no essay, no bloated explanation.",
            "Recognition: creates the immediate feeling of 'Oh. That's what's happening.'",
            "Loop Voice: identifies, separates, compresses, and names without assistant, therapist, coach, or productivity-tool voice.",
            "Non-Prescriptive: does not tell the user what to do.",
            "Clarity: understandable, specific, and not cryptic.",
            "totalLRQI must equal the sum of the five subscores.",
            "The note should be one short sentence.",
            "suggestedTragedy should be a better The Tragedy line when useful, otherwise an empty string."
          ].join("\n")
        },
        {
          role: "system",
          content: `LOOP_DOCTRINE.md:\n${doctrine}`
        },
        {
          role: "user",
          content: JSON.stringify(judgePrompt(rows, offset))
        }
      ]
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.error?.message ?? "OpenAI judge request failed.";
    throw new Error(`OpenAI judge returned HTTP ${response.status}: ${message}`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI judge returned an empty response.");
  }

  return JSON.parse(content).scores;
}

function applyScore(row, score) {
  const compressionScore = clampScore(score.compressionScore, 0, 2);
  const recognitionScore = clampScore(score.recognitionScore, 0, 3);
  const loopVoiceScore = clampScore(score.loopVoiceScore, 0, 2);
  const nonPrescriptiveScore = clampScore(score.nonPrescriptiveScore, 0, 1);
  const clarityScore = clampScore(score.clarityScore, 0, 2);
  const totalLRQI =
    compressionScore +
    recognitionScore +
    loopVoiceScore +
    nonPrescriptiveScore +
    clarityScore;

  row.compressionScore = compressionScore;
  row.recognitionScore = recognitionScore;
  row.loopVoiceScore = loopVoiceScore;
  row.nonPrescriptiveScore = nonPrescriptiveScore;
  row.clarityScore = clarityScore;
  row.totalLRQI = totalLRQI;
  row.note = score.note ?? "";
  row.weakestLine = score.weakestLine ?? "";
  row.suggestedTragedy = score.suggestedTragedy ?? "";
}

async function scoreRows(rows, doctrine) {
  for (let offset = 0; offset < rows.length; offset += judgeBatchSize) {
    const batch = rows.slice(offset, offset + judgeBatchSize);
    const scores = await judgeBatch(batch, offset, doctrine);

    for (const score of scores) {
      const row = rows[score.index];
      if (!row) {
        throw new Error(`Judge returned an out-of-range index: ${score.index}`);
      }

      applyScore(row, score);
    }

    console.log(`Judged ${Math.min(offset + batch.length, rows.length)}/${rows.length}`);
  }
}

async function writeCsv(rows) {
  const csv = [columns.join(","), ...rows.map(csvRow)].join("\n");
  await writeFile(outputPath, `${csv}\n`, "utf8");
}

async function main() {
  assertSetup();

  const doctrine = await readFile(doctrinePath, "utf8");
  const batchPrompts = prompts.slice(0, promptLimit);

  console.log(`Calling local Loop API at ${loopApiUrl}`);
  const rows = await collectLoopResponses(batchPrompts);

  console.log(`Scoring with ${judgeModel} in batches of ${judgeBatchSize}`);
  await scoreRows(rows, doctrine);

  await writeCsv(rows);
  console.log(`Saved ${rows.length} rows to ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
