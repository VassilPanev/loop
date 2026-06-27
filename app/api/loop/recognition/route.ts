import { NextResponse } from "next/server";

type RecognitionValue = "yes" | "no" | null;
type Recognition = {
  whatsHappening: RecognitionValue;
  tragedy: RecognitionValue;
  reset: RecognitionValue;
};

function isRecognitionValue(value: unknown): value is RecognitionValue {
  return value === "yes" || value === "no" || value === null;
}

function isRecognition(value: unknown): value is Recognition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const recognition = value as Record<string, unknown>;
  return (
    isRecognitionValue(recognition.whatsHappening) &&
    isRecognitionValue(recognition.tragedy) &&
    isRecognitionValue(recognition.reset)
  );
}

export async function POST(request: Request) {
  try {
    const { recognition } = (await request.json()) as {
      recognition?: Recognition;
    };

    if (!isRecognition(recognition)) {
      return NextResponse.json({ error: "Invalid recognition." }, { status: 400 });
    }

    const webhookUrl = process.env.LOOP_DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json({ recognition });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const discordResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          allowed_mentions: { parse: [] },
          embeds: [
            {
              title: "Loop recognition",
              timestamp: new Date().toISOString(),
              fields: [
                {
                  name: "recognition",
                  value: JSON.stringify(recognition),
                  inline: true
                }
              ]
            }
          ]
        }),
        signal: controller.signal
      });

      if (!discordResponse.ok) {
        console.error(`Discord webhook failed with status ${discordResponse.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown webhook error";
      console.error(`Discord webhook error: ${errorMessage}`);
    } finally {
      clearTimeout(timeout);
    }

    return NextResponse.json({ recognition });
  } catch {
    return NextResponse.json({ error: "Invalid recognition." }, { status: 400 });
  }
}
