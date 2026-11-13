"use client";
/* eslint-disable @next/next/no-img-element -- รูป/ปกคลิปจาก backend (มีขนาดจริงใน media) + object URL ตอนพรีวิวในหลังบ้าน */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import {
  ArrowRight, Banknote, Check, ChevronDown, CreditCard, MessageCircle, Megaphone, Phone, Play, RefreshCw, ShieldCheck, Smartphone, Store, Tag,
} from "lucide-react";
import ReviewsSection from "@/components/ReviewsSection";
import { markIntentSeen } from "@/components/IntentGate";
import { useCookieConsent } from "@/context/CookieConsentContext";
import Link from "next/link";
import Image from "next/image";
import { TEL } from "@/lib/contact";
import { formatDuration } from "@/lib/videoCompress";
import {
  countdownParts, hasOffer, mediaById, resolveLink, withDefaults,
  type CampaignButton, type CampaignContent, type CampaignMedia, type ImageItem, type ServiceIcon,
} from "@/lib/campaign";

interface Props {
  title: string;
  content: CampaignContent;
  media: CampaignMedia[];
  /** พรีวิวในหลังบ้าน: ลิงก์ไม่พาออกจากหน้าแก้ · แถบปุ่มล่างไม่ลอย (อยู่ท้ายกรอบ) */
  preview?: boolean;
}

/**
 * หน้า Landing สำหรับยิงแอด — ลำดับตายตัว section ไหนว่าง = ไม่แสดง
 * ประกาศ → หัวข้อ+คลิป+ปุ่ม → ราคา/นับถอยหลัง → บริการ → รีวิว → ทำไมต้องเรา → แกลเลอรี → FAQ → ปิดท้าย · แถบปุ่มติดล่าง (มือถือ)
 */
export default function CampaignLanding({ title, content: raw, media, preview = false }: Props) {
  const content = withDefaults(raw);
  const byId = useMemo(() => mediaById(media), [media]);
  const { hero, offer, services, reviews, benefits, gallery, faq, closing } = content;
  const ctas = content.ctas.filter((b) => b.label && resolveLink(b.link, title));
  const heroMedia = hero?.mediaId != null ? byId.get(hero.mediaId) : undefined;
  const hasHero = !!(hero?.headline || heroMedia || ctas.length > 0);

  // ลูกค้าจากแอดรู้แล้วว่าสนใจอะไร — กดการ์ดไปหน้าบริการต่อ ไม่ต้องเจอป๊อปอัพ "สนใจบริการไหน" ทับหน้าที่เพิ่งเลือก
  useEffect(() => { if (!preview) markIntentSeen(); }, [preview]);

  return (
    <>
    {/* พรีวิวในหลังบ้าน: กดลิงก์แล้วไม่ออกจากหน้าแก้ */}
    <div className="@container bg-white" onClickCapture={preview ? (e: MouseEvent) => { if ((e.target as HTMLElement).closest("a")) e.preventDefault(); } : undefined}>
      <LandingHeader title={title} preview={preview} />
      {content.announcement && (
        <div className="bg-yellow px-4 py-2.5 text-center font-display text-sm font-semibold text-on-yellow">
          <Megaphone size={15} className="mr-1.5 inline -translate-y-px" aria-hidden />
          {content.announcement}
        </div>
      )}

      {/* ===== หัวข้อ + คลิป ===== */}
      {hasHero && (
        <section className="relative overflow-hidden bg-[#111111] pb-12 pt-10 text-white @3xl:pb-16 @3xl:pt-14">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_380px_at_80%_-10%,rgba(255,212,0,0.22),transparent_70%)]" />
          <div className="w-full px-4 @3xl:px-6 relative mx-auto max-w-3xl text-center">
            {hero?.eyebrow && <p className="mx-auto max-w-xl text-sm text-white/65 @3xl:text-base">{hero.eyebrow}</p>}
            {hero?.headline && (
              <h1 className="mt-3 text-[2rem] font-bold leading-tight text-white @3xl:text-5xl">
                {hero.headline}
                {hero.highlight && <><br /><span className="text-yellow">{hero.highlight}</span></>}
              </h1>
            )}
            {hero?.subheadline && <p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-base text-white/80 @3xl:text-lg">{hero.subheadline}</p>}

            {heroMedia && <HeroMedia media={heroMedia} label={hero?.mediaLabel ?? null} />}

            {ctas.length > 0 && (
              <div className="mx-auto mt-7 flex max-w-md flex-col gap-3">
                {ctas.map((b, i) => <CtaButton key={i} button={b} title={title} dark />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== ราคา / นับถอยหลัง ===== */}
      {hasOffer(offer) && offer && (
        <section className={`w-full px-4 @3xl:px-6 mx-auto max-w-xl ${hasHero ? "-mt-6 @3xl:-mt-8" : "mt-8"}`}>
          <div className="relative rounded-2xl border-2 border-yellow bg-white p-5 text-center shadow-[0_12px_32px_rgba(17,17,17,0.12)] @3xl:p-7">
            {offer.label && <p className="font-display text-sm font-semibold text-text-muted">{offer.label}</p>}
            {offer.price && (
              <p className="mt-1 flex flex-wrap items-baseline justify-center gap-x-2 font-display">
                {offer.priceBefore && <span className="text-lg text-text-muted line-through decoration-price decoration-2">{offer.priceBefore}</span>}
                <span className="text-5xl font-bold tabular-nums text-price @3xl:text-6xl">{offer.price}</span>
                {offer.priceSuffix && <span className="text-lg font-semibold text-text-heading">{offer.priceSuffix}</span>}
              </p>
            )}
            {offer.note && <p className="mt-2 whitespace-pre-line text-sm text-text-body">{offer.note}</p>}
            <Countdown end={offer.countdownEnd} label={offer.countdownLabel} />
          </div>
        </section>
      )}

      {/* ===== บริการ ===== */}
      {services && services.items.length > 0 && (
        <section className="py-12 @3xl:py-16">
          <div className="w-full px-4 @3xl:px-6 mx-auto max-w-5xl">
            {services.title && <SectionTitle>{services.title}</SectionTitle>}
            <div className="mt-6 grid grid-cols-2 gap-3 @3xl:grid-cols-3 @3xl:gap-4">
              {services.items.map((s, i) => {
                const link = resolveLink(s.link, title);
                if (!s.title || !link) return null;
                const img = s.mediaId != null ? byId.get(s.mediaId) : undefined;
                return (
                  <a key={i} href={link.href} {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                     className="group flex flex-col rounded-2xl border border-border-default bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-yellow hover:shadow-[0_10px_24px_rgba(17,17,17,0.08)] @3xl:p-5">
                    {img
                      ? <img src={img.url} alt="" width={img.width} height={img.height} loading="lazy" className="mb-3 aspect-[4/3] w-full rounded-xl bg-bg-subtle object-cover" />
                      : <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-yellow text-on-yellow"><ServiceGlyph icon={s.icon} /></span>}
                    <span className="font-display text-[15px] font-bold leading-snug text-text-heading @3xl:text-base">{s.title}</span>
                    {s.description && <span className="mt-1 text-xs leading-relaxed text-text-muted @3xl:text-sm">{s.description}</span>}
                    <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-yellow-text group-hover:gap-2">
                      {link.href.startsWith("https://line.me") ? "ทักไลน์" : link.href.startsWith("tel:") ? "โทรเลย" : "ไปต่อ"} <ArrowRight size={13} />
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== รีวิว (รูปแชท/รูปลูกค้า) ===== */}
      {reviews && reviews.items.length > 0 && <ReviewImages reviews={reviews} byId={byId} />}
      {reviews?.showStoreReviews && <ReviewsSection />}

      {/* ===== ทำไมต้องเรา ===== */}
      {benefits && benefits.items.length > 0 && (
        <section className="py-12 @3xl:py-16">
          <div className="w-full px-4 @3xl:px-6 mx-auto max-w-3xl">
            {benefits.title && <SectionTitle>{benefits.title}</SectionTitle>}
            <ul className="mt-6 grid gap-3 @3xl:grid-cols-2">
              {benefits.items.map((b, i) => (
                <li key={i} className="flex gap-3 rounded-2xl bg-bg-tinted p-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow text-on-yellow"><Check size={16} strokeWidth={3} /></span>
                  <span>
                    {b.title && <span className="block font-display font-bold text-text-heading">{b.title}</span>}
                    {b.text && <span className="block whitespace-pre-line text-sm text-text-body">{b.text}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ===== แกลเลอรี ===== */}
      {gallery && gallery.items.length > 0 && (
        <section className="bg-bg-subtle py-12 @3xl:py-16">
          <div className="w-full px-4 @3xl:px-6 mx-auto max-w-5xl">
            {gallery.title && <SectionTitle>{gallery.title}</SectionTitle>}
            <div className="mt-6 grid grid-cols-2 gap-3 @3xl:grid-cols-3">
              {gallery.items.map((g, i) => {
                const img = g.mediaId != null ? byId.get(g.mediaId) : undefined;
                if (!img) return null;
                return (
                  <figure key={i} className="overflow-hidden rounded-2xl bg-white">
                    <img src={img.url} alt={g.caption ?? g.quote ?? ""} width={img.width} height={img.height} loading="lazy" className="aspect-square w-full object-cover" />
                    {(g.quote || g.caption) && (
                      <figcaption className="p-3 text-xs text-text-body">
                        {g.quote && <span className="block font-semibold text-text-heading">{g.quote}</span>}
                        {g.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== FAQ ===== */}
      {faq && faq.items.length > 0 && (
        <section className="py-12 @3xl:py-16">
          <div className="w-full px-4 @3xl:px-6 mx-auto max-w-3xl">
            {faq.title && <SectionTitle>{faq.title}</SectionTitle>}
            <div className="mt-6 divide-y divide-border-default rounded-2xl border border-border-default bg-white">
              {faq.items.map((q, i) => (
                <details key={i} className="group p-4 @3xl:p-5" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-display font-semibold text-text-heading [&::-webkit-details-marker]:hidden">
                    {q.title ?? "คำถาม"}
                    <ChevronDown size={18} className="mt-0.5 shrink-0 text-text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  {q.text && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-body">{q.text}</p>}
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== ปิดท้าย ===== */}
      {(closing?.headline || ctas.length > 0) && (
        <section className="w-full px-4 @3xl:px-6 mx-auto max-w-3xl pb-14 @3xl:pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-[#111111] px-5 py-9 text-center text-white @3xl:px-10 @3xl:py-12">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_260px_at_50%_-20%,rgba(255,212,0,0.25),transparent_70%)]" />
            <div className="relative">
              {closing?.headline && <h2 className="text-2xl font-bold text-white @3xl:text-3xl">{closing.headline}</h2>}
              {closing?.text && <p className="mx-auto mt-2 max-w-md whitespace-pre-line text-white/75">{closing.text}</p>}
              {ctas.length > 0 && (
                <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
                  {ctas.map((b, i) => <CtaButton key={i} button={b} title={title} dark />)}
                </div>
              )}
              <p className="mt-5 text-sm text-white/60">
                หรือโทร <a href={`tel:${TEL.replace(/[^0-9]/g, "")}`} className="font-semibold text-yellow underline-offset-2 hover:underline">{TEL}</a>
              </p>
            </div>
          </div>
        </section>
      )}

      <LandingFooter />
      {/* พรีวิว: แถบปุ่มติดท้ายกรอบ (sticky) ภายในตัวดักลิงก์ */}
      {preview && ctas[0] && <StickyBar button={ctas[0]} title={title} preview />}
    </div>
    {/* หน้าจริง: แถบปุ่ม position:fixed อยู่ "นอก" กล่อง @container — WebKit รุ่นเก่า (iOS 16) ให้ container
        ทำตัวเป็นกรอบของ fixed → แถบจะไปค้างท้ายหน้าแทนที่จะติดจอ · ที่ว่างใต้แถบ = padding ล่าง 64px ของ <main> */}
    {!preview && ctas[0] && <StickyBar button={ctas[0]} title={title} preview={false} />}
    </>
  );
}

/* ============================ ชิ้นส่วน ============================ */

function SectionTitle({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <h2 className={`text-center text-2xl font-bold @3xl:text-3xl ${light ? "text-white" : "text-text-heading"}`}>
      <span className="relative inline-block">
        {children}
        <span aria-hidden className="absolute -bottom-1.5 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-yellow" />
      </span>
    </h2>
  );
}

const BUTTON_STYLE: Record<string, { dark: string; light: string }> = {
  PRIMARY: { dark: "bg-yellow text-on-yellow hover:bg-yellow-hover", light: "bg-yellow text-on-yellow hover:bg-yellow-hover" },
  LINE: { dark: "bg-line text-white shadow-[var(--shadow-line)] hover:brightness-105", light: "bg-line text-white shadow-[var(--shadow-line)] hover:brightness-105" },
  DARK: { dark: "bg-white text-text-heading hover:bg-white/90", light: "bg-text-heading text-white hover:bg-black" },
  OUTLINE: { dark: "border-2 border-white/40 text-white hover:border-yellow hover:text-yellow", light: "border-2 border-text-heading text-text-heading hover:bg-text-heading hover:text-white" },
};

function CtaButton({ button, title, dark, compact }: { button: CampaignButton; title: string; dark?: boolean; compact?: boolean }) {
  const link = resolveLink(button.link, title);
  if (!link || !button.label) return null;
  const style = BUTTON_STYLE[button.style ?? "PRIMARY"] ?? BUTTON_STYLE.PRIMARY;
  const isLine = button.link?.type === "LINE";
  const isPhone = button.link?.type === "PHONE";
  return (
    <a href={link.href} {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
       className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 text-center font-display font-bold transition-all active:scale-[0.98] ${compact ? "min-h-12 py-2 text-base" : "min-h-14 py-3 text-lg"} ${dark ? style.dark : style.light}`}>
      {isLine ? <MessageCircle size={20} aria-hidden /> : isPhone ? <Phone size={19} aria-hidden /> : null}
      <span className="flex flex-col leading-tight">
        <span>{button.label}</span>
        {button.sublabel && !compact && <span className="text-xs font-medium opacity-80">{button.sublabel}</span>}
      </span>
    </a>
  );
}

const noopSubscribe = () => () => {};

function HeroMedia({ media, label }: { media: CampaignMedia; label: string | null }) {
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const portrait = media.height > media.width;
  /*
   * ก่อน JS โหลดเสร็จ (เน็ตช้าในแอป Facebook) ปุ่มเล่นของเรายังกดไม่ติด → ช่วงนั้นใช้ปุ่มเล่นของเบราว์เซอร์เอง (controls)
   * พอ hydrate แล้วค่อยวางปุ่มเหลืองทับ · ถ้าลูกค้ากดเล่นไปก่อนแล้ว ไม่วางทับคลิปที่กำลังเล่น
   */
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  useEffect(() => {
    if (video.current && !video.current.paused) queueMicrotask(() => setPlaying(true));
  }, []);
  // play() ต้องเรียกในจังหวะแตะเลย (ไม่รอ re-render) — Safari/เบราว์เซอร์ในแอป Facebook บน iPhone นับเป็น "ผู้ใช้กดเล่น" จึงมีเสียง
  const start = () => {
    setPlaying(true);
    video.current?.play().catch(() => { /* ถูกบล็อก → ผู้ใช้กดปุ่ม play ของ controls ต่อเองได้ */ });
  };
  return (
    // คลิปแนวตั้ง: สูงไม่เกิน ~55% ของจอ — ปุ่มใต้คลิปยังโผล่ในจอแรก ไม่ต้องเลื่อนหา
    <div className={`mx-auto mt-7 overflow-hidden rounded-2xl border border-white/10 bg-black text-left shadow-[0_20px_50px_rgba(0,0,0,0.45)] ${portrait ? "" : "max-w-2xl"}`}
         style={portrait ? { maxWidth: `min(100%, 380px, calc(55vh * ${media.width} / ${media.height}))` } : undefined}>
      {label && <p className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white">{label}</p>}
      <div className="relative" style={{ aspectRatio: `${media.width} / ${media.height}` }}>
        {media.kind === "VIDEO" ? (
          <>
            {/* preload="none": ไม่กินเน็ตลูกค้าจนกว่าจะกดเล่น (เห็นปกก่อน) */}
            <video ref={video} src={media.url} poster={media.posterUrl ?? undefined} controls={playing || !hydrated} playsInline preload="none"
                   onPlay={() => setPlaying(true)} className="absolute inset-0 h-full w-full bg-black object-contain" />
            {hydrated && !playing && (
              <button type="button" onClick={start} className="group absolute inset-0 block h-full w-full" aria-label="เล่นคลิป">
                {media.posterUrl && <img src={media.posterUrl} alt="" width={media.width} height={media.height} className="h-full w-full object-cover" fetchPriority="high" />}
                <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-yellow text-on-yellow shadow-[var(--shadow-yellow)] transition-transform group-hover:scale-105">
                  <Play size={34} className="translate-x-0.5 fill-current" />
                </span>
                {media.durationMs != null && (
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
                    {formatDuration(media.durationMs)}
                  </span>
                )}
              </button>
            )}
          </>
        ) : (
          <img src={media.url} alt="" width={media.width} height={media.height} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
        )}
      </div>
    </div>
  );
}

function Countdown({ end, label }: { end: string | null; label: string | null }) {
  const [now, setNow] = useState<number | null>(null);   // นับหลัง mount เท่านั้น (เวลาเซิร์ฟเวอร์ ≠ เครื่องลูกค้า)
  useEffect(() => {
    if (!end) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [end]);
  const parts = now == null ? null : countdownParts(end, now);
  if (!parts) return null;
  const cells: [number, string][] = [[parts.d, "วัน"], [parts.h, "ชั่วโมง"], [parts.m, "นาที"], [parts.s, "วินาที"]];
  return (
    <div className="mt-4" role="timer" aria-live="off">
      {label && <p className="mb-2 text-sm font-semibold text-text-heading">{label}</p>}
      <div className="mx-auto grid max-w-xs grid-cols-4 gap-2">
        {cells.map(([n, unit]) => (
          <div key={unit} className="rounded-xl bg-[#111111] py-2">
            <span className="block font-display text-2xl font-bold tabular-nums text-yellow">{String(n).padStart(2, "0")}</span>
            <span className="block text-[11px] text-white/70">{unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewImages({ reviews, byId }: { reviews: NonNullable<CampaignContent["reviews"]>; byId: Map<number, CampaignMedia> }) {
  const items = reviews.items.filter((r): r is ImageItem & { mediaId: number } => r.mediaId != null && byId.has(r.mediaId));
  const initial = Math.max(1, reviews.initialCount ?? 6);
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  const shown = open ? items : items.slice(0, initial);
  const more = items.length - initial;
  return (
    <section className="bg-[#111111] py-12 text-white @3xl:py-16">
      <div className="w-full px-4 @3xl:px-6 mx-auto max-w-5xl">
        {reviews.title && <SectionTitle light>{reviews.title}</SectionTitle>}
        {reviews.subtitle && <p className="mt-4 text-center text-sm text-white/65">{reviews.subtitle}</p>}
        <div className="mt-8 gap-4 [column-fill:_balance] @2xl:columns-2 @5xl:columns-3">
          {shown.map((r, i) => {
            const img = byId.get(r.mediaId)!;
            return (
              <figure key={i} className="mb-5 break-inside-avoid">
                {r.quote && <p className="mb-2 text-center font-display text-lg font-bold text-yellow">“{r.quote}”</p>}
                <img src={img.url} alt={r.quote ? `รีวิวจากลูกค้า: ${r.quote}` : "รีวิวจากลูกค้า"} width={img.width} height={img.height}
                     loading="lazy" className="w-full rounded-2xl border border-white/10 bg-white/5" />
                {r.caption && <figcaption className="mt-1.5 text-center text-xs text-white/60">{r.caption}</figcaption>}
              </figure>
            );
          })}
        </div>
        {more > 0 && (
          <div className="mt-4 text-center">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white hover:border-yellow hover:text-yellow">
              {open ? "ย่อกลับ" : `ดูรีวิวเพิ่มอีก ${more} รายการ`}
              <ChevronDown size={16} className={open ? "rotate-180" : ""} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** มือถือ: แถบปุ่มหลักติดล่างตั้งแต่จอแรก (หน้า Landing ไม่มีเมนูล่างของเว็บ — ชิดขอบล่างจอ) — คลิปแนวตั้งดันปุ่มใต้คลิปลงไปนอกจอ */
function StickyBar({ button, title, preview }: { button: CampaignButton; title: string; preview: boolean }) {
  return (
    <div className={preview
      ? "sticky bottom-0 z-10 border-t border-border-default bg-white/95 px-4 py-3 backdrop-blur"
      : "fixed inset-x-0 bottom-0 z-[80] border-t border-border-default bg-white/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(17,24,39,0.10)] backdrop-blur md:hidden"}>
      <CtaButton button={button} title={title} compact />
    </div>
  );
}

function ServiceGlyph({ icon }: { icon: ServiceIcon | null }) {
  const p = { size: 20, "aria-hidden": true } as const;
  switch (icon) {
    case "INSTALLMENT": return <CreditCard {...p} />;
    case "TRADE_IN": return <RefreshCw {...p} />;
    case "SELL": return <Banknote {...p} />;
    case "CHAT": return <MessageCircle {...p} />;
    case "STORE": return <Store {...p} />;
    case "SHIELD": return <ShieldCheck {...p} />;
    case "TAG": return <Tag {...p} />;
    default: return <Smartphone {...p} />;
  }
}

/** หัวหน้าเดี่ยว: โลโก้ (ยืนยันว่าเป็นร้านจริง) + ทักไลน์ — ไม่มีเมนูให้หลุดไปหน้าอื่น */
function LandingHeader({ title, preview }: { title: string; preview: boolean }) {
  const line = resolveLink({ type: "LINE", value: null }, title)!;
  return (
    <header className={`${preview ? "" : "sticky top-0"} z-[90] border-b border-border-default bg-white/95 backdrop-blur-sm`}>
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 @3xl:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="DD Mobile หน้าแรก">
          <Image src="/images/logo.png" alt="DDMOBILE Logo" width={36} height={36} className="h-8 w-auto object-contain" />
          <span className="logo-dd">DD<span className="text-yellow-hover">MOBILE</span></span>
        </Link>
        <a href={line.href} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1.5 rounded-full bg-line px-3.5 py-2 text-sm font-bold text-white shadow-[var(--shadow-line)]">
          <MessageCircle size={16} aria-hidden /> ทักไลน์
        </a>
      </div>
    </header>
  );
}

/** ท้ายหน้าแบบสั้น: ตัวตนร้าน + ติดต่อ + นโยบายความเป็นส่วนตัว/คุกกี้ (หน้าปลายทางโฆษณาควรมี) */
function LandingFooter() {
  const { openPreferences } = useCookieConsent();
  return (
    <footer className="border-t border-border-default bg-bg-subtle px-4 py-6 text-center text-xs text-text-muted">
      <p className="font-display text-sm font-bold text-text-heading">DD Mobile</p>
      <p className="mt-1">โทร <a href={`tel:${TEL.replace(/[^0-9]/g, "")}`} className="font-semibold text-text-body">{TEL}</a> · <Link href="/contact" className="underline-offset-2 hover:underline">หน้าร้าน &amp; การเดินทาง</Link></p>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 [&>*]:inline-flex [&>*]:min-h-11 [&>*]:items-center">
        <Link href="/privacy" className="underline-offset-2 hover:underline">นโยบายความเป็นส่วนตัว</Link>
        <button type="button" onClick={openPreferences} className="underline-offset-2 hover:underline">ตั้งค่าคุกกี้</button>
        <span suppressHydrationWarning>© {new Date().getFullYear()} DD Mobile</span>
      </p>
    </footer>
  );
}
