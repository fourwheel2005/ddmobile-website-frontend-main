/** format เงินบาทกลางที่เดียว: ฿12,345 — เลิกเขียน helper ซ้ำรายไฟล์/สัญลักษณ์ไม่ตรงกัน (฿ vs .-) */
export const baht = (v: number | null | undefined, fallback = "-") =>
  v == null ? fallback : "฿" + Number(v).toLocaleString();
