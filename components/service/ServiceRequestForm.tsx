"use client";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, HelpCircle, Loader2, LogIn, Send, ShieldCheck, Wallet } from "lucide-react";
import api from "@/lib/api";
import { baht } from "@/lib/money";
import { loadPrefill, toGeo } from "@/lib/profile";
import { isProfileComplete } from "@/lib/session";
import { SERVICES, SERVICE_ORDER, needsDevice, toggleService, type ServiceCode } from "@/lib/services";
import {
  ACCESSORIES, BATTERY, BODY, COLORS, DEVICE_TYPES, PROBLEMS, PROBLEM_NONE, REGIONS, SCREEN, STORAGES, WARRANTY,
  emptyTradeIn, estimatePrice, modelsFor, type TradeInForm,
} from "@/lib/tradeIn";
import { installmentLines, type InstallmentInterest, type PhotoItem, type ServiceRequestState } from "@/lib/serviceRequest";
import ThaiAddressAutocomplete, { type ThaiGeo } from "@/components/ThaiAddressAutocomplete";
import { CheckCard, Field, FormCard, RadioCards } from "./FormParts";
import PhotoUploader from "./PhotoUploader";
import IdCardUpload, { IdCardConsent, type PickedImage } from "./IdCardUpload";
import SubmitSuccess from "./SubmitSuccess";
import { useServiceSubmit } from "./useServiceSubmit";

interface TradeInPrice { id: number; model: string; storage: string; basePrice: number; }
const OTHER = "__other__";

/**
 * ฟอร์มเลือกบริการ — ติ๊กได้หลายบริการ ระบบโชว์ช่องข้อมูลตามที่เลือก
 *   ขายเครื่อง   → ข้อมูลเครื่อง + รูปเครื่อง ≥ 5 รูป (บังคับ)
 *   ผ่อนบอลลูน  → ข้อมูลเครื่อง + รูปเครื่อง (ไม่บังคับ)
 *   ผ่อนเครื่อง  → รุ่นที่ต้องการ + บัตรประชาชน + ยินยอม
 * ขายเครื่อง กับ ผ่อนบอลลูน เลือกพร้อมกันไม่ได้ (เครื่องเดียวกัน) — ติ๊กอันหนึ่ง อีกอันหลุดเอง
 *
 * {@code lockedServices} = ใช้ในกล่องผ่อนจากหน้าสินค้า (บริการตายตัว ซ่อนช่องเลือก)
 */
export default function ServiceRequestForm({ initialServices, lockedServices, presetInstallment }: {
  initialServices: ServiceCode[];
  lockedServices?: ServiceCode[];
  presetInstallment?: InstallmentInterest;
}) {
  const [services, setServices] = useState<ServiceCode[]>(lockedServices ?? initialServices);
  const [form, setForm] = useState<TradeInForm>(emptyTradeIn);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [idCard, setIdCard] = useState<PickedImage | null>(null);
  const [consent, setConsent] = useState(false);
  const [interest, setInterest] = useState<InstallmentInterest>(presetInstallment ?? { productName: "", note: "" });
  const [prices, setPrices] = useState<TradeInPrice[] | null>(null);
  const [customModel, setCustomModel] = useState(false);
  const [customColor, setCustomColor] = useState(false);
  const [profileGeo, setProfileGeo] = useState<ThaiGeo | null>(null);
  // null = ยังไม่รู้ (ก่อนอ่าน localStorage — หน้า static อ่านตอน render ไม่ได้ ไม่งั้น hydration ไม่ตรง)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);   // ชื่อ + เบอร์ + ที่อยู่ครบ (กติกาสมาชิก)
  const { submit, progress, done, reset, resetKey } = useServiceSubmit();

  const set = (patch: Partial<TradeInForm>) => setForm((f) => ({ ...f, ...patch }));
  const device = needsDevice(services);
  const sending = progress != null;

  // ข้อมูลเปลี่ยน = ความตั้งใจใหม่ → ทิ้ง submissionKey เดิม (กัน server คืนคำขอเก่าที่ข้อมูลไม่ตรง)
  useEffect(() => { resetKey(); }, [services, form, photos, idCard, consent, interest, resetKey]);

  // คืนหน่วยความจำ blob URL ของรูปทั้งหมดตอนออกจากหน้า
  const filesRef = useRef({ photos, idCard });
  useEffect(() => { filesRef.current = { photos, idCard }; }, [photos, idCard]);
  useEffect(() => () => {
    filesRef.current.photos.forEach((p) => URL.revokeObjectURL(p.url));
    if (filesRef.current.idCard) URL.revokeObjectURL(filesRef.current.idCard.url);
  }, []);

  // เติม ชื่อ/เบอร์/ที่อยู่ จากโปรไฟล์ (localStorage = 0 request) — เฉพาะช่องที่ยังว่าง
  useEffect(() => {
    let alive = true;
    loadPrefill().then((u) => {
      if (!alive) return;
      setLoggedIn(!!u);
      setProfileComplete(isProfileComplete(u));
      if (!u) return;
      const a = toGeo(u.address);
      setProfileGeo(a);
      setForm((prev) => ({ ...prev, name: prev.name || u.name || "", tel: prev.tel || u.tel || "", ...(a && !prev.province ? a : {}) }));
    });
    return () => { alive = false; };
  }, []);

  // ราคาฐาน — โหลดเฉพาะเมื่อเลือกบริการที่ประเมินเครื่อง (ผ่อนเครื่องอย่างเดียวไม่ต้องยิง) · โหลดครั้งเดียว
  const pricesRequested = useRef(false);
  useEffect(() => {
    if (!device || pricesRequested.current) return;
    pricesRequested.current = true;
    api.get("/trade-in/prices").then((r) => setPrices(Array.isArray(r.data) ? r.data : [])).catch(() => setPrices([]));
  }, [device]);

  const modelOptions = useMemo(() => modelsFor(form.deviceType), [form.deviceType]);
  const basePrice = useMemo(
    () => prices?.find((p) => p.model === form.model && p.storage === form.storage)?.basePrice ?? null,
    [prices, form.model, form.storage],
  );
  const estimated = useMemo(() => estimatePrice(basePrice, form), [basePrice, form]);
  const conditionDone = !!(form.battery && form.accessories && form.warranty && form.body && form.screen && form.region && form.problems.length > 0);
  const shownEstimate = device && conditionDone ? estimated : null;

  const geo = useMemo<ThaiGeo | null>(
    () => (form.province ? { subdistrict: form.subdistrict, district: form.district, province: form.province, zipcode: form.zipcode } : null),
    [form.subdistrict, form.district, form.province, form.zipcode],
  );
  const geoFromProfile = !!geo && !!profileGeo && geo.subdistrict === profileGeo.subdistrict
    && geo.district === profileGeo.district && geo.zipcode === profileGeo.zipcode;

  const toggleProblem = (value: string) => setForm((f) => {
    if (value === PROBLEM_NONE) return { ...f, problems: [PROBLEM_NONE] };
    const withoutNone = f.problems.filter((p) => p !== PROBLEM_NONE);
    return { ...f, problems: withoutNone.includes(value) ? withoutNone.filter((p) => p !== value) : [...withoutNone, value] };
  });

  const state: ServiceRequestState = {
    services, form, photos, installment: interest, idCard: idCard?.file ?? null, consent, loggedIn: loggedIn === true,
  };
  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); void submit(state, device ? estimated : null); };

  if (done) {
    return <SubmitSuccess done={done} onNew={lockedServices ? undefined : reset} />;
  }

  // ทุกบริการเฉพาะสมาชิกที่ข้อมูลครบ — หน้าแนะนำบริการเปิดให้ดู แต่ฟอร์มแสดงเมื่อพร้อมเท่านั้น
  // (ไม่ให้กรอก/อัปรูปไปก่อนแล้วค่อยมาเจอว่าส่งไม่ได้)
  if (loggedIn === null) {
    return <div className="card-dd flex justify-center py-10"><Loader2 className="animate-spin text-text-muted" /></div>;
  }
  if (!loggedIn) return <MemberGate kind="login" />;
  if (!profileComplete) return <MemberGate kind="complete" />;

  let step = 0;
  const next = () => ++step;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {/* ===== ช่องเลือกบริการ ===== */}
      {!lockedServices && (
        <FormCard step={next()} title="เลือกบริการที่ต้องการ">
          <ServicePicker value={services} onChange={setServices} />
        </FormCard>
      )}

      {/* ===== ข้อมูลเครื่อง (ขายเครื่อง / ผ่อนบอลลูน) ===== */}
      {device && (
        <FormCard step={next()} title={services.includes("SELL") ? "เครื่องที่จะขาย" : "เครื่องที่จะแลกเงิน"}>
          <Field label="ประเภทเครื่อง *">
            <RadioCards options={DEVICE_TYPES} value={form.deviceType} onChange={(v) => { set({ deviceType: v, model: "" }); setCustomModel(false); }} cols={2} />
          </Field>
          <Field label="รุ่น *">
            {!customModel ? (
              <select value={form.model} onChange={(e) => { if (e.target.value === OTHER) { setCustomModel(true); set({ model: "" }); } else set({ model: e.target.value }); }} className="input-dd cursor-pointer">
                <option value="">— เลือกรุ่น —</option>
                {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                <option value={OTHER}>รุ่นอื่นๆ (พิมพ์เอง)</option>
              </select>
            ) : (
              <div className="space-y-2">
                <input value={form.model} onChange={(e) => set({ model: e.target.value })} maxLength={120} className="input-dd" placeholder="พิมพ์ชื่อรุ่น เช่น iPhone 17 Pro Max" autoFocus />
                <button type="button" onClick={() => { setCustomModel(false); set({ model: "" }); }} className="text-xs font-semibold text-yellow-text hover:text-text-heading">← เลือกจากรายการรุ่น</button>
              </div>
            )}
          </Field>
          <Field label="ความจุ *">
            <RadioCards options={STORAGES} value={form.storage} onChange={(v) => set({ storage: v })} cols={3} compact />
          </Field>
          <Field label="สี (ถ้าทราบ)">
            {!customColor ? (
              <select value={form.color} onChange={(e) => { if (e.target.value === OTHER) { setCustomColor(true); set({ color: "" }); } else set({ color: e.target.value }); }} className="input-dd cursor-pointer sm:max-w-sm">
                <option value="">— เลือกสี (ไม่บังคับ) —</option>
                {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value={OTHER}>อื่นๆ (พิมพ์เอง)</option>
              </select>
            ) : (
              <div className="space-y-2 sm:max-w-sm">
                <input value={form.color} onChange={(e) => set({ color: e.target.value })} maxLength={60} className="input-dd" placeholder="พิมพ์สี เช่น Desert Titanium" autoFocus />
                <button type="button" onClick={() => { setCustomColor(false); set({ color: "" }); }} className="text-xs font-semibold text-yellow-text hover:text-text-heading">← เลือกจากรายการสี</button>
              </div>
            )}
          </Field>
          <Field label="เวอร์ชันเครื่อง *">
            <RadioCards options={REGIONS} value={form.region} onChange={(v) => set({ region: v })} cols={3} />
          </Field>
          <Field label="สุขภาพแบตเตอรี่ *">
            <RadioCards options={BATTERY} value={form.battery} onChange={(v) => set({ battery: v })} cols={3} />
          </Field>
          <Field label="อุปกรณ์เสริมที่มี *">
            <RadioCards options={ACCESSORIES} value={form.accessories} onChange={(v) => set({ accessories: v })} cols={3} />
          </Field>
          <Field label="ประกัน *">
            <RadioCards options={WARRANTY} value={form.warranty} onChange={(v) => set({ warranty: v })} cols={2} />
          </Field>
          <Field label="สภาพรอบเครื่อง (บอดี้) *">
            <RadioCards options={BODY} value={form.body} onChange={(v) => set({ body: v })} cols={2} />
          </Field>
          <Field label="สภาพหน้าจอ *">
            <RadioCards options={SCREEN} value={form.screen} onChange={(v) => set({ screen: v })} cols={2} />
          </Field>
          <Field label="ปัญหาตัวเครื่อง (เลือกได้มากกว่า 1) *">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <CheckCard label="ไม่มีปัญหา" checked={form.problems.includes(PROBLEM_NONE)} onChange={() => toggleProblem(PROBLEM_NONE)} highlight />
              {PROBLEMS.map((o) => (
                <CheckCard key={o.value} label={o.label} checked={form.problems.includes(o.value)} onChange={() => toggleProblem(o.value)} />
              ))}
            </div>
          </Field>
        </FormCard>
      )}

      {/* ===== รูปเครื่อง ===== */}
      {device && (
        <FormCard step={next()} title={services.includes("SELL") ? "รูปเครื่องของคุณ (อย่างน้อย 5 รูป)" : "รูปเครื่องของคุณ (ไม่บังคับ)"}>
          {!services.includes("SELL") && <p className="-mt-2 text-sm text-text-muted">แนบรูปช่วยให้ทีมงานประเมินวงเงินได้ไวและแม่นขึ้น</p>}
          <PhotoUploader photos={photos} setPhotos={setPhotos} requireMin={services.includes("SELL")} />
        </FormCard>
      )}

      {/* ===== ผ่อนเครื่อง ===== */}
      {services.includes("INSTALLMENT") && (
        <FormCard step={next()} title="ผ่อนเครื่อง — เอกสารประกอบ">
          {presetInstallment ? (
            <div className="rounded-xl border border-border-default bg-bg-subtle p-3.5 text-sm">
              <p className="mb-1 font-bold text-text-heading">เครื่องที่ต้องการผ่อน</p>
              {installmentLines(presetInstallment).map((l) => <p key={l} className="text-text-body">{l}</p>)}
            </div>
          ) : (
            <Field label="รุ่นที่ต้องการผ่อน *">
              <input value={interest.productName} onChange={(e) => setInterest((i) => ({ ...i, productName: e.target.value }))} maxLength={200}
                className="input-dd" placeholder="เช่น iPhone 17 Pro Max 256GB สีเงิน" />
              <p className="mt-1.5 text-xs text-text-muted">
                ยังไม่ได้เลือกเครื่อง? <Link href="/products" className="font-semibold text-yellow-text hover:underline">ดูสินค้าผ่อนได้</Link>
              </p>
            </Field>
          )}
          <Field label="หมายเหตุ (ถ้ามี)">
            <input value={interest.note ?? ""} onChange={(e) => setInterest((i) => ({ ...i, note: e.target.value }))} maxLength={500}
              className="input-dd" placeholder="เช่น อาชีพ / เวลาที่สะดวกให้ติดต่อ" />
          </Field>
          <Field label="บัตรประชาชน *">
            <IdCardUpload value={idCard} onChange={setIdCard} />
          </Field>
          <IdCardConsent checked={consent} onChange={setConsent} />
        </FormCard>
      )}

      {/* ===== ติดต่อกลับ ===== */}
      {services.length > 0 && (
        <FormCard step={next()} title="ข้อมูลติดต่อกลับ">
          <ContactFields form={form} setForm={setForm} geo={geo} geoFromProfile={geoFromProfile} />
        </FormCard>
      )}

      {/* ===== ราคาประเมินเบื้องต้น ===== */}
      {shownEstimate != null ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border-2 border-yellow bg-yellow/10 p-5">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-text-heading"><Wallet size={16} className="text-yellow-hover" /> ราคาประเมินเบื้องต้น</p>
            <p className="mt-0.5 truncate text-xs text-text-muted">{form.model} {form.storage} · หักตามสภาพที่เลือก</p>
          </div>
          <p className="flex-shrink-0 text-2xl font-bold text-price md:text-3xl">{baht(shownEstimate)}</p>
        </div>
      ) : device && prices && basePrice == null && form.model && form.storage ? (
        <div className="rounded-2xl border border-info-border bg-info-bg p-4 text-sm text-info-text">
          <p className="flex items-start gap-1.5"><Wallet size={15} className="mt-0.5 flex-shrink-0" /> รุ่นนี้ยังไม่มีราคาประเมินอัตโนมัติ — ส่งข้อมูลให้ทีมงานตีราคาได้เลย</p>
        </div>
      ) : null}

      {services.length > 0 && (
        <>
          <div className="rounded-2xl border border-border-default bg-bg-subtle p-4 text-xs text-text-muted">
            <p className="flex items-start gap-1.5"><HelpCircle size={14} className="mt-0.5 flex-shrink-0" /> การประเมิน/พิจารณาผ่านเว็บเป็นข้อมูลเบื้องต้น จำนวนเงินและเงื่อนไขสุดท้ายแอดมินจะยืนยันกับคุณก่อนดำเนินการทุกครั้ง</p>
          </div>
          <button type="submit" disabled={sending} className="btn-primary relative w-full overflow-hidden py-4 text-base">
            {sending && <span className="absolute inset-y-0 left-0 bg-black/10 transition-[width]" style={{ width: `${progress}%` }} aria-hidden />}
            <span className="relative inline-flex items-center gap-2">
              {sending ? `กำลังส่งข้อมูล… ${progress}%` : <><Send size={18} /> ส่งข้อมูล แล้วแจ้งแอดมินทาง LINE</>}
            </span>
          </button>
          <p className="text-center text-xs text-text-muted">ส่งรูป/เอกสารเข้าระบบร้านก่อน แล้วกดเปิดแชท LINE พร้อมเลขอ้างอิงในขั้นถัดไป</p>
        </>
      )}
    </form>
  );
}

/**
 * กำแพงสมาชิกของฟอร์มบริการ — พากลับมาหน้าเดิม (รวม ?s=) หลังล็อกอิน/เติมข้อมูล
 * login = ยังไม่เป็นสมาชิก · complete = เป็นสมาชิกแล้วแต่ชื่อ/เบอร์/ที่อยู่ยังไม่ครบ
 */
function MemberGate({ kind }: { kind: "login" | "complete" }) {
  const router = useRouter();
  const back = () => encodeURIComponent(window.location.pathname + window.location.search);
  const go = () => router.push(kind === "login" ? `/login?redirect=${back()}` : `/profile?complete=1&redirect=${back()}`);
  return (
    <div className="card-dd text-center">
      {kind === "login" ? <LogIn size={30} className="mx-auto text-yellow-hover" /> : <ShieldCheck size={30} className="mx-auto text-yellow-hover" />}
      <p className="mt-3 text-lg font-bold text-text-heading">
        {kind === "login" ? "สมัครสมาชิกฟรี เพื่อส่งคำขอ" : "กรอกข้อมูลสมาชิกให้ครบก่อนส่งคำขอ"}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">
        {kind === "login"
          ? "บริการทั้งหมดสำหรับสมาชิก — สมัครไม่ถึง 1 นาที แล้วกลับมาทำรายการต่อที่หน้านี้ได้ทันที"
          : "ชื่อ เบอร์โทร และที่อยู่ ใช้ติดต่อกลับและเติมให้อัตโนมัติในฟอร์ม — บันทึกแล้วกลับมาที่หน้านี้ทันที"}
      </p>
      <button type="button" onClick={go} className="btn-primary mx-auto mt-4 w-full sm:w-auto sm:px-10">
        {kind === "login" ? <><LogIn size={18} /> สมัครสมาชิก / เข้าสู่ระบบ</> : <><ShieldCheck size={18} /> กรอกข้อมูลให้ครบ</>}
      </button>
    </div>
  );
}

/** ☐ ขายเครื่อง ☐ ผ่อนเครื่อง ☐ ผ่อนบอลลูน — checkbox จริง (a11y) */
export function ServicePicker({ value, onChange }: { value: ServiceCode[]; onChange: (v: ServiceCode[]) => void }) {
  return (
    <div>
      <p className="-mt-2 mb-3 text-sm text-text-muted">เลือกได้มากกว่า 1 บริการ — ระบบจะแสดงช่องข้อมูลที่ต้องกรอกตามบริการที่เลือก</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {SERVICE_ORDER.map((code) => {
          const m = SERVICES[code];
          const checked = value.includes(code);
          return (
            <label key={code} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-yellow ${
              checked ? "border-yellow bg-yellow/10 ring-1 ring-yellow" : "border-border-default hover:border-yellow hover:bg-bg-tinted"}`}>
              <input type="checkbox" checked={checked} onChange={() => onChange(toggleService(value, code))} className="sr-only" />
              <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 ${checked ? "border-yellow-hover bg-yellow-hover text-on-yellow" : "border-border-default"}`}>
                {checked && <Check size={13} strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-text-heading">{m.label}</span>
                <span className="block text-xs text-text-muted">{m.desc}</span>
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-text-muted">* ขายเครื่อง กับ ผ่อนบอลลูน เลือกได้อย่างใดอย่างหนึ่ง (เป็นเครื่องเดียวกัน)</p>
    </div>
  );
}

/** ชื่อ / เบอร์ / ที่อยู่ (auto-fill) — ใช้ร่วมทุกบริการ */
function ContactFields({ form, setForm, geo, geoFromProfile }: {
  form: TradeInForm; setForm: Dispatch<SetStateAction<TradeInForm>>; geo: ThaiGeo | null; geoFromProfile: boolean;
}) {
  const set = (patch: Partial<TradeInForm>) => setForm((f) => ({ ...f, ...patch }));
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="ชื่อ-นามสกุล *">
          <input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} autoComplete="name" className="input-dd" placeholder="ชื่อ นามสกุล" />
        </Field>
        <Field label="เบอร์โทร *">
          <input value={form.tel} onChange={(e) => set({ tel: e.target.value })} type="tel" inputMode="tel" autoComplete="tel" className="input-dd" placeholder="08x-xxx-xxxx" />
        </Field>
      </div>
      <Field label="ที่อยู่ (ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์) *">
        <ThaiAddressAutocomplete value={geo} onChange={(g) => set(g ?? { subdistrict: "", district: "", province: "", zipcode: "" })} />
        <p className="mt-1.5 text-xs text-text-muted">
          {geoFromProfile
            ? <>เติมจากโปรไฟล์ของคุณ — กด &quot;แก้ไข&quot; เพื่อเปลี่ยนเฉพาะคำขอนี้ หรือแก้ถาวรที่ <Link href="/profile" className="font-semibold text-yellow-text hover:underline">หน้าโปรไฟล์</Link></>
            : "พิมพ์รหัสไปรษณีย์หรือชื่อตำบล แล้วเลือกจากรายการ — ระบบเติมที่เหลือให้"}
        </p>
      </Field>
    </>
  );
}
