/* eslint-disable @next/next/no-img-element -- รูปจาก backend (capability URL) ไม่ผ่าน image optimizer: ไม่ให้ Vercel cache รูปลูกค้า */
import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Clock, ImageOff } from "lucide-react";
import { galleryPhotoUrl, loadGallery, slotLabel } from "@/lib/gallery";
import { SERVICES, isServiceCode } from "@/lib/services";

interface Props { params: Promise<{ token: string }>; }

const serviceName = (code: string) => (isServiceCode(code) ? SERVICES[code].label : "ประเมินเครื่อง");

/** การ์ดพรีวิวใน LINE: ชื่อ = รุ่น + เลขอ้างอิง · รูป = รูปแรก · ห้าม index (ลิงก์ส่วนตัว) */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const r = await loadGallery(token);
  const base: Metadata = { robots: { index: false, follow: false } };
  if (r.kind !== "ok") return { ...base, title: "ลิงก์ดูรูปเครื่อง | DD Mobile" };
  const g = r.gallery;
  const title = `รูปเครื่อง ${g.model} ${g.storage} · ${g.refCode}`;
  const description = `${serviceName(g.serviceType)} · แนบรูป ${g.photos.length} รูป`;
  const first = g.photos[0];
  return {
    ...base, title, description,
    openGraph: { title, description, type: "website", images: first ? [{ url: galleryPhotoUrl(token, first.id), alt: title }] : [] },
  };
}

export default async function GalleryPage({ params }: Props) {
  const { token } = await params;
  const r = await loadGallery(token);

  if (r.kind !== "ok") {
    return (
      <div className="page-wrapper min-h-[70vh] bg-bg-base">
        <div className="container-dd flex flex-col items-center py-20 text-center">
          {r.kind === "expired" ? <Clock size={44} className="text-text-disabled" /> : <ImageOff size={44} className="text-text-disabled" />}
          <h1 className="mt-4 text-xl font-bold text-text-heading">{r.kind === "expired" ? "ลิงก์ดูรูปหมดอายุแล้ว" : "ไม่พบลิงก์ดูรูป"}</h1>
          <p className="mt-1 text-sm text-text-muted">ทีมงานยังดูรูปได้ในระบบหลังร้านตามเลขอ้างอิง</p>
          <Link href="/" className="btn-primary mt-6 inline-flex">กลับหน้าแรก</Link>
        </div>
      </div>
    );
  }

  const g = r.gallery;
  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <div className="container-dd max-w-4xl py-8 md:py-12">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-yellow-text"><Camera size={16} /> รูปเครื่องที่ลูกค้าแนบ · {serviceName(g.serviceType)}</p>
        <h1 className="mt-1 text-2xl font-bold text-text-heading md:text-3xl">{g.model} {g.storage}</h1>
        <p className="mt-1 text-sm text-text-muted">
          เลขอ้างอิง <span className="font-mono font-bold text-text-heading">{g.refCode}</span> · {g.photos.length} รูป ·{" "}
          {new Date(g.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {g.photos.map((p, i) => (
            <a key={p.id} href={galleryPhotoUrl(token, p.id)} target="_blank" rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-2xl border border-border-default bg-bg-subtle">
              <img src={galleryPhotoUrl(token, p.id)} alt={`${slotLabel(p.slot)} — รูปที่ ${i + 1}`}
                loading={i < 2 ? "eager" : "lazy"} decoding="async" className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.03]" />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-center text-xs font-semibold text-white">{slotLabel(p.slot)}</span>
            </a>
          ))}
        </div>
        <p className="mt-6 text-xs text-text-muted">ลิงก์นี้สำหรับทีมงาน ดีดี โมบาย ใช้ประเมินเครื่อง · แตะรูปเพื่อดูขนาดเต็ม · ลิงก์หมดอายุอัตโนมัติ</p>
      </div>
    </div>
  );
}
