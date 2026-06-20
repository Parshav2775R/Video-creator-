import { Router } from "express";

const router = Router();
const SAMPLE_RATE = 44100;
const FPS = 24;

// ── WAV Header ─────────────────────────────────────────────────────────────────
function makeWav(samples: Int16Array): Buffer {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    buf.writeInt16LE(samples[i], 44 + i * 2);
  }
  return buf;
}

function clamp(v: number) {
  return Math.max(-32767, Math.min(32767, Math.round(v)));
}

// ── Synthesizers ───────────────────────────────────────────────────────────────
function bell(duration = 2.0): Buffer {
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const dec = Math.exp(-3 * t);
    const v =
      (0.55 * Math.sin(2 * Math.PI * 880 * t) +
        0.25 * Math.sin(2 * Math.PI * 1760 * t) +
        0.1 * Math.sin(2 * Math.PI * 2200 * t)) *
      dec *
      0.85;
    s[i] = clamp(v * 32767);
  }
  return makeWav(s);
}

function whoosh(duration = 1.5): Buffer {
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const p = t / duration;
    const freq = 120 + p * 2800;
    const env = Math.sin(Math.PI * p);
    const v =
      (Math.sin(2 * Math.PI * freq * t) * 0.65 + (Math.random() * 2 - 1) * 0.3) * env * 0.6;
    s[i] = clamp(v * 32767);
  }
  return makeWav(s);
}

function pop(duration = 0.3): Buffer {
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 180 + 280 * (1 - t / duration);
    const v = Math.sin(2 * Math.PI * freq * t) * Math.exp(-14 * t) * 0.9;
    s[i] = clamp(v * 32767);
  }
  return makeWav(s);
}

function explosion(duration = 2.0): Buffer {
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const dec = Math.exp(-2.5 * t);
    const rumble = Math.sin(2 * Math.PI * 55 * t + Math.sin(2 * Math.PI * 28 * t));
    const v = ((Math.random() * 2 - 1) * 0.55 + rumble * 0.45) * dec * 0.9;
    s[i] = clamp(v * 32767);
  }
  return makeWav(s);
}

function rain(duration = 3.0): Buffer {
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Int16Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const noise = Math.random() * 2 - 1;
    prev = prev * 0.96 + noise * 0.04;
    const env =
      Math.min(1, t / 0.25) * Math.min(1, (duration - t) / 0.25);
    const v = (prev * 2.8 + (Math.random() * 2 - 1) * 0.25) * env * 0.45;
    s[i] = clamp(v * 32767);
  }
  return makeWav(s);
}

function successSound(duration = 1.0): Buffer {
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Int16Array(n);
  const notes = [523, 659, 784]; // C E G
  const nd = duration / notes.length;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const ni = Math.min(Math.floor(t / nd), notes.length - 1);
    const nt = t - ni * nd;
    const env =
      Math.min(1, nt * 22) * Math.max(0, 1 - Math.max(0, nt - (nd - 0.05)) * 40);
    const v = Math.sin(2 * Math.PI * notes[ni] * t) * env * 0.75;
    s[i] = clamp(v * 32767);
  }
  return makeWav(s);
}

function errorSound(duration = 0.8): Buffer {
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Int16Array(n);
  const notes = [440, 330];
  const nd = duration / notes.length;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const ni = Math.min(Math.floor(t / nd), notes.length - 1);
    const nt = t - ni * nd;
    const freq = notes[ni];
    const env =
      Math.min(1, nt * 18) * Math.max(0, 1 - Math.max(0, nt - (nd - 0.05)) * 35);
    const saw = ((t * freq) % 1) * 2 - 1;
    const v = (saw * 0.5 + Math.sin(2 * Math.PI * freq * t) * 0.5) * env * 0.6;
    s[i] = clamp(v * 32767);
  }
  return makeWav(s);
}

function heartbeat(duration = 2.0): Buffer {
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Int16Array(n);
  const interval = 60 / 72; // 72 BPM
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const bt = t % interval;
    let v = 0;
    if (bt < 0.12) {
      v = Math.sin(2 * Math.PI * 80 * bt) * Math.exp(-22 * bt) * 0.85;
    } else if (bt > 0.16 && bt < 0.28) {
      const bt2 = bt - 0.16;
      v = Math.sin(2 * Math.PI * 95 * bt2) * Math.exp(-28 * bt2) * 0.65;
    }
    s[i] = clamp(v * 32767);
  }
  return makeWav(s);
}

function magic(duration = 1.8): Buffer {
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Int16Array(n);
  const pings = 9;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let v = 0;
    for (let p = 0; p < pings; p++) {
      const pt = (p / pings) * duration;
      const dt = t - pt;
      if (dt >= 0 && dt < 0.35) {
        const freq = 1100 + p * 180;
        v += Math.sin(2 * Math.PI * freq * dt) * Math.exp(-14 * dt) * 0.18;
      }
    }
    s[i] = clamp(v * 32767);
  }
  return makeWav(s);
}

function applause(duration = 3.0): Buffer {
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env =
      Math.min(1, t * 2.2) * Math.min(1, (duration - t) * 2.2);
    const n1 = Math.random() * 2 - 1;
    const n2 = Math.random() * 2 - 1;
    const v = (n1 * 0.6 + n2 * 0.4) * (0.55 + 0.45 * Math.abs(Math.sin(2 * Math.PI * t * 4.5))) * env * 0.4;
    s[i] = clamp(v * 32767);
  }
  return makeWav(s);
}

function swoosh(duration = 0.6): Buffer {
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const p = t / duration;
    const freq = 3200 - p * 2800;
    const env = Math.sin(Math.PI * p) * 0.85;
    const v = (Math.sin(2 * Math.PI * freq * t) * 0.7 + (Math.random() - 0.5) * 0.3) * env;
    s[i] = clamp(v * 32767);
  }
  return makeWav(s);
}

function wind(duration = 3.0): Buffer {
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Int16Array(n);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const noise = Math.random() * 2 - 1;
    p1 = p1 * 0.99 + noise * 0.01;
    p2 = p2 * 0.995 + p1 * 0.005;
    const env =
      Math.min(1, t / 0.4) * Math.min(1, (duration - t) / 0.4);
    const swell = 0.7 + 0.3 * Math.sin(2 * Math.PI * t * 0.3);
    const v = (p2 * 5 + (Math.random() * 2 - 1) * 0.1) * env * swell * 0.5;
    s[i] = clamp(v * 32767);
  }
  return makeWav(s);
}

function dramaticHit(duration = 1.5): Buffer {
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const dec = Math.exp(-2 * t);
    const boom = Math.sin(2 * Math.PI * 45 * t) * 0.5;
    const mid = Math.sin(2 * Math.PI * 220 * t) * 0.3 * Math.exp(-5 * t);
    const high = (Math.random() * 2 - 1) * 0.15 * Math.exp(-8 * t);
    const v = (boom + mid + high) * dec * 0.95;
    s[i] = clamp(v * 32767);
  }
  return makeWav(s);
}

// ── Registry ──────────────────────────────────────────────────────────────────
const SOUNDS: Record<string, { name: string; category: string; emoji: string; duration: number; gen: () => Buffer }> = {
  bell: { name: "Bell Ding", category: "Notification", emoji: "🔔", duration: 2, gen: bell },
  success: { name: "Success Chime", category: "Notification", emoji: "✅", duration: 1, gen: successSound },
  error: { name: "Error Buzz", category: "Notification", emoji: "❌", duration: 0.8, gen: errorSound },
  pop: { name: "Cartoon Pop", category: "Cartoon", emoji: "🫧", duration: 0.3, gen: pop },
  whoosh: { name: "Whoosh", category: "Action", emoji: "💨", duration: 1.5, gen: whoosh },
  swoosh: { name: "Sword Swoosh", category: "Action", emoji: "⚔️", duration: 0.6, gen: swoosh },
  explosion: { name: "Explosion", category: "Action", emoji: "💥", duration: 2, gen: explosion },
  magic: { name: "Magic Sparkle", category: "Action", emoji: "✨", duration: 1.8, gen: magic },
  rain: { name: "Rainfall", category: "Ambient", emoji: "🌧️", duration: 3, gen: rain },
  wind: { name: "Strong Wind", category: "Ambient", emoji: "🌬️", duration: 3, gen: wind },
  applause: { name: "Applause", category: "Ambient", emoji: "👏", duration: 3, gen: applause },
  heartbeat: { name: "Heartbeat", category: "Ambient", emoji: "❤️", duration: 2, gen: heartbeat },
  dramatic: { name: "Dramatic Hit", category: "Music", emoji: "🎭", duration: 1.5, gen: dramaticHit },
};

// GET /api/sounds — list all sound effects
router.get("/sounds", (_req, res) => {
  const list = Object.entries(SOUNDS).map(([id, s]) => ({
    id,
    name: s.name,
    category: s.category,
    emoji: s.emoji,
    duration: s.duration,
  }));
  res.json(list);
});

// GET /api/sounds/:id — stream WAV audio
router.get("/sounds/:id", (req, res) => {
  const sound = SOUNDS[req.params.id];
  if (!sound) {
    res.status(404).json({ error: "Sound not found" });
    return;
  }
  const wav = sound.gen();
  res.set({
    "Content-Type": "audio/wav",
    "Content-Length": wav.length,
    "Cache-Control": "public, max-age=3600",
  });
  res.send(wav);
});

// Export generator for use in video compilation
export function generateSoundWav(id: string): Buffer | null {
  return SOUNDS[id]?.gen() ?? null;
}

export default router;
