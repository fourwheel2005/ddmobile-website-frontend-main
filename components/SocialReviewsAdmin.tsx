"use client";
/* eslint-disable @next/next/no-img-element -- รูปรีวิวจาก backend (ย่อแล้ว) */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Facebook, ImagePlus, Info, Loader2, Pencil, Plus, ThumbsUp, Trash2, Wand2, X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError, getApiStatus } from "@/lib/errorMessage";
import { compressImage } from "@/lib/imageCompress";
import { setUnsaved, trackUpload } from "@/lib/unsavedGuard";
import { confirmDialog } from "@/components/ui/confirmDialog";
import {
  FACEBOOK_REVIEWS_URL, HOME_REVIEW_COUNT, SOCIAL_SOURCES, SOURCE_LABEL, abbreviateName, formatReviewDate, isSocialLink, todayInBangkok,
  type AdminSocialReview, type AdminSocialReviewList, type SocialReviewImage, type SocialSource,
} from "@/lib/socialReviews";

interface Draft {
  source: SocialSource; name: string; text: string; recommended: boolean;
  reviewedOn: string; sourceUrl: string; visible: boolean;
}

const EMPTY: Draft = {
  source: "FACEBOOK", name: "", text: "", recommended: true, reviewedOn: "", sourceUrl: FACEBOOK_REVIEWS_URL, visible: true,
};

const toDraft = (r: AdminSocialReview): Draft => ({
  source: r.source, name: r.name, text: r.text, recommended: r.recommended,
  reviewedOn: r.reviewedOn ?? "", sourceUrl: r.sourceUrl ?? "", visible: r.visible,
});

const toPayload = (d: Draft) => ({
  source: d.source, name: d.name.trim(), text: d.text.trim(), recommended: d.recommended,
  reviewedOn: d.reviewedOn || null, sourceUrl: d.sourceUrl.trim() || null, visible: d.visible,
});

/**
 * หลังบ้าน → รีวิวจาก Facebook: คัดลอกข้อความรีวิวจากเพจมาลง · ย่อชื่อ · จัดลำดับ (หน้าแรกแสดง 12 อันแรกที่เปิดแสดง)
 * · ซ่อน/แสดง · แนบรูปประกอบ (แคปรีวิว/รูปลูกค้ารับเครื่อง) ได้รีวิวละ 6 รูป
 */
export default function SocialReviewsAdmin() {
  const [list, setList] = useState<AdminSocialReviewList | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<AdminSocialReview | "new" | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<AdminSocialReviewList>("/admin/social-reviews");
      setList(res.data);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reviews = list?.reviews ?? [];
  const max = list?.maxReviews ?? 300;
  const maxImages = list?.maxImagesPerReview ?? 6;
  const visibleIds = reviews.filter((r) => r.visible).map((r) => r.id);
  const onHome = new Set(visibleIds.slice(0, HOME_REVIEW_COUNT));

  const replace = (r: AdminSocialReview) =>
    setList((l) => (l ? { ...l, reviews: l.reviews.map((x) => (x.id === r.id ? r : x)) } : l));

  const patchImages = (id: number, fn: (imgs: SocialReviewImage[]) => SocialReviewImage[]) =>
    setList((l) => (l ? { ...l, reviews: l.reviews.map((x) => (x.id === id ? { ...x, images: fn(x.images) } : x)) } : l));

  const toggleVisible = async (r: AdminSocialReview) => {
    setBusy(r.id);
    try {
      const res = await api.put<AdminSocialReview>(`/admin/social-reviews/${r.id}`, toPayload({ ...toDraft(r), visible: !r.visible }));
      replace(res.data);
      toast.success(res.data.visible ? "แสดงบนเว็บแล้ว" : "ซ่อนจากเว็บแล้ว");
    } catch (e) {
      toast.error(getApiError(e, "บันทึกไม่สำเร็จ"));
      if (getApiStatus(e) === 404) load();
    } finally {
      setBusy(null);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= reviews.length) return;
    const next = [...reviews];
    [next[index], next[to]] = [next[to], next[index]];
    const before = list;
    setList((l) => (l ? { ...l, reviews: next } : l));
    try {
      await api.post("/admin/social-reviews/reorder", { ids: next.map((r) => r.id) });
    } catch (e) {
      setList(before);
      toast.error(getApiError(e, "เรียงลำดับไม่สำเร็จ"));
      if (getApiStatus(e) === 409) load();
    }
  };

  const remove = async (r: AdminSocialReview) => {
    const ok = await confirmDialog({
      title: `ลบรีวิวของ ${r.name}?`,
      message: r.images.length ? `รูปประกอบ ${r.images.length} รูปจะถูกลบด้วย · ลบแล้วกู้คืนไม่ได้ (ถ้าแค่ไม่อยากโชว์ ใช้ "ซ่อน" แทน)` : "ลบแล้วกู้คืนไม่ได้ (ถ้าแค่ไม่อยากโชว์ ใช้ \"ซ่อน\" แทน)",
      confirmText: "ลบรีวิว", danger: true,
    });
    if (!ok) return;
    setBusy(r.id);
    try {
      await api.delete(`/admin/social-reviews/${r.id}`);
      setList((l) => (l ? { ...l, reviews: l.reviews.filter((x) => x.id !== r.id) } : l));
      toast.success("ลบรีวิวแล้ว");
    } catch (e) {
      toast.error(getApiError(e, "ลบไม่สำเร็จ"));
      if (getApiStatus(e) === 404) load();
    } finally {
      setBusy(null);
    }
  };

  const removeImage = async (r: AdminSocialReview, img: SocialReviewImage) => {
    if (!(await confirmDialog({ title: "ลบรูปนี้?", message: "รูปจะหายจากหน้าเว็บทันที", confirmText: "ลบรูป", danger: true }))) return;
    try {
      await api.delete(`/admin/social-reviews/${r.id}/images/${img.id}`);
      patchImages(r.id, (imgs) => imgs.filter((x) => x.id !== img.id));
    } catch (e) {
      toast.error(getApiError(e, "ลบรูปไม่สำเร็จ"));
      if (getApiStatus(e) === 404) load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-default bg-white p-4">
        <Facebook className="text-[#1877F2]" size={20} />
        <h2 className="font-display text-xl">รีวิวจาก Facebook</h2>
        <span className="badge-dd badge-warning tabular-nums">แสดง {visibleIds.length} · ทั้งหมด {reviews.length}/{max}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <a href={FACEBOOK_REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
            รีวิวบนเพจ <ExternalLink size={14} />
          </a>
          <a href="/reviews#facebook" target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
            ดูหน้าเว็บ <ExternalLink size={14} />
          </a>
          <button type="button" onClick={() => setEditing("new")} disabled={reviews.length >= max} className="btn-primary">
            <Plus size={16} /> เพิ่มรีวิว
          </button>
        </div>
      </div>

      <p className="flex items-start gap-1.5 rounded-2xl bg-bg-tinted px-4 py-3 text-xs leading-relaxed text-text-body">
        <Info size={14} className="mt-0.5 shrink-0 text-yellow-text" />
        <span>
          คัดลอกข้อความจากรีวิวบนเพจมาวางตามต้นฉบับ (ห้ามแต่งเติม) · ชื่อให้ย่อนามสกุล เช่น &quot;Paphawee S.&quot; (กดปุ่ม <b>ย่อชื่อ</b> ในฟอร์มได้) ·
          หน้าแรกโชว์ <b>{HOME_REVIEW_COUNT} รีวิวแรก</b> ที่เปิดแสดงตามลำดับนี้ (ป้าย &quot;หน้าแรก&quot;) · หน้า /reviews โชว์ทั้งหมด ·
          รูปประกอบ (แคปรีวิว / รูปลูกค้ารับเครื่อง) ใส่ได้รีวิวละ {maxImages} รูป — เบลอหน้า/ข้อมูลส่วนตัวก่อนอัป
        </span>
      </p>

      {list === null ? (
        failed ? (
          <div className="rounded-2xl border border-border-default bg-white p-8 text-center text-sm text-text-muted">
            โหลดรีวิวไม่สำเร็จ <button type="button" onClick={load} className="ml-2 font-semibold text-text-heading underline">ลองใหม่</button>
          </div>
        ) : (
          <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
        )
      ) : reviews.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-default bg-white p-10 text-center text-sm text-text-muted">
          ยังไม่มีรีวิว — กด &quot;เพิ่มรีวิว&quot; แล้ววางข้อความจากเพจ Facebook
        </p>
      ) : (
        <ul className="space-y-2">
          {reviews.map((r, i) => (
            <li key={r.id} className={`rounded-2xl border bg-white p-4 ${r.visible ? "border-border-default" : "border-dashed border-border-default opacity-70"}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start">
                <div className="flex shrink-0 items-center gap-1 md:flex-col">
                  <span className="w-8 text-center text-xs font-semibold tabular-nums text-text-muted">#{i + 1}</span>
                  <IconBtn label="เลื่อนขึ้น" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></IconBtn>
                  <IconBtn label="เลื่อนลง" disabled={i === reviews.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></IconBtn>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-text-heading">{r.name}</p>
                    {onHome.has(r.id) && <span className="badge-dd badge-success">หน้าแรก</span>}
                    {!r.visible && <span className="badge-dd badge-warning">ซ่อนอยู่</span>}
                    {r.recommended && <span className="inline-flex items-center gap-1 text-xs text-text-muted"><ThumbsUp size={12} /> แนะนำ</span>}
                    <span className="text-xs text-text-muted">
                      {SOURCE_LABEL[r.source]}{formatReviewDate(r.reviewedOn) ? ` · ${formatReviewDate(r.reviewedOn)}` : ""}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-text-body">{r.text}</p>
                  <ImageStrip review={r} max={maxImages}
                              onAdded={(img) => patchImages(r.id, (imgs) => [...imgs, img])}
                              onRemove={(img) => removeImage(r, img)}
                              onMissing={load} />
                </div>

                <div className="flex shrink-0 gap-1">
                  <IconBtn label={r.visible ? "ซ่อนจากเว็บ" : "แสดงบนเว็บ"} disabled={busy === r.id} onClick={() => toggleVisible(r)}>
                    {busy === r.id ? <Loader2 size={16} className="animate-spin" /> : r.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </IconBtn>
                  <IconBtn label="แก้ไข" onClick={() => setEditing(r)}><Pencil size={16} /></IconBtn>
                  <IconBtn label="ลบ" danger disabled={busy === r.id} onClick={() => remove(r)}><Trash2 size={16} /></IconBtn>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ReviewForm
          review={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, isNew) => {
            setEditing(null);
            if (isNew) setList((l) => (l ? { ...l, reviews: [saved, ...l.reviews] } : l));
            else replace(saved);
          }}
          onMissing={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: {
  label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border-default bg-white transition-colors disabled:opacity-40 ${danger ? "text-error-text hover:bg-error-bg" : "text-text-body hover:bg-bg-subtle"}`}>
      {children}
    </button>
  );
}

/** รูปประกอบรีวิว: ลบทีละรูป · เพิ่มหลายรูปพร้อมกันได้ไม่เกินช่องที่เหลือ (ย่อเป็น JPEG ที่เบราว์เซอร์ก่อนส่ง) */
function ImageStrip({ review, max, onAdded, onRemove, onMissing }: {
  review: AdminSocialReview; max: number;
  onAdded: (img: SocialReviewImage) => void; onRemove: (img: SocialReviewImage) => void; onMissing: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const free = max - review.images.length;

  const upload = async (files: FileList | null) => {
    const picked = Array.from(files ?? []).filter((f) => f.type.startsWith("image/") || f.name.match(/\.(heic|heif)$/i));
    if (picked.length === 0) return;
    const list = picked.slice(0, free);
    if (picked.length > free) toast(`ใส่ได้อีก ${free} รูป — อัปเฉพาะ ${free} รูปแรก`, { icon: "ℹ️" });
    setProgress({ done: 0, total: list.length });
    for (const [i, f] of list.entries()) {
      try {
        const file = await compressImage(f, { forceJpeg: true, maxDim: 2000 });
        const fd = new FormData();
        fd.append("file", file);
        const res = await trackUpload(api.post<SocialReviewImage>(`/admin/social-reviews/${review.id}/images`, fd));
        onAdded(res.data);
      } catch (e) {
        toast.error(`${f.name}: ${getApiError(e, "อัปโหลดไม่สำเร็จ")}`);
        if (getApiStatus(e) === 404) { onMissing(); break; }
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {review.images.map((img) => (
        <span key={img.id} className="relative">
          <a href={img.url} target="_blank" rel="noopener noreferrer">
            <img src={img.url} alt="รูปประกอบรีวิว" className="h-16 w-16 rounded-lg border border-border-subtle object-cover" />
          </a>
          <button type="button" onClick={() => onRemove(img)} aria-label="ลบรูปนี้"
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-text-heading text-white shadow">
            <X size={12} />
          </button>
        </span>
      ))}
      {free > 0 && (
        <button type="button" onClick={() => input.current?.click()} disabled={!!progress}
                className="flex h-16 min-w-16 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-border-default px-2 text-[11px] text-text-muted transition-colors hover:border-yellow hover:text-text-heading disabled:opacity-60">
          {progress ? <><Loader2 size={16} className="animate-spin" /> {progress.done}/{progress.total}</> : <><ImagePlus size={16} /> เพิ่มรูป</>}
        </button>
      )}
      <input ref={input} type="file" accept="image/*,.heic,.heif" multiple className="hidden"
             onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

/** ฟอร์มเพิ่ม/แก้รีวิว — มีของค้างแล้วปิด/เปลี่ยนเมนู ต้องยืนยันก่อน */
function ReviewForm({ review, onClose, onSaved, onMissing }: {
  review: AdminSocialReview | null;
  onClose: () => void;
  onSaved: (r: AdminSocialReview, isNew: boolean) => void;
  onMissing: () => void;
}) {
  const initial = useRef<Draft>(review ? toDraft(review) : EMPTY);
  const [d, setD] = useState<Draft>(initial.current);
  const [saving, setSaving] = useState(false);
  const today = todayInBangkok();
  const dirty = JSON.stringify(d) !== JSON.stringify(initial.current);

  const confirmDiscard = useCallback(
    () => confirmDialog({ title: "ทิ้งรีวิวที่ยังไม่บันทึก?", message: "ข้อความที่พิมพ์ไว้จะหายไป", confirmText: "ทิ้ง", danger: true }),
    [],
  );

  useEffect(() => {
    setUnsaved(dirty, confirmDiscard);
    return () => setUnsaved(false);
  }, [dirty, confirmDiscard]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // กัน Esc ซ้อน: Esc ที่ปิดกล่องยืนยันต้องไม่เปิดกล่องยืนยันใบใหม่
  const asking = useRef(false);
  const close = async () => {
    if (saving || asking.current) return;
    asking.current = true;
    try {
      if (dirty && !(await confirmDiscard())) return;
    } finally {
      asking.current = false;
    }
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const urlBad = d.sourceUrl.trim() !== "" && !isSocialLink(d.sourceUrl.trim());
  const dateBad = d.reviewedOn !== "" && d.reviewedOn > today;
  const textLen = d.text.trim().length;
  const canSave = d.name.trim() !== "" && textLen > 0 && textLen <= 1000 && !urlBad && !dateBad && !saving;
  const abbreviated = abbreviateName(d.name);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = review
        ? await api.put<AdminSocialReview>(`/admin/social-reviews/${review.id}`, toPayload(d))
        : await api.post<AdminSocialReview>("/admin/social-reviews", toPayload(d));
      setUnsaved(false);
      toast.success(review ? "บันทึกแล้ว" : "เพิ่มรีวิวแล้ว — อยู่บนสุดของรายการ");
      onSaved(res.data, !review);
    } catch (e) {
      toast.error(getApiError(e, "บันทึกไม่สำเร็จ"));
      if (review && getApiStatus(e) === 404) onMissing();
    } finally {
      setSaving(false);
    }
  };

  const label = "mb-1 block text-sm font-semibold text-text-heading";

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={review ? "แก้ไขรีวิว" : "เพิ่มรีวิว"} onClick={close}>
      <div className="modal-dd max-h-[92vh] w-full max-w-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-text-heading">{review ? "แก้ไขรีวิว" : "เพิ่มรีวิวจากเพจ"}</h3>
          <button type="button" onClick={close} aria-label="ปิด" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-bg-subtle"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={label}>ช่องทาง</span>
              <select value={d.source} onChange={(e) => set("source", e.target.value as SocialSource)} className="input-dd">
                {SOCIAL_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={label}>วันที่รีวิว <span className="font-normal text-text-muted">(ถ้ารู้)</span></span>
              <input type="date" value={d.reviewedOn} max={today} onChange={(e) => set("reviewedOn", e.target.value)} className="input-dd" />
              {dateBad && <span className="mt-1 block text-xs text-error-text">วันที่ต้องไม่เกินวันนี้</span>}
            </label>
          </div>

          <label className="block">
            <span className={label}>ชื่อผู้รีวิว <span className="font-normal text-text-muted">(ย่อนามสกุล)</span></span>
            <span className="flex gap-2">
              <input value={d.name} maxLength={60} onChange={(e) => set("name", e.target.value)} className="input-dd" placeholder="เช่น Paphawee S." />
              <button type="button" onClick={() => set("name", abbreviated)} disabled={!d.name.trim() || abbreviated === d.name.trim()}
                      className="btn-secondary shrink-0 px-3 text-sm" title="ย่อนามสกุลเหลืออักษรแรก">
                <Wand2 size={14} /> ย่อชื่อ
              </button>
            </span>
          </label>

          <label className="block">
            <span className={label}>ข้อความรีวิว <span className="font-normal text-text-muted">(ตามต้นฉบับ)</span></span>
            <textarea value={d.text} rows={5} maxLength={1000} onChange={(e) => set("text", e.target.value)}
                      className="input-dd resize-y" placeholder="วางข้อความรีวิวจากเพจ Facebook" />
            <span className={`mt-1 block text-right text-xs tabular-nums ${textLen > 1000 ? "text-error-text" : "text-text-muted"}`}>{textLen}/1000</span>
          </label>

          <label className="block">
            <span className={label}>ลิงก์ต้นฉบับ <span className="font-normal text-text-muted">(ไม่บังคับ)</span></span>
            <input value={d.sourceUrl} maxLength={500} onChange={(e) => set("sourceUrl", e.target.value)} className="input-dd"
                   placeholder="https://www.facebook.com/…" inputMode="url" />
            {urlBad && <span className="mt-1 block text-xs text-error-text">ต้องเป็นลิงก์ https ของ Facebook / Google Maps / TikTok / LINE</span>}
          </label>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={d.recommended} onChange={(e) => set("recommended", e.target.checked)} className="h-4 w-4 accent-[var(--color-yellow-hover)]" />
              ลูกค้ากด &quot;แนะนำ&quot; ร้าน
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={d.visible} onChange={(e) => set("visible", e.target.checked)} className="h-4 w-4 accent-[var(--color-yellow-hover)]" />
              แสดงบนเว็บ
            </label>
          </div>
          {!review && <p className="text-xs text-text-muted">รูปประกอบ: บันทึกรีวิวก่อน แล้วกด &quot;เพิ่มรูป&quot; ที่รีวิวในรายการ</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={close} className="btn-ghost" disabled={saving}>ยกเลิก</button>
          <button type="button" onClick={save} disabled={!canSave} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />} {review ? "บันทึก" : "เพิ่มรีวิว"}
          </button>
        </div>
      </div>
    </div>
  );
}
