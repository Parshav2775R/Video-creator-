import { Router } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const execFileAsync = promisify(execFile);
const router = Router();

// ── Image generation via Pollinations.ai (free, no API key needed) ─────────────
router.post("/generate/image", async (req, res) => {
  const { prompt, style } = req.body as { prompt?: string; style?: string };

  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const styleMap: Record<string, string> = {
    anime: "anime style, vibrant colors, detailed linework",
    ghibli: "Studio Ghibli style, soft watercolor, whimsical",
    cartoon: "cartoon style, bold outlines, flat colors, comic book",
    pixel: "pixel art style, retro 8-bit",
    sketch: "pencil sketch, hand-drawn, black and white",
  };
  const stylePrompt = styleMap[style ?? "cartoon"] ?? styleMap.cartoon;
  const fullPrompt = `${prompt}, ${stylePrompt}, high quality`;

  try {
    req.log.info({ prompt: fullPrompt }, "Generating image via Pollinations.ai");

    const encodedPrompt = encodeURIComponent(fullPrompt);
    // Use a random seed so each call produces a unique image
    const seed = Math.floor(Math.random() * 1_000_000);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&model=flux&seed=${seed}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Pollinations HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    res.json({ imageUrl: `data:${contentType};base64,${base64}`, prompt: fullPrompt });
  } catch (err) {
    req.log.error({ err }, "Image generation failed");
    const message = err instanceof Error ? err.message : "Image generation failed";
    res.status(500).json({ error: message });
  }
});

// ── Hindi TTS via gTTS (Google Text-to-Speech) ────────────────────────────────
const PYTHON_TTS_SCRIPT = `
import sys, base64, io
from gtts import gTTS

text = sys.argv[1]
lang = sys.argv[2] if len(sys.argv) > 2 else 'hi'

tts = gTTS(text=text, lang=lang, slow=False)
buf = io.BytesIO()
tts.write_to_fp(buf)
buf.seek(0)
print(base64.b64encode(buf.getvalue()).decode(), end='')
`;

let pythonScriptPath: string | null = null;

async function getPythonScriptPath(): Promise<string> {
  if (pythonScriptPath && existsSync(pythonScriptPath)) return pythonScriptPath;
  const p = path.join(os.tmpdir(), `gtts_script_${crypto.randomUUID()}.py`);
  await writeFile(p, PYTHON_TTS_SCRIPT, "utf8");
  pythonScriptPath = p;
  return p;
}

router.post("/generate/speech", async (req, res) => {
  const { text, lang } = req.body as { text?: string; lang?: string };

  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  try {
    const scriptPath = await getPythonScriptPath();
    const language = lang ?? "hi"; // Default to Hindi

    const { stdout } = await execFileAsync(
      "python3",
      [scriptPath, text, language],
      { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 },
    );

    const audioBase64 = stdout.trim();
    if (!audioBase64) {
      throw new Error("gTTS returned empty audio");
    }

    res.json({ audioBase64, mimeType: "audio/mpeg" });
  } catch (err) {
    req.log.error({ err }, "Speech generation failed");
    const message = err instanceof Error ? err.message : "Speech generation failed";
    res.status(500).json({ error: message });
  }
});

// ── AI Story Structure Generator (Pollinations free text API) ─────────────────
router.post("/generate/story", async (req, res) => {
  const { topic, numScenes = 5, style = "anime" } = req.body as {
    topic?: string;
    numScenes?: number;
    style?: string;
  };

  if (!topic) {
    res.status(400).json({ error: "topic is required" });
    return;
  }

  const n = Math.max(2, Math.min(10, Number(numScenes) || 5));

  const systemPrompt = `You are a professional Hindi cartoon story writer and AI video director. You always respond with valid JSON only — no markdown, no extra text.`;

  const userPrompt = `Generate exactly ${n} scenes for a cartoon video about: "${topic}"

Return ONLY a JSON array with exactly ${n} objects. Each object must have:
- "prompt": detailed English description for AI image generation (vivid, visual, describe colors, lighting, characters, setting — 1-2 sentences)
- "subtitle": natural Hindi narration or dialogue for this scene in Devanagari script (1-2 sentences, engaging)
- "visualEffect": choose the best one: "none", "zoom-in", "zoom-out", "pan-left", "pan-right", "shake", "fade"
- "soundEffectId": choose the most fitting or null — options: "bell", "success", "error", "pop", "whoosh", "swoosh", "explosion", "magic", "rain", "wind", "applause", "heartbeat", "dramatic"
- "duration": number from 3 to 6 (longer for emotional/complex scenes)

Art style: ${style}
Make it a compelling story with a clear beginning, middle, and climactic end.
Hindi MUST be in Devanagari script only.
Return ONLY the JSON array, nothing else.`;

  try {
    req.log.info({ topic, numScenes: n }, "Generating story structure via Pollinations");

    const response = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        jsonMode: true,
        seed: Math.floor(Math.random() * 999999),
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      throw new Error(`Pollinations text API error: ${response.status}`);
    }

    let text = (await response.text()).trim();

    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    // Find JSON array
    const arrStart = text.indexOf("[");
    const arrEnd = text.lastIndexOf("]");
    if (arrStart !== -1 && arrEnd !== -1) {
      text = text.slice(arrStart, arrEnd + 1);
    }

    const scenes = JSON.parse(text) as unknown[];
    if (!Array.isArray(scenes) || scenes.length === 0) {
      throw new Error("Story generation returned invalid data");
    }

    res.json({ scenes, topic });
  } catch (err) {
    req.log.error({ err }, "Story generation failed");
    const message = err instanceof Error ? err.message : "Story generation failed";
    res.status(500).json({ error: message });
  }
});

export default router;
