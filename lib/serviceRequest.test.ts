import { describe, it, expect } from "vitest";
import { emptyTradeIn, PROBLEM_NONE, type TradeInForm } from "./tradeIn";
import {
  buildServiceMessage, buildSubmitData, buildSubmitFormData, checkImageFile, galleryUrl, missingRequiredSlots, newSubmissionKey, shareFilesFor,
  validateServiceRequest, MAX_TOTAL_BYTES,
  type PhotoItem, type PhotoSlot, type ServiceRequestState,
} from "./serviceRequest";

const form = (over: Partial<TradeInForm> = {}): TradeInForm => ({
  ...emptyTradeIn(),
  model: "iPhone 15", storage: "128GB", region: "TH", battery: "90-100", accessories: "full",
  warranty: "lt4m", body: "none", screen: "none", problems: [PROBLEM_NONE],
  name: "สมชาย", tel: "0812345678", subdistrict: "บางรัก", district: "บางรัก", province: "กรุงเทพมหานคร", zipcode: "10500",
  ...over,
});
const photo = (slot: PhotoSlot, size = 1000): PhotoItem => ({
  id: slot + Math.random(), slot, url: "blob:x", file: new File([new Uint8Array(size)], `${slot}.jpg`, { type: "image/jpeg" }),
});
const FIVE = (["FRONT", "BACK", "EDGE", "SCREEN", "DEFECT"] as PhotoSlot[]).map((s) => photo(s));
const idCard = new File([new Uint8Array(10)], "id.jpg", { type: "image/jpeg" });

const state = (over: Partial<ServiceRequestState> = {}): ServiceRequestState => ({
  services: ["SELL"], form: form(), photos: FIVE, installment: { productName: "", note: "" }, idCard: null, consent: false,
  loggedIn: true, ...over,
});

describe("validateServiceRequest — ต้องตรงกับ backend ServiceRequestRules", () => {
  it("ขายเครื่อง: ครบ 5 รูป + ช่องบังคับครบ → ผ่าน", () => {
    expect(validateServiceRequest(state())).toBeNull();
  });
  it("ขายเครื่อง: ขาดช่องบังคับ → บอกชื่อช่อง · ไม่ถึง 5 รูป → บอกจำนวน", () => {
    expect(validateServiceRequest(state({ photos: FIVE.filter((p) => p.slot !== "SCREEN").concat(photo("EXTRA")) }))).toMatch(/หน้าจอ/);
    expect(validateServiceRequest(state({ photos: FIVE.slice(0, 4) }))).toMatch(/อย่างน้อย 5 รูป/);
    expect(missingRequiredSlots([photo("FRONT")])).toEqual(["BACK", "EDGE", "SCREEN"]);
  });
  it("ผ่อนบอลลูน: ไม่มีรูปก็ส่งได้", () => {
    expect(validateServiceRequest(state({ services: ["BALLOON"], photos: [] }))).toBeNull();
  });
  it("ผ่อนเครื่อง: ต้องมีรุ่น + บัตรประชาชน + ยินยอม · ไม่ต้องกรอกข้อมูลเครื่อง", () => {
    const base = state({ services: ["INSTALLMENT"], form: form({ model: "", storage: "" }), photos: [] });
    expect(validateServiceRequest(base)).toMatch(/รุ่นที่ต้องการผ่อน/);
    const withModel = { ...base, installment: { productName: "iPhone 17", note: "" } };
    expect(validateServiceRequest(withModel)).toMatch(/บัตรประชาชน/);
    expect(validateServiceRequest({ ...withModel, idCard })).toMatch(/ยินยอม/);
    expect(validateServiceRequest({ ...withModel, idCard, consent: true })).toBeNull();
  });
  it("ผ่อนเครื่องต้องล็อกอิน · ขายเครื่อง/บอลลูนไม่ต้อง", () => {
    const inst = state({ services: ["INSTALLMENT"], photos: [], installment: { productName: "x" }, idCard, consent: true, loggedIn: false });
    expect(validateServiceRequest(inst)).toMatch(/เข้าสู่ระบบ/);
    expect(validateServiceRequest(state({ loggedIn: false }))).toBeNull();
    expect(validateServiceRequest(state({ services: ["BALLOON"], photos: [], loggedIn: false }))).toBeNull();
  });
  it("ไม่เลือกบริการ / ขาย+บอลลูน → error", () => {
    expect(validateServiceRequest(state({ services: [] }))).toMatch(/อย่างน้อย 1/);
    expect(validateServiceRequest(state({ services: ["SELL", "BALLOON"] }))).not.toBeNull();
  });
  it("รวมไฟล์เกินเพดาน → error (กันโดน 413 จาก server)", () => {
    const big = FIVE.map((p) => ({ ...p, file: new File([new Uint8Array(Math.ceil(MAX_TOTAL_BYTES / 4))], "b.jpg", { type: "image/jpeg" }) }));
    expect(validateServiceRequest(state({ photos: big }))).toMatch(/ใหญ่เกินไป/);
  });
});

describe("checkImageFile", () => {
  it("รับ JPG/PNG/WEBP เท่านั้น", () => {
    expect(checkImageFile(new File(["x"], "a.heic", { type: "image/heic" }))).not.toBeNull();
    expect(checkImageFile(new File(["x"], "a.jpg", { type: "image/jpeg" }))).toBeNull();
  });
});

describe("buildSubmitData / buildSubmitFormData", () => {
  it("ส่งเฉพาะส่วนของบริการที่เลือก — ติ๊กออกแล้วข้อมูลค้างใน state ไม่ถูกส่ง", () => {
    const d = buildSubmitData(state({ services: ["INSTALLMENT"], installment: { productName: " iPhone 17 ", note: " " }, consent: true }), "k", 9000);
    expect(d.device).toBeNull();
    expect(d.photoSlots).toEqual([]);
    expect(d.installment?.productName).toBe("iPhone 17");
    expect(d.installment?.note).toBeNull();
    expect(d.consent).toBe(true);
    const fd = buildSubmitFormData(state({ services: ["INSTALLMENT"], installment: { productName: "x" }, idCard, consent: true }), "k", null);
    expect(fd.getAll("photos")).toHaveLength(0);
    expect(fd.get("idCard")).toBeInstanceOf(File);
  });
  it("ขายเครื่อง: slot อยู่ใน data เรียงตรงกับไฟล์ · part น้อย (data + รูป) · ไม่แนบบัตรแม้มีใน state", () => {
    const fd = buildSubmitFormData(state({ idCard, consent: true }), "k", 12000);
    expect(fd.getAll("photos")).toHaveLength(5);
    expect(fd.getAll("photoSlots")).toHaveLength(0);
    expect([...fd.keys()].length).toBe(6);   // data + 5 รูป — ต้องไม่เกิน max-part-count ของ server
    expect(fd.get("idCard")).toBeNull();
    const d = buildSubmitData(state({ idCard, consent: true }), "k", 12000);
    expect(d.photoSlots).toEqual(["FRONT", "BACK", "EDGE", "SCREEN", "DEFECT"]);
    expect(d.consent).toBe(false);
    expect(d.device?.estimatedPrice).toBe(12000);
    expect(d.contact.province).toBe("กรุงเทพมหานคร");
  });
});

describe("buildServiceMessage", () => {
  it("มีเลขอ้างอิง + ชื่อบริการ + จำนวนรูป + สถานะบัตร (ไม่มีข้อมูลในบัตร)", () => {
    const s = state({ services: ["SELL", "INSTALLMENT"], installment: { productName: "iPhone 17 Pro", monthly: 2000, months: 12 }, idCard, consent: true });
    const msg = buildServiceMessage(s, { refCode: "DD-ABCDEF", tradeInId: 1, installmentId: 2, photoCount: 5, idCardAttached: true, duplicate: false, galleryToken: "t" }, null,
      galleryUrl("https://shop.example", "AbCdEfGhIjKlMnOpQrStUv"));
    expect(msg).toContain("อ้างอิง: DD-ABCDEF");
    expect(msg).toContain("ขายเครื่อง + ผ่อนเครื่อง");
    expect(msg).toContain("แนบรูปเครื่องผ่านเว็บแล้ว 5 รูป");
    expect(msg).toContain("แนบบัตรประชาชนผ่านเว็บแล้ว");
    expect(msg).toContain("x 12 เดือน");
    expect(msg).toContain("ที่อยู่: ต.บางรัก อ.บางรัก จ.กรุงเทพมหานคร 10500");
    // ลิงก์ดูรูป: บรรทัดเดียวโดด ๆ และเป็น URL เดียวในข้อความ (LINE ทำการ์ดพรีวิวจาก URL แรก)
    expect(msg).toContain("ดูรูปทั้งหมด: https://shop.example/r/AbCdEfGhIjKlMnOpQrStUv");
    expect(msg.match(/https?:\/\//g)).toHaveLength(1);
  });
  it("ไม่มีรูป → ไม่มีลิงก์ดูรูป", () => {
    const s = state({ services: ["BALLOON"], photos: [] });
    const msg = buildServiceMessage(s, { refCode: "DD-B", tradeInId: 1, installmentId: null, photoCount: 0, idCardAttached: false, duplicate: false, galleryToken: null }, null,
      galleryUrl("https://shop.example", null));
    expect(msg).not.toContain("ดูรูป");
    expect(galleryUrl("https://x", null)).toBeNull();
  });
});

describe("shareFilesFor", () => {
  it("ตั้งชื่อ ASCII ตามเลขอ้างอิง+ลำดับ+ช่อง · คงชนิดไฟล์ · ไม่รวมบัตรประชาชน (รับเฉพาะรูปเครื่องที่ส่งมา)", () => {
    const jpg = new File([new Uint8Array(3)], "รูปของฉัน.jpg", { type: "image/jpeg" });
    const png = new File([new Uint8Array(3)], "x.png", { type: "image/png" });
    const out = shareFilesFor([jpg, png], ["FRONT", "EXTRA"], "DD-ABC123");
    expect(out.map((f) => f.name)).toEqual(["DD-ABC123-1-front.jpg", "DD-ABC123-2-extra.png"]);
    expect(out.map((f) => f.type)).toEqual(["image/jpeg", "image/png"]);
    expect(out[0].size).toBe(3);
    expect(out.every((f) => /^[\x20-\x7e]+$/.test(f.name))).toBe(true);
  });
});

describe("newSubmissionKey", () => {
  it("รูปแบบ UUID (backend ตรวจ ^[0-9a-fA-F-]{36}$) และไม่ซ้ำ", () => {
    const keys = new Set(Array.from({ length: 50 }, newSubmissionKey));
    expect(keys.size).toBe(50);
    for (const k of keys) expect(k).toMatch(/^[0-9a-fA-F-]{36}$/);
  });
});
