/**
 * ย่อคลิปสินค้าในเบราว์เซอร์ของแอดมินก่อนอัปโหลด (WebCodecs ผ่าน mediabunny — ใช้ชิปเข้ารหัสวิดีโอของเครื่อง)
 *
 * ทำไมย่อที่เบราว์เซอร์: คลิปจาก iPhone เป็น HEVC (.mov) 60–350MB/นาที — Chrome บางเครื่อง/Firefox เปิดไม่ได้
 * ถ้าแปลงที่เซิร์ฟเวอร์ต้องลง ffmpeg และแย่งหน่วยความจำ 1GB กับระบบหลัก → ย่อที่นี่เป็น MP4 H.264 ≤ 720p
 * (~10–20MB) เล่นได้ทุกเบราว์เซอร์ · เซิร์ฟเวอร์ตรวจซ้ำจากตัวไฟล์ (Mp4Inspector) เสมอ
 *
 * mediabunny โหลดแบบ dynamic import เฉพาะตอนแอดมินกดเพิ่มคลิป — หน้าเว็บลูกค้าไม่ต้องโหลดไลบรารีนี้
 */

export const CLIP_MAX_SECONDS = 120;
/** ต่ำกว่าเพดานเซิร์ฟเวอร์ (25MB) เผื่อ overhead ของ multipart + รูปปก */
export const CLIP_MAX_BYTES = 24 * 1024 * 1024;
const BUDGET_BYTES = 22 * 1024 * 1024;
const AUDIO_BPS = 96_000;
const MAX_VIDEO_BPS = 2_500_000;
const MIN_VIDEO_BPS = 600_000;

/** ข้อความที่แสดงให้แอดมินได้ตรง ๆ (ไม่ใช่ error ทางเทคนิค) */
export class ClipError extends Error {}

export interface CompressedClip {
  video: File;          // MP4 H.264 (+ AAC/Opus)
  poster: File;         // JPEG เฟรมจากคลิป
  width: number;
  height: number;
  durationSec: number;
}

/** ขนาดผลลัพธ์: ด้านสั้น ≤ 720 · ด้านยาว ≤ 1280 · ไม่ขยายคลิปเล็ก · เลขคู่ (H.264 บังคับ) */
export function targetSize(width: number, height: number): { width: number; height: number } {
  const long = Math.max(width, height), short = Math.min(width, height);
  const scale = Math.min(1, 1280 / long, 720 / short);
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(width), height: even(height) };
}

/** bitrate วิดีโอ: ให้ไฟล์ทั้งคลิปไม่เกิน ~22MB · คลิปสั้นได้คมสุด 2.5Mbps · ยาวสุด 2 นาทียังไม่ต่ำกว่า ~1.4Mbps */
export function videoBitrate(durationSec: number): number {
  const d = Math.max(1, durationSec);
  const budget = (BUDGET_BYTES * 8) / d - AUDIO_BPS;
  return Math.round(Math.min(MAX_VIDEO_BPS, Math.max(MIN_VIDEO_BPS, budget)));
}

/** 75_500 → "1:15" */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function canCompressHere(): boolean {
  return typeof window !== "undefined" && typeof window.VideoEncoder === "function" && typeof window.VideoDecoder === "function";
}

/**
 * ย่อคลิป → MP4 H.264 + รูปปก (เฟรมวินาทีที่ 1)
 * onProgress: 0–1 · signal: ยกเลิกกลางทาง
 */
export async function compressClip(
  file: File,
  { onProgress, signal }: { onProgress?: (p: number) => void; signal?: AbortSignal } = {},
): Promise<CompressedClip> {
  if (!canCompressHere()) {
    throw new ClipError("เบราว์เซอร์นี้ย่อคลิปไม่ได้ — ใช้ Chrome หรือ Safari เวอร์ชันล่าสุด (คอมหรือ iPhone ก็ได้)");
  }
  const mb = await import("mediabunny");
  const input = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(file) });
  try {
    const video = await input.getPrimaryVideoTrack().catch(() => null);
    if (!video) throw new ClipError("เปิดไฟล์นี้ไม่ได้ หรือไฟล์ไม่มีภาพวิดีโอ — เลือกไฟล์คลิป (.mp4 / .mov)");
    if (!(await video.canDecode())) {
      throw new ClipError("เบราว์เซอร์นี้เปิดคลิปไฟล์นี้ไม่ได้ (มักเป็นคลิป HEVC จาก iPhone บน Windows) — ลองใช้ Safari หรือ Chrome บน Mac/iPhone");
    }
    const durationSec = await input.computeDuration();
    if (!(durationSec > 0)) throw new ClipError("อ่านความยาวคลิปไม่ได้ — ลองบันทึกคลิปใหม่แล้วอัปอีกครั้ง");
    if (durationSec > CLIP_MAX_SECONDS + 0.5) {
      throw new ClipError(`คลิปยาว ${formatDuration(durationSec * 1000)} นาที — ยาวได้ไม่เกิน 2 นาที ตัดคลิปในมือถือก่อนแล้วอัปใหม่`);
    }

    const size = targetSize(await video.getDisplayWidth(), await video.getDisplayHeight());
    const bitrate = videoBitrate(durationSec);
    if (!(await mb.canEncodeVideo("avc", { width: size.width, height: size.height, bitrate }))) {
      throw new ClipError("เบราว์เซอร์นี้สร้างไฟล์ H.264 ไม่ได้ — ใช้ Chrome หรือ Safari เวอร์ชันล่าสุด");
    }
    // iPhone อัด 60fps ได้ → ลดเหลือ 30 (ภาพสินค้าไม่ต้องลื่นขนาดนั้น ได้ความคมต่อ bitrate เท่าเดิมเพิ่มเกือบเท่าตัว)
    const fps = (await video.computePacketStats(90).catch(() => null))?.averagePacketRate ?? 30;

    const audio = await input.getPrimaryAudioTrack().catch(() => null);
    let audioCodec: "aac" | "opus" | null = null;
    if (audio) {
      const enc = await mb.getFirstEncodableAudioCodec(["aac", "opus"], { quality: new mb.Quality({ bitrate: AUDIO_BPS }) });
      audioCodec = enc === "aac" || enc === "opus" ? enc : null;
      // เข้ารหัส AAC ไม่ได้แต่ต้นฉบับเป็น AAC อยู่แล้ว → คัดลอกเสียงเดิมได้เลย
      if (!audioCodec && (await audio.getCodec()) === "aac") audioCodec = "aac";
    }

    const target = new mb.BufferTarget();
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target });
    const conversion = await mb.Conversion.init({
      input, output, tracks: "primary", showWarnings: false,
      tags: {},   // ตัด metadata ต้นฉบับ (พิกัด GPS / รุ่นเครื่องในคลิป iPhone) ไม่ให้หลุดขึ้นเว็บ
      video: {
        codec: "avc", width: size.width, height: size.height, fit: "contain",
        // ⚠️ Quality(ตัวเลข) = ระดับคุณภาพ ไม่ใช่ bitrate — ต้องส่งเป็น { bitrate } (ไม่งั้นแทร็กวิดีโอถูกทิ้งเงียบ ๆ)
        quality: new mb.Quality({ bitrate, bitrateMode: "variable" }), keyFrameInterval: 2, forceTranscode: true,
        allowTransformationMetadata: false,   // หมุนภาพลงเฟรมจริง ไม่พึ่ง metadata การหมุน (เล่นตรงทุกเครื่อง)
        ...(fps > 32 ? { frameRate: 30 } : {}),
      },
      audio: audioCodec ? { codec: audioCodec, quality: new mb.Quality({ bitrate: AUDIO_BPS }) } : { discard: true },
    });
    // isValid = true ได้แม้แทร็กวิดีโอถูกทิ้ง (เหลือแต่เสียง) → ต้องเช็กเองว่ามีวิดีโอในผลลัพธ์จริง
    if (!conversion.isValid || !conversion.utilizedTracks.some((t) => t.type === "video")) {
      console.warn("clip conversion discarded", conversion.discardedTracks.map((d) => `${d.track.type}: ${d.reason}`));
      throw new ClipError("แปลงคลิปนี้ไม่ได้ — ลองบันทึกคลิปใหม่จากมือถือแล้วอัปอีกครั้ง");
    }
    conversion.onProgress = (p) => onProgress?.(Math.min(0.99, p));
    const abort = () => { conversion.cancel().catch(() => {}); };
    signal?.addEventListener("abort", abort, { once: true });
    try {
      await conversion.execute();
    } catch (e) {
      if (signal?.aborted) throw new ClipError("ยกเลิกแล้ว");
      throw e;
    } finally {
      signal?.removeEventListener("abort", abort);
    }
    if (!target.buffer) throw new ClipError("แปลงคลิปไม่สำเร็จ — ลองใหม่อีกครั้ง");
    if (target.buffer.byteLength > CLIP_MAX_BYTES) {
      throw new ClipError("คลิปยังใหญ่เกินไปหลังย่อ — ตัดคลิปให้สั้นลงแล้วลองใหม่");
    }

    const poster = await posterFrame(mb, video, Math.min(1, durationSec / 4), size);
    onProgress?.(1);
    return {
      video: new File([target.buffer], "clip.mp4", { type: "video/mp4" }),
      poster,
      width: size.width,
      height: size.height,
      durationSec,
    };
  } finally {
    input.dispose();
  }
}

/** เฟรมจากต้นฉบับ (ภาพคมกว่าเฟรมที่ย่อแล้ว) เป็น JPEG ขนาดเท่าคลิป */
async function posterFrame(
  mb: typeof import("mediabunny"),
  video: import("mediabunny").InputVideoTrack,
  at: number,
  size: { width: number; height: number },
): Promise<File> {
  const sink = new mb.CanvasSink(video, { width: size.width, height: size.height, fit: "contain" });
  const frame = (await sink.getCanvas(at)) ?? (await sink.getCanvas(0));
  if (!frame) throw new ClipError("ดึงภาพปกจากคลิปไม่ได้ — ลองใหม่อีกครั้ง");
  return canvasToJpeg(frame.canvas, "poster.jpg");
}

/** canvas (ธรรมดาหรือ Offscreen) → ไฟล์ JPEG */
export async function canvasToJpeg(canvas: HTMLCanvasElement | OffscreenCanvas, name: string): Promise<File> {
  const blob = "convertToBlob" in canvas
    ? await canvas.convertToBlob({ type: "image/jpeg", quality: 0.86 })
    : await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.86));
  if (!blob) throw new ClipError("สร้างรูปปกไม่สำเร็จ");
  return new File([blob], name, { type: "image/jpeg" });
}
