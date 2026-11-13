"use client";
/* eslint-disable @next/next/no-img-element -- รูปที่อัปขึ้นหน้า Landing (backend) */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, ExternalLink, Eye, Film, Loader2, PenLine, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError, getApiStatus } from "@/lib/errorMessage";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { formatDuration } from "@/lib/videoCompress";
import { hasUnsavedWork, setUnsaved } from "@/lib/unsavedGuard";
import {
  SLUG_RE, hasOffer, isoToLocalInput, localInputToIso, publicPath, withDefaults,
  type AdminCampaign, type CampaignButton, type CampaignContent, type CampaignMedia, type ImageItem, type ServiceCard, type ServiceIcon, type TextItem,
} from "@/lib/campaign";
import CampaignLanding from "./CampaignLanding";
import { copyLink } from "./CampaignPagesAdmin";
import { Field, IconBtn, ImageUploadButton, LinkEditor, ListEditor, MediaSlot, SectionCard } from "./editorFields";

interface Draft { slug: string; title: string; description: string | null; published: boolean; content: CampaignContent }

const ICONS: { value: ServiceIcon; label: string }[] = [
  { value: "INSTALLMENT", label: "บัตร/ผ่อน" }, { value: "PHONE", label: "มือถือ" }, { value: "TAG", label: "ป้ายราคา" },
  { value: "SELL", label: "ธนบัตร" }, { value: "TRADE_IN", label: "ลูกศรแลก" }, { value: "CHAT", label: "แชท" },
  { value: "STORE", label: "หน้าร้าน" }, { value: "SHIELD", label: "โล่/ประกัน" },
];
const STYLES = [
  { value: "LINE", label: "เขียว LINE" }, { value: "PRIMARY", label: "เหลือง DD" },
  { value: "DARK", label: "ขาว/ดำ" }, { value: "OUTLINE", label: "ขอบ (รอง)" },
] as const;

const EMPTY_HERO = { eyebrow: null, headline: null, highlight: null, subheadline: null, mediaId: null, mediaLabel: null };
const EMPTY_REVIEWS = { title: null, subtitle: null, items: [], initialCount: 6, showStoreReviews: true };
const EMPTY_GALLERY = { title: null, items: [] };
const EMPTY_SERVICES = { title: null, items: [] };
const leaveDialog = () => confirmDialog({ title: "ออกโดยไม่บันทึก?", message: "สิ่งที่แก้ไว้ยังไม่ได้บันทึกจะหาย", confirmText: "ออกเลย", danger: true });

/** เทียบว่าแก้แล้วหรือยัง — ช่องที่พิมพ์แล้วลบจนว่าง ("") = ไม่ได้แก้ (server เก็บเป็น null) */
const snapshot = (d: Draft) => JSON.stringify(d, (_k, v) => (v === "" ? null : v));

const toDraft = (p: AdminCampaign): Draft => ({
  slug: p.slug, title: p.title, description: p.description, published: p.published, content: withDefaults(p.content),
});

/** แก้หน้า Landing: ฟอร์มทีละ section (ซ้าย) + ตัวอย่างหน้ามือถือสด (ขวา) · บันทึกทั้งหน้าในครั้งเดียว */
export default function CampaignEditor({ id, onClose }: { id: number; onClose: () => void }) {
  const [page, setPage] = useState<AdminCampaign | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [media, setMedia] = useState<CampaignMedia[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  // onClose จากหน้ารายการเป็น arrow ใหม่ทุก render — ถ้าใส่ใน deps ของ load, หน้าแม่ re-render (เช่น เปิดเมนูบนมือถือ)
  // = โหลดหน้าใหม่ทับ draft ที่แก้อยู่เงียบ ๆ → เก็บใน ref แล้วโหลดตาม id เท่านั้น
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const leaving = useRef(false);   // ยืนยันออกแล้ว → ไม่ต้องให้ beforeunload ถามซ้ำ
  // รหัสประจำการ์ดบริการ (ไม่ผูกตำแหน่ง) — อัปรูปการ์ดเสร็จทีหลัง ต้องลงการ์ดเดิมแม้ระหว่างนั้นจะเรียง/ลบการ์ด
  const cardKeys = useRef(new WeakMap<ServiceCard, number>());
  const nextCardKey = useRef(1);

  const load = useCallback(() => {
    api.get<AdminCampaign>(`/admin/campaign-pages/${id}`)
      .then((r) => { setPage(r.data); setDraft(toDraft(r.data)); setMedia(r.data.media); })
      .catch((e) => { toast.error(getApiError(e, "โหลดหน้าไม่สำเร็จ")); onCloseRef.current(); });
  }, [id]);
  useEffect(load, [load]);

  const dirty = useMemo(() => !!page && !!draft && snapshot(toDraft(page)) !== snapshot(draft), [page, draft]);

  // ปิดแท็บ/รีเฟรช/ออกนอกเว็บ ทั้งที่ยังไม่บันทึกหรือกำลังอัปไฟล์ → เบราว์เซอร์ถามก่อน
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (!leaving.current && hasUnsavedWork()) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // ลิงก์ในเว็บ (โลโก้/กลับหน้าเว็บ) เปลี่ยนหน้าแบบ client-side — beforeunload ไม่ทำงาน → ดักคลิกแล้วถามก่อน
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.closest("[data-campaign-preview]") || !hasUnsavedWork()) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      e.preventDefault();
      e.stopPropagation();
      leaveDialog().then((ok) => { if (ok) { leaving.current = true; window.location.href = url.href; } });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // สลับเมนูหลังบ้านทั้งที่ยังไม่บันทึก → ถามก่อน (เมนูอ่านผ่าน lib/unsavedGuard)
  useEffect(() => {
    setUnsaved(dirty, leaveDialog);
    return () => setUnsaved(false);
  }, [dirty]);

  if (!page || !draft) {
    return <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-10 text-sm text-text-muted"><Loader2 size={16} className="animate-spin" /> กำลังโหลดหน้า</div>;
  }

  const c = draft.content;
  const setContent = (patch: Partial<CampaignContent>) => setDraft((d) => (d ? { ...d, content: { ...d.content, ...patch } } : d));
  /**
   * แก้จากเนื้อหา "ล่าสุด" — ใช้กับงานที่จบทีหลัง (อัปรูป/คลิปหลายวินาที) ไม่ให้ทับสิ่งที่พิมพ์ระหว่างรออัป
   * (setContent ปกติสร้าง patch จาก section ของรอบ render ที่กด ซึ่งพอสำหรับการพิมพ์ที่จบในจังหวะเดียว)
   */
  const update = (fn: (cur: CampaignContent) => Partial<CampaignContent>) =>
    setDraft((d) => (d ? { ...d, content: { ...d.content, ...fn(d.content) } } : d));
  const appendImages = (key: "reviews" | "gallery", max: number) => (ids: number[]) => update((cur) => {
    const sec = cur[key] ?? (key === "reviews" ? EMPTY_REVIEWS : EMPTY_GALLERY);
    return { [key]: { ...sec, items: [...sec.items, ...ids.map((mediaId) => ({ mediaId, quote: null, caption: null }))].slice(0, max) } };
  });
  const cardKey = (card: ServiceCard) => {
    let k = cardKeys.current.get(card);
    if (k == null) { k = nextCardKey.current++; cardKeys.current.set(card, k); }
    return k;
  };
  /** การ์ดถูกแทนด้วย object ใหม่ (แก้ข้อความ/ใส่รูป) → ส่งรหัสต่อให้ตัวใหม่ */
  const keepKey = (from: ServiceCard, to: ServiceCard) => { cardKeys.current.set(to, cardKey(from)); return to; };
  const addMedia = (m: CampaignMedia) => setMedia((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]));
  const slugOk = SLUG_RE.test(draft.slug) && draft.slug.length >= 2;

  const save = async (publish?: boolean) => {
    if (!slugOk) { toast.error("ลิงก์ใช้ตัวอังกฤษพิมพ์เล็ก ตัวเลข และขีด (-) เท่านั้น"); return; }
    if (publish === false && !(await confirmDialog({
      title: "ปิดหน้านี้ (กลับเป็นร่าง)?",
      message: `ลิงก์ ${publicPath(page.slug)} จะเปิดไม่เจอทันที — แอดที่ยังวิ่งอยู่จะพาลูกค้าไปหน้า "ไม่พบหน้า"`,
      confirmText: "ปิดหน้า", danger: true,
    }))) return;
    const sent = draft;
    const body = { ...sent, published: publish ?? sent.published, version: page.version };
    setSaving(true);
    try {
      const res = await api.put<AdminCampaign>(`/admin/campaign-pages/${page.id}`, body);
      setPage(res.data);
      // แก้/อัปไฟล์เพิ่มระหว่างรอบันทึก → เก็บของใหม่ไว้ (ยังไม่บันทึก) ไม่ทับด้วยฉบับที่ส่งไป
      setDraft((cur) => (!cur || cur === sent ? toDraft(res.data) : { ...cur, published: res.data.published }));
      setMedia((cur) => [...res.data.media, ...cur.filter((m) => !res.data.media.some((x) => x.id === m.id))]);
      toast.success(res.data.published ? (publish ? "เผยแพร่แล้ว — คัดลอกลิงก์ไปแปะในแอดได้เลย" : "บันทึกแล้ว — หน้าเว็บอัปเดตภายในไม่เกิน 30 วินาที") : "บันทึกร่างแล้ว");
    } catch (e) {
      const conflict = getApiStatus(e) === 409 && /ถูกแก้โดย/.test(getApiError(e, ""));
      toast.error(getApiError(e, "บันทึกไม่สำเร็จ"), { duration: conflict ? 8000 : 4000 });
      if (conflict && await confirmDialog({
        title: "โหลดฉบับล่าสุด?", message: "มีคนบันทึกหน้านี้ไปก่อน — โหลดใหม่แล้วสิ่งที่แก้ไว้ในหน้านี้จะหาย (คัดลอกข้อความที่ต้องการเก็บก่อน)",
        confirmText: "โหลดฉบับล่าสุด", danger: true,
      })) load();
    } finally {
      setSaving(false);
    }
  };

  const back = async () => {
    if (hasUnsavedWork() && !(await leaveDialog())) return;
    onClose();
  };

  const used = new Set<number>([
    ...(c.hero?.mediaId != null ? [c.hero.mediaId] : []),
    ...(c.reviews?.items ?? []).map((i) => i.mediaId),
    ...(c.gallery?.items ?? []).map((i) => i.mediaId),
    ...(c.services?.items ?? []).map((s) => s.mediaId),
  ].filter((x): x is number => x != null));

  const deleteMedia = async (m: CampaignMedia) => {
    if (!(await confirmDialog({ title: `ลบ${m.kind === "VIDEO" ? "คลิป" : "รูป"} #${m.id}?`, message: "ไฟล์ถูกลบจากเซิร์ฟเวอร์ (ย้อนกลับไม่ได้)", confirmText: "ลบไฟล์", danger: true }))) return;
    try {
      await api.delete(`/admin/campaign-pages/${page.id}/media/${m.id}`);
      setMedia((l) => l.filter((x) => x.id !== m.id));
      toast.success("ลบไฟล์แล้ว");
    } catch (e) {
      toast.error(getApiError(e, "ลบไฟล์ไม่สำเร็จ"));
    }
  };

  const hero = c.hero ?? EMPTY_HERO;
  const offer = c.offer ?? { label: null, priceBefore: null, price: null, priceSuffix: null, note: null, countdownEnd: null, countdownLabel: null };
  const services = c.services ?? EMPTY_SERVICES;
  const reviews = c.reviews ?? EMPTY_REVIEWS;
  const benefits = c.benefits ?? { title: null, items: [] };
  const gallery = c.gallery ?? EMPTY_GALLERY;
  const faq = c.faq ?? { title: null, items: [] };
  const closing = c.closing ?? { headline: null, text: null };

  const form = (
    <div className="space-y-3">
      <SectionCard title="ข้อมูลหน้า & ลิงก์" defaultOpen>
        <Field label="ชื่อหน้า" hint="แท็บเบราว์เซอร์ + การ์ดตอนแชร์ลิงก์" value={draft.title} max={100} onChange={(v) => setDraft({ ...draft, title: v })} />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-text-heading">ลิงก์หน้า</span>
          <span className="flex items-center rounded-[var(--radius-md)] border border-border-default bg-white focus-within:border-yellow">
            <span className="pl-3 text-sm text-text-muted">/p/</span>
            <input value={draft.slug} maxLength={60} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                   className="min-h-[44px] w-full bg-transparent px-1 text-sm outline-none" />
          </span>
          {page.published && draft.slug !== page.slug && <span className="mt-1 block text-xs text-warning-text">เปลี่ยนลิงก์แล้ว แอดที่แปะลิงก์เดิมจะเปิดไม่เจอ — ต้องแก้ลิงก์ในแอดด้วย</span>}
          {!slugOk && <span className="mt-1 block text-xs text-error-text">ใช้ a-z 0-9 และขีด (-) คั่นเท่านั้น</span>}
        </label>
        <Field label="คำอธิบายในการ์ดลิงก์" hint="ตอนแชร์ใน LINE/Facebook (เว้นว่าง = ใช้คำโปรยใต้หัวข้อ)" value={draft.description} max={200} multiline onChange={(v) => setDraft({ ...draft, description: v })} />
      </SectionCard>

      <SectionCard title="แถบประกาศบนสุด" empty={!c.announcement} hint="แถบเหลืองบนสุด เช่น โปรถึงสิ้นเดือนนี้เท่านั้น">
        <Field label="ข้อความ" value={c.announcement} max={120} onChange={(v) => setContent({ announcement: v })} />
      </SectionCard>

      <SectionCard title="ส่วนบนสุด: หัวข้อ + คลิป" defaultOpen empty={!hero.headline && hero.mediaId == null}>
        <Field label="บรรทัดนำ" hint="ทักกลุ่มลูกค้า" value={hero.eyebrow} max={120} onChange={(v) => setContent({ hero: { ...hero, eyebrow: v } })} />
        <Field label="หัวข้อหลัก" hint="ตัวใหญ่สีขาว (ต้องมีก่อนเผยแพร่)" value={hero.headline} max={160} onChange={(v) => setContent({ hero: { ...hero, headline: v } })} />
        <Field label="หัวข้อสีเหลือง" hint="บรรทัดต่อจากหัวข้อ เน้นจุดขาย" value={hero.highlight} max={160} onChange={(v) => setContent({ hero: { ...hero, highlight: v } })} />
        <Field label="คำโปรย" value={hero.subheadline} max={400} multiline onChange={(v) => setContent({ hero: { ...hero, subheadline: v } })} />
        <div>
          <p className="mb-1 text-sm font-semibold text-text-heading">คลิปหรือรูปส่วนบน <span className="font-normal text-text-muted">(คลิปยิงแอด ≤ 2 นาที · iPhone .MOV ได้)</span></p>
          <MediaSlot pageId={page.id} media={media} value={hero.mediaId} allowVideo onUploaded={addMedia}
                     onChange={(id) => update((cur) => ({ hero: { ...(cur.hero ?? EMPTY_HERO), mediaId: id } }))} />
        </div>
        <Field label="แถบเหนือคลิป" hint="ว่างได้" value={hero.mediaLabel} max={80} placeholder="▶ ดูคลิปนี้ก่อน" onChange={(v) => setContent({ hero: { ...hero, mediaLabel: v } })} />
      </SectionCard>

      <SectionCard title="ปุ่มหลัก (ใต้คลิป + ท้ายหน้า + แถบล่างมือถือ)" defaultOpen empty={c.ctas.length === 0}
                   hint="ปุ่มแรก = ปุ่มที่ติดล่างจอมือถือตลอด · แนะนำปุ่มแรกเป็น ทักไลน์">
        <ListEditor<CampaignButton> items={c.ctas} max={3} addLabel="เพิ่มปุ่ม" onChange={(ctas) => setContent({ ctas })}
          make={() => ({ label: "", sublabel: null, link: { type: "LINE", value: null }, style: "LINE" })}
          render={(b, set) => (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_150px]">
                <Field label="ข้อความปุ่ม" value={b.label} max={40} onChange={(v) => set({ ...b, label: v })} />
                <Field label="บรรทัดเล็กใต้ปุ่ม" value={b.sublabel} max={60} onChange={(v) => set({ ...b, sublabel: v })} />
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-text-heading">สี</span>
                  <select value={b.style ?? "PRIMARY"} onChange={(e) => set({ ...b, style: e.target.value as CampaignButton["style"] })} className="input-dd">
                    {STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
              </div>
              <LinkEditor value={b.link} onChange={(link) => set({ ...b, link })} />
            </div>
          )} />
      </SectionCard>

      <SectionCard title="ราคา / โปร + นับถอยหลัง" empty={!hasOffer(offer)} hint="ไม่ใส่ราคาและหมายเหตุ = ไม่แสดงกล่องนี้ · นับถอยหลังหายเองเมื่อหมดเวลา (ไม่โชว์ 00:00)">
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="หัวกล่อง" value={offer.label} max={60} placeholder="ผ่อนเริ่มต้น" onChange={(v) => setContent({ offer: { ...offer, label: v } })} />
          <Field label="ราคาเดิม (ขีดฆ่า)" value={offer.priceBefore} max={30} placeholder="1,590.-" onChange={(v) => setContent({ offer: { ...offer, priceBefore: v } })} />
          <Field label="ราคา (ตัวใหญ่สีแดง)" value={offer.price} max={30} placeholder="990.-" onChange={(v) => setContent({ offer: { ...offer, price: v } })} />
          <Field label="ต่อท้ายราคา" value={offer.priceSuffix} max={30} placeholder="/เดือน" onChange={(v) => setContent({ offer: { ...offer, priceSuffix: v } })} />
        </div>
        <Field label="หมายเหตุ / เงื่อนไข" value={offer.note} max={200} multiline onChange={(v) => setContent({ offer: { ...offer, note: v } })} />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-text-heading">โปรหมดเขต <span className="font-normal text-text-muted">(เวลาไทย · ว่าง = ไม่นับ)</span></span>
            <input type="datetime-local" value={isoToLocalInput(offer.countdownEnd)} className="input-dd"
                   onChange={(e) => setContent({ offer: { ...offer, countdownEnd: localInputToIso(e.target.value) } })} />
          </label>
          <Field label="ข้อความเหนือตัวนับ" value={offer.countdownLabel} max={60} onChange={(v) => setContent({ offer: { ...offer, countdownLabel: v } })} />
        </div>
      </SectionCard>

      <SectionCard title="บริการที่ลูกค้ากดใช้เองได้" defaultOpen empty={services.items.length === 0} hint="การ์ดลิงก์ไปหน้าบริการในเว็บ / ทักไลน์ / โทร — แนะนำ 4–6 การ์ด">
        <Field label="หัวข้อ section" value={services.title} max={80} onChange={(v) => setContent({ services: { ...services, title: v } })} />
        <ListEditor<ServiceCard> items={services.items} max={8} addLabel="เพิ่มบริการ" onChange={(items) => setContent({ services: { ...services, items } })}
          make={() => ({ title: "", description: null, icon: "CHAT", mediaId: null, link: { type: "LINE", value: null } })}
          render={(card, setCard) => {
            const set = (v: ServiceCard) => setCard(keepKey(card, v));
            const s = card;
            const myKey = cardKey(card);
            return (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
                <Field label="ชื่อบริการ" value={s.title} max={60} onChange={(v) => set({ ...s, title: v })} />
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-text-heading">ไอคอน</span>
                  <select value={s.icon ?? "PHONE"} onChange={(e) => set({ ...s, icon: e.target.value as ServiceIcon })} className="input-dd">
                    {ICONS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </label>
              </div>
              <Field label="คำอธิบายสั้น" value={s.description} max={200} onChange={(v) => set({ ...s, description: v })} />
              <LinkEditor value={s.link} onChange={(link) => set({ ...s, link })} />
              <details className="text-xs">
                <summary className="cursor-pointer font-semibold text-text-body">ใช้รูปแทนไอคอน (ไม่บังคับ)</summary>
                <div className="mt-2"><MediaSlot pageId={page.id} media={media} value={s.mediaId} onUploaded={addMedia}
                  onChange={(mediaId) => update((cur) => {
                    // หาการ์ดจากรหัส (ไม่ใช่ลำดับ) · การ์ดถูกลบไปแล้ว = ไม่ใส่ (ไฟล์อยู่ใน "ไฟล์ทั้งหมด" สถานะไม่ได้ใช้)
                    const sec = cur.services ?? EMPTY_SERVICES;
                    return { services: { ...sec, items: sec.items.map((x) => (cardKey(x) === myKey ? keepKey(x, { ...x, mediaId }) : x)) } };
                  })} /></div>
              </details>
            </div>
            );
          }} />
      </SectionCard>

      <SectionCard title="รีวิว (รูปแชท / รูปลูกค้า)" defaultOpen empty={reviews.items.length === 0 && !reviews.showStoreReviews}
                   hint="อัปได้ทีละหลายรูป · ใส่หัวข้อสั้นสีเหลืองเหนือรูป เช่น “ได้เครื่องไวมาก” — คนอ่านหัวข้อก่อนรูป · ใช้รูปที่ลูกค้ายินยอมและปิดชื่อ/เบอร์ก่อนอัป">
        <Field label="หัวข้อ section" value={reviews.title} max={80} onChange={(v) => setContent({ reviews: { ...reviews, title: v } })} />
        <Field label="คำอธิบายใต้หัวข้อ" value={reviews.subtitle} max={200} onChange={(v) => setContent({ reviews: { ...reviews, subtitle: v } })} />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-text-heading">โชว์ก่อนกด &quot;ดูเพิ่ม&quot;</span>
            <CountInput value={reviews.initialCount ?? 6} min={1} max={40}
                        onCommit={(n) => setContent({ reviews: { ...reviews, initialCount: n } })} />
          </label>
          <label className="flex items-center gap-2 self-end rounded-xl bg-bg-subtle p-3 text-sm">
            <input type="checkbox" checked={reviews.showStoreReviews} onChange={(e) => setContent({ reviews: { ...reviews, showStoreReviews: e.target.checked } })} className="h-4 w-4 accent-[#ffd400]" />
            ต่อด้วยรีวิวจริงในระบบร้าน (ดาว + ความเห็น)
          </label>
        </div>
        <ImageGrid pageId={page.id} items={reviews.items} max={40} media={media} onUploaded={addMedia} onAppend={appendImages("reviews", 40)}
                   onChange={(items) => setContent({ reviews: { ...reviews, items } })} quoteLabel="หัวข้อสีเหลือง" captionLabel="ชื่อ/รุ่นที่ซื้อ (ไม่บังคับ)" />
      </SectionCard>

      <SectionCard title="ทำไมต้อง DD Mobile" empty={benefits.items.length === 0}>
        <Field label="หัวข้อ section" value={benefits.title} max={80} onChange={(v) => setContent({ benefits: { ...benefits, title: v } })} />
        <TextItems items={benefits.items} max={15} titleLabel="จุดเด่น" textLabel="รายละเอียด" onChange={(items) => setContent({ benefits: { ...benefits, items } })} />
      </SectionCard>

      <SectionCard title="แกลเลอรีรูป" empty={gallery.items.length === 0} hint="เช่น หน้าร้าน ส่งมอบเครื่อง ลูกค้ารับเครื่อง">
        <Field label="หัวข้อ section" value={gallery.title} max={80} onChange={(v) => setContent({ gallery: { ...gallery, title: v } })} />
        <ImageGrid pageId={page.id} items={gallery.items} max={24} media={media} onUploaded={addMedia} onAppend={appendImages("gallery", 24)}
                   onChange={(items) => setContent({ gallery: { ...gallery, items } })} quoteLabel="หัวข้อ" captionLabel="คำบรรยาย" />
      </SectionCard>

      <SectionCard title="คำถามที่พบบ่อย (FAQ)" empty={faq.items.length === 0}>
        <Field label="หัวข้อ section" value={faq.title} max={80} onChange={(v) => setContent({ faq: { ...faq, title: v } })} />
        <TextItems items={faq.items} max={15} titleLabel="คำถาม" textLabel="คำตอบ" onChange={(items) => setContent({ faq: { ...faq, items } })} />
      </SectionCard>

      <SectionCard title="ปิดท้าย (ปุ่มหลักซ้ำอีกครั้ง)" empty={!closing.headline}>
        <Field label="หัวข้อ" value={closing.headline} max={160} onChange={(v) => setContent({ closing: { ...closing, headline: v } })} />
        <Field label="ข้อความ" value={closing.text} max={400} multiline onChange={(v) => setContent({ closing: { ...closing, text: v } })} />
      </SectionCard>

      <SectionCard title={`ไฟล์ทั้งหมดในหน้านี้ (${media.length}/80)`} hint="ลบได้เฉพาะไฟล์ที่ไม่ได้ใช้ในหน้าที่บันทึกไว้ — เอาออกจาก section แล้วกดบันทึกก่อน">
        {media.length === 0 ? <p className="text-xs text-text-muted">ยังไม่มีไฟล์</p> : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {media.map((m) => (
              <div key={m.id} className="overflow-hidden rounded-xl border border-border-default">
                <div className="relative aspect-[3/4] bg-text-heading">
                  <img src={m.kind === "VIDEO" ? m.posterUrl ?? "" : m.url} alt={`ไฟล์ #${m.id}`} loading="lazy" className="h-full w-full object-cover" />
                  {m.kind === "VIDEO" && <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white"><Film size={10} />{formatDuration(m.durationMs ?? 0)}</span>}
                </div>
                <div className="flex items-center gap-1 p-1.5 text-[11px]">
                  <span className={used.has(m.id) ? "font-semibold text-success-text" : "text-text-muted"}>{used.has(m.id) ? "ใช้อยู่" : "ไม่ได้ใช้"}</span>
                  <span className="flex-1" />
                  {!used.has(m.id) && <IconBtn label="ลบไฟล์" danger onClick={() => deleteMedia(m)}><Trash2 size={12} /></IconBtn>}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* แถบบน: ย้อนกลับ · สถานะ · บันทึก */}
      <div className="z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-border-default bg-white/95 p-3 backdrop-blur lg:sticky lg:top-0">
        <button type="button" onClick={back} className="btn-ghost text-sm"><ArrowLeft size={15} /> ทุกหน้า</button>
        <div className="order-first w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
          <p className="line-clamp-1 font-semibold text-text-heading">{draft.title || "ไม่มีชื่อ"}</p>
          <p className="font-mono text-[11px] text-text-muted">{publicPath(page.slug)} · <span className={page.published ? "text-success-text" : "text-warning-text"}>{page.published ? "เผยแพร่อยู่" : "ร่าง (ลูกค้ายังเปิดไม่ได้)"}</span>
            {dirty && <span className="ml-1 font-sans font-semibold text-warning-text">· ยังไม่บันทึก</span>}</p>
        </div>
        {page.published && (
          <>
            <button type="button" onClick={() => copyLink(page.slug)} className="btn-secondary text-sm"><Copy size={14} /> คัดลอกลิงก์</button>
            <a href={publicPath(page.slug)} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm"><ExternalLink size={14} /> เปิดหน้าจริง</a>
          </>
        )}
        <button type="button" onClick={() => save()} disabled={saving || !dirty} className="btn-secondary text-sm">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} บันทึก
        </button>
        {page.published
          ? <button type="button" onClick={() => save(false)} disabled={saving} className="btn-ghost text-sm">ปิดหน้า (กลับเป็นร่าง)</button>
          : <button type="button" onClick={() => save(true)} disabled={saving} className="btn-primary text-sm"><Check size={15} /> บันทึก + เผยแพร่</button>}
      </div>

      {/* มือถือ: สลับแก้/ดูตัวอย่าง */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-bg-subtle p-1 lg:hidden">
        <button type="button" onClick={() => setTab("edit")} className={`rounded-lg py-2 text-sm font-semibold ${tab === "edit" ? "bg-white shadow-card" : "text-text-muted"}`}><PenLine size={14} className="mr-1 inline" />แก้ไข</button>
        <button type="button" onClick={() => setTab("preview")} className={`rounded-lg py-2 text-sm font-semibold ${tab === "preview" ? "bg-white shadow-card" : "text-text-muted"}`}><Eye size={14} className="mr-1 inline" />ตัวอย่าง</button>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-border-default bg-white/95 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(17,24,39,0.10)] backdrop-blur lg:hidden">
          <span className="flex-1 text-xs font-semibold text-warning-text">ยังไม่บันทึก</span>
          <button type="button" onClick={() => save()} disabled={saving} className="btn-primary text-sm">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} บันทึก
          </button>
        </div>
      )}

      <div className={`grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] ${dirty ? "pb-20 lg:pb-0" : ""}`}>
        <div className={tab === "edit" ? "" : "hidden lg:block"}>{form}</div>
        <div className={tab === "preview" ? "" : "hidden lg:block"}>
          <div className="lg:sticky lg:top-24">
            <p className="mb-2 text-center text-xs text-text-muted">ตัวอย่างบนมือถือ — เปลี่ยนตามที่พิมพ์ทันที (ลูกค้าเห็นหลังกดบันทึก)</p>
            <div className="mx-auto h-[78vh] w-full max-w-[400px] overflow-y-auto overflow-x-hidden rounded-[28px] border-[6px] border-text-heading bg-white shadow-xl">
              <div data-campaign-preview><CampaignLanding title={draft.title} content={c} media={media} preview /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ รูปหลายใบ (รีวิว/แกลเลอรี) ============================ */

function ImageGrid({ pageId, items, max, media, onChange, onUploaded, onAppend, quoteLabel, captionLabel }: {
  pageId: number; items: ImageItem[]; max: number; media: CampaignMedia[]; onChange: (v: ImageItem[]) => void;
  onUploaded: (m: CampaignMedia) => void; onAppend: (mediaIds: number[]) => void; quoteLabel: string; captionLabel: string;
}) {
  const byId = new Map(media.map((m) => [m.id, m]));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const m = it.mediaId != null ? byId.get(it.mediaId) : undefined;
        return (
          <div key={`${it.mediaId}-${i}`} className="flex gap-3 rounded-xl border border-border-default p-2">
            {m ? <img src={m.url} alt="" className="h-24 w-16 shrink-0 rounded-lg bg-bg-subtle object-cover" />
               : <span className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-error-bg text-[10px] text-error-text">รูปหาย</span>}
            <div className="min-w-0 flex-1 space-y-1.5">
              <input value={it.quote ?? ""} maxLength={80} onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, quote: e.target.value } : x)))}
                     className="input-dd !min-h-9 !py-1.5" placeholder={quoteLabel} aria-label={quoteLabel} />
              <input value={it.caption ?? ""} maxLength={120} onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)))}
                     className="input-dd !min-h-9 !py-1.5" placeholder={captionLabel} aria-label={captionLabel} />
            </div>
            <div className="flex flex-col gap-1">
              <IconBtn label="เลื่อนขึ้น" disabled={i === 0} onClick={() => move(i, -1)}><span className="block h-3.5 w-3.5 text-[11px] leading-none">↑</span></IconBtn>
              <IconBtn label="เลื่อนลง" disabled={i === items.length - 1} onClick={() => move(i, 1)}><span className="block h-3.5 w-3.5 text-[11px] leading-none">↓</span></IconBtn>
              <IconBtn label="เอาออกจาก section" danger onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash2 size={13} /></IconBtn>
            </div>
          </div>
        );
      })}
      {items.length < max
        ? <ImageUploadButton pageId={pageId} multiple maxFiles={max - items.length} label={`อัปรูป (เลือกได้หลายรูป · เหลือ ${max - items.length} ช่อง)`}
                             onUploaded={(list) => {
                               list.forEach(onUploaded);
                               onAppend(list.map((m) => m.id));   // ต่อท้ายจากเนื้อหาล่าสุด (ไม่ทับที่แก้ระหว่างอัป)
                             }} />
        : <p className="text-center text-xs text-text-muted">ครบ {max} รูปแล้ว</p>}
    </div>
  );
}

function TextItems({ items, max, titleLabel, textLabel, onChange }: {
  items: TextItem[]; max: number; titleLabel: string; textLabel: string; onChange: (v: TextItem[]) => void;
}) {
  return (
    <ListEditor<TextItem> items={items} max={max} addLabel={`เพิ่ม${titleLabel}`} onChange={onChange}
      make={() => ({ title: "", text: "" })}
      render={(t, set) => (
        <div className="space-y-2">
          <Field label={titleLabel} value={t.title} max={100} onChange={(v) => set({ ...t, title: v })} />
          <Field label={textLabel} value={t.text} max={600} multiline onChange={(v) => set({ ...t, text: v })} />
        </div>
      )} />
  );
}

/** ช่องตัวเลข: พิมพ์อิสระ (ลบจนว่างได้) แล้วค่อยตัดให้อยู่ในช่วงตอนออกจากช่อง */
function CountInput({ value, min, max, onCommit }: { value: number; min: number; max: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  const [synced, setSynced] = useState(value);
  if (synced !== value) { setSynced(value); setText(String(value)); }   // ค่าเปลี่ยนจากข้างนอก (โหลด/บันทึก)
  const commit = () => {
    const n = Math.max(min, Math.min(max, Math.round(Number(text)) || value));
    setText(String(n));
    if (n !== value) onCommit(n);
  };
  return (
    <input type="number" inputMode="numeric" min={min} max={max} value={text} className="input-dd"
           onChange={(e) => {
             setText(e.target.value);
             const n = Number(e.target.value);
             if (Number.isInteger(n) && n >= min && n <= max && n !== value) onCommit(n);   // ค่าถูกแล้วนับเป็นการแก้ทันที (แถบบันทึกโผล่)
           }} onBlur={commit}
           onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
  );
}
