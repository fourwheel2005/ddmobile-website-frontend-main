import { compressImage } from "@/lib/imageCompress";
import { ACCEPTED_IMAGE_TYPES, checkImageFile } from "@/lib/serviceRequest";

/**
 * เตรียมรูปก่อนอัปโหลด: ย่อ (ด้านยาว ≤ maxDim) + บีบ JPEG → ปกติเหลือ 200–500KB จากรูปมือถือ 3–12MB
 * ทำ "ตอนเลือกรูป" ไม่ใช่ตอนกดส่ง → กดส่งแล้วอัปโหลดได้ทันที
 * ชนิดที่ server ไม่รับ (เช่น HEIC) บังคับแปลงเสมอแม้ไฟล์เล็ก — เบราว์เซอร์ถอดไม่ได้ = แจ้งลูกค้า
 */
export async function prepareImage(file: File, maxDim = 1600): Promise<{ file: File } | { error: string }> {
  if (!file.type.startsWith("image/") && file.type !== "") return { error: "ไฟล์ต้องเป็นรูปภาพ" };
  const supported = ACCEPTED_IMAGE_TYPES.includes(file.type);
  const out = await compressImage(file, { maxDim, quality: 0.8, skipUnderBytes: supported ? 300 * 1024 : 0 });
  const err = checkImageFile(out);
  if (err) return { error: supported ? err : "รูปชนิดนี้ใช้ไม่ได้ (เช่น HEIC) — ลองถ่ายใหม่หรือเลือกรูป JPG" };
  return { file: out };
}

let seq = 0;
export const newPhotoId = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`;
