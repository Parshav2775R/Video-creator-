import { Router } from "express";
import { createRequire } from "module";
import { writeFile, mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { generateSoundWav } from "./sounds.js";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require("fluent-ffmpeg");

const router = Router();

interface Scene {
  id: string;
  order: number;
  prompt: string;
  subtitle: string;
  imageUrl?: string | null;
  audioBase64?: string | null;
  duration?: number | null;
  soundEffectId?: string | null;
  soundVolume?: number | null;
  visualEffect?: string | null;
  transition?: string | null;
}

const VIDEO_OUTPUT_DIR = path.join(os.tmpdir(), "cartoon-videos");
const FPS = 24;

// ── Build per-scene video filter ───────────────────────────────────────────────
function buildSceneFilter(scene: Scene, idx: number): string {
  const duration = scene.duration ?? 3;
  const frames = Math.ceil(duration * FPS);
  const base = `[${idx}:v]scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2,setsar=1`;

  switch (scene.visualEffect) {
    case "zoom-in":
      return `${base},zoompan=z='min(1+0.3*on/${frames},1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=512x512:fps=${FPS}[v${idx}]`;
    case "zoom-out":
      return `${base},zoompan=z='max(1.0,1.3-0.3*on/${frames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=512x512:fps=${FPS}[v${idx}]`;
    case "pan-left":
      return `${base},zoompan=z=1.25:x='(iw-iw/zoom)*on/${frames}':y='(ih-ih/zoom)/2':d=${frames}:s=512x512:fps=${FPS}[v${idx}]`;
    case "pan-right":
      return `${base},zoompan=z=1.25:x='(iw-iw/zoom)*(1-on/${frames})':y='(ih-ih/zoom)/2':d=${frames}:s=512x512:fps=${FPS}[v${idx}]`;
    case "shake":
      return `${base},zoompan=z=1.05:x='iw/2-(iw/zoom/2)+sin(on*1.2)*4':y='ih/2-(ih/zoom/2)+cos(on*0.9)*4':d=${frames}:s=512x512:fps=${FPS}[v${idx}]`;
    case "fade": {
      const fd = Math.min(0.4, duration * 0.15);
      return `${base},fade=t=in:st=0:d=${fd},fade=t=out:st=${duration - fd}:d=${fd}[v${idx}]`;
    }
    default:
      return `${base}[v${idx}]`;
  }
}

// ── Mix TTS + sound effect for a scene ────────────────────────────────────────
async function buildSceneAudio(
  scene: Scene,
  workDir: string,
  idx: number,
): Promise<string | null> {
  const ttsPath = scene.audioBase64
    ? path.join(workDir, `tts_${idx}.mp3`)
    : null;
  if (ttsPath && scene.audioBase64) {
    await writeFile(ttsPath, Buffer.from(scene.audioBase64, "base64"));
  }

  const sfxPath = scene.soundEffectId
    ? path.join(workDir, `sfx_${idx}.wav`)
    : null;
  if (sfxPath && scene.soundEffectId) {
    const wav = generateSoundWav(scene.soundEffectId);
    if (wav) await writeFile(sfxPath, wav);
    else return ttsPath;
  }

  if (!ttsPath && !sfxPath) return null;
  if (ttsPath && !sfxPath) return ttsPath;
  if (!ttsPath && sfxPath) return sfxPath;

  // Mix TTS + SFX
  const volume = (scene.soundVolume ?? 50) / 100;
  const mixedPath = path.join(workDir, `mixed_${idx}.wav`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(ttsPath!)
      .input(sfxPath!)
      .complexFilter(
        `[0:a]volume=1.0[a0];[1:a]volume=${volume.toFixed(2)}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
        "aout",
      )
      .audioCodec("pcm_s16le")
      .output(mixedPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  return mixedPath;
}

// ── POST /api/video/compile ────────────────────────────────────────────────────
router.post("/video/compile", async (req, res) => {
  const { projectId, scenes } = req.body as {
    projectId?: string;
    scenes?: Scene[];
  };

  if (!projectId || !scenes || scenes.length === 0) {
    res.status(400).json({ error: "projectId and scenes are required" });
    return;
  }

  const workDir = path.join(os.tmpdir(), `video-${crypto.randomUUID()}`);

  try {
    await mkdir(workDir, { recursive: true });
    await mkdir(VIDEO_OUTPUT_DIR, { recursive: true });

    const sorted = [...scenes].sort((a, b) => a.order - b.order);
    const sceneImgPaths: string[] = [];
    const sceneAudioPaths: (string | null)[] = [];
    const subtitles: { text: string; start: number; end: number }[] = [];

    let timeOffset = 0;

    // ── Write images + audio per scene ─────────────────────────────────────
    for (let i = 0; i < sorted.length; i++) {
      const scene = sorted[i];
      const duration = scene.duration ?? 3;

      // Image
      if (scene.imageUrl) {
        let imgBuf: Buffer;
        if (scene.imageUrl.startsWith("data:")) {
          imgBuf = Buffer.from(scene.imageUrl.split(",")[1], "base64");
        } else {
          const r = await fetch(scene.imageUrl);
          imgBuf = Buffer.from(await r.arrayBuffer());
        }
        const imgPath = path.join(workDir, `img_${i}.jpg`);
        await writeFile(imgPath, imgBuf);
        sceneImgPaths.push(imgPath);
      } else {
        // Black frame placeholder
        const blankPath = path.join(workDir, `img_${i}.jpg`);
        await new Promise<void>((resolve, reject) => {
          ffmpeg()
            .input("color=c=black:size=512x512:rate=1")
            .inputOptions(["-f", "lavfi"])
            .frames(1)
            .output(blankPath)
            .on("end", resolve)
            .on("error", reject)
            .run();
        });
        sceneImgPaths.push(blankPath);
      }

      // Audio (TTS + optional SFX mix)
      const audioPath = await buildSceneAudio(scene, workDir, i);
      sceneAudioPaths.push(audioPath);

      // Subtitles
      subtitles.push({
        text: scene.subtitle || scene.prompt || "",
        start: timeOffset,
        end: timeOffset + duration,
      });
      timeOffset += duration;
    }

    // ── SRT subtitle file ──────────────────────────────────────────────────
    const srtPath = path.join(workDir, "subtitles.srt");
    const fmtTime = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 1000);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
    };
    const srtContent = subtitles
      .map(
        (sub, idx) =>
          `${idx + 1}\n${fmtTime(sub.start)} --> ${fmtTime(sub.end)}\n${sub.text}\n`,
      )
      .join("\n");
    await writeFile(srtPath, srtContent, "utf8");

    const videoPath = path.join(VIDEO_OUTPUT_DIR, `${projectId}.mp4`);
    const durations = sorted.map((s) => s.duration ?? 3);

    // ── FFmpeg ─────────────────────────────────────────────────────────────
    await new Promise<void>((resolve, reject) => {
      let cmd = ffmpeg();

      // Add each image input
      sceneImgPaths.forEach((imgPath, i) => {
        cmd = cmd.input(imgPath).inputOptions(["-loop", "1", "-t", String(durations[i])]);
      });

      // Add each audio input (silent if null)
      const audioInputOffset = sceneImgPaths.length;
      const hasAudio = sceneAudioPaths.some(Boolean);
      const audioInputIndices: number[] = [];

      if (hasAudio) {
        sceneAudioPaths.forEach((ap, i) => {
          if (ap) {
            cmd = cmd.input(ap);
            audioInputIndices.push(audioInputOffset + audioInputIndices.length);
          } else {
            // silent audio for scene duration
            cmd = cmd
              .input(`anullsrc=channel_layout=mono:sample_rate=44100`)
              .inputOptions(["-f", "lavfi", "-t", String(durations[i])]);
            audioInputIndices.push(audioInputOffset + audioInputIndices.length);
          }
        });
      }

      // Build filter_complex
      const sceneFilters = sceneImgPaths
        .map((_, i) => buildSceneFilter(sorted[i], i))
        .join(";");

      const concatVInputs = sceneImgPaths.map((_, i) => `[v${i}]`).join("");
      let filterComplex: string;

      if (hasAudio) {
        // Trim each audio to its scene duration, then concat video+audio
        const audioFilters = audioInputIndices
          .map(
            (aIdx, i) =>
              `[${aIdx}:a]atrim=duration=${durations[i]},asetpts=PTS-STARTPTS[a${i}]`,
          )
          .join(";");

        const concatAInputs = audioInputIndices.map((_, i) => `[a${i}]`).join("");
        const N = sceneImgPaths.length;

        filterComplex =
          `${sceneFilters};${audioFilters};` +
          `${concatVInputs}concat=n=${N}:v=1:a=0[vout];` +
          `${concatAInputs}concat=n=${N}:v=0:a=1[aout];` +
          `[vout]subtitles=${srtPath}:force_style='Fontsize=20,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2,Alignment=2,MarginV=15'[final]`;

        cmd
          .complexFilter(filterComplex, ["final", "aout"])
          .outputOptions([
            "-map", "[final]",
            "-map", "[aout]",
            "-c:v", "libx264",
            "-c:a", "aac",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-shortest",
          ])
          .output(videoPath)
          .on("end", resolve)
          .on("error", reject)
          .run();
      } else {
        const N = sceneImgPaths.length;
        filterComplex =
          `${sceneFilters};` +
          `${concatVInputs}concat=n=${N}:v=1:a=0[vout];` +
          `[vout]subtitles=${srtPath}:force_style='Fontsize=20,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2,Alignment=2,MarginV=15'[final]`;

        cmd
          .complexFilter(filterComplex, "final")
          .videoCodec("libx264")
          .outputOptions(["-pix_fmt", "yuv420p", "-movflags", "+faststart"])
          .output(videoPath)
          .on("end", resolve)
          .on("error", reject)
          .run();
      }
    });

    const fs = await import("fs/promises");
    const videoBuf = await fs.readFile(videoPath);
    await rm(workDir, { recursive: true, force: true });

    res.json({
      videoUrl: `data:video/mp4;base64,${videoBuf.toString("base64")}`,
      projectId,
    });
  } catch (err) {
    req.log.error({ err }, "Video compilation failed");
    if (existsSync(workDir)) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
    const message = err instanceof Error ? err.message : "Video compilation failed";
    res.status(500).json({ error: message });
  }
});

// GET /api/video/download/:projectId
router.get("/video/download/:projectId", async (req, res) => {
  const { projectId } = req.params;
  const videoPath = path.join(VIDEO_OUTPUT_DIR, `${projectId}.mp4`);
  if (!existsSync(videoPath)) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  res.download(videoPath, `cartoon-${projectId}.mp4`);
});

export default router;
