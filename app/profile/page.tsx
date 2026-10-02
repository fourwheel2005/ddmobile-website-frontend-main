"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { UserRound, MapPin, Save, Package, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { getApiError, getApiStatus } from "@/lib/errorMessage";
import Req from "@/components/ui/Req";
import ThaiAddressAutocomplete, { type ThaiGeo } from "@/components/ThaiAddressAutocomplete";
import {
  normalizeAddress, patchStoredUser, readStoredUser, toAddressPayload, toGeo, type ProfileResponse,
} from "@/lib/profile";
import { safeRedirect } from "@/lib/accessGate";
import { isProfileComplete } from "@/lib/session";

// รูปแบบเดียวกับหน้าสมัคร/checkout และ backend
const TEL_RE = /^0\d{1,2}[-\s]?\d{3}[-\s]?\d{3,4}$/;

/** ครอบ Suspense — useSearchParams ต้องมี boundary ตอน prerender (Next 16) */
export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-base" />}>
      <ProfileForm />
    </Suspense>
  );
}

/**
 * โปรไฟล์ของฉัน — แก้ชื่อ เบอร์ ที่อยู่ (เก็บใน DB ผ่าน PUT /users/me)
 * โชว์ค่าจาก localStorage ทันที (ไม่ต้องรอ skeleton) แล้วแทนด้วยค่าจริงจาก server เมื่อมาถึง
 *
 * ?complete=1&redirect=... = ขั้น "เติมข้อมูลสมาชิกให้ครบ" ที่กำแพงสมาชิกส่งมา (ชื่อ + เบอร์ + ที่อยู่ครบ)
 * บันทึกแล้ว (หรือ server บอกว่าครบอยู่แล้ว) → กลับหน้าที่ตั้งใจจะไปทันที
 */
function ProfileForm() {
  const router = useRouter();
  const params = useSearchParams();
  const completeMode = params.get("complete") === "1";
  const returnTo = safeRedirect(params.get("redirect")) ?? "/products";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tel, setTel] = useState("");
  const [geo, setGeo] = useState<ThaiGeo | null>(null);
  const [addressLine, setAddressLine] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);   // กันกดบันทึกซ้ำก่อน re-render ปิดปุ่มทัน

  useEffect(() => {
    const stored = readStoredUser();
    if (!stored) { router.replace("/login?redirect=/profile"); return; }
    let alive = true;
    // ค่าจาก localStorage ก่อน (instant) — defer ด้วย rAF ไม่ setState sync ใน effect
    let fromServer = false;   // ค่าจาก server มาก่อน rAF (แทบไม่เกิด) → ห้ามเอาค่าเก่าใน storage ทับ
    const f = requestAnimationFrame(() => {
      if (!alive || fromServer) return;
      setEmail(stored.email ?? "");
      setName(stored.name ?? "");
      setTel(stored.tel ?? "");
      setGeo(toGeo(stored.address));
      setAddressLine(stored.address?.addressLine ?? "");
    });
    api.get<ProfileResponse>("/users/me")
      .then(({ data }) => {
        if (!alive) return;
        fromServer = true;
        const address = normalizeAddress(data.address);
        setEmail(data.email);
        setName(data.name ?? "");
        setTel(data.tel ?? "");
        setGeo(toGeo(address));
        setAddressLine(address?.addressLine ?? "");
        // sync สำเนาใน localStorage ให้ตรง DB (เผื่อแก้จากอุปกรณ์อื่น) — patchStoredUser อัปเดต cookie กำแพงด้วย
        const synced = patchStoredUser({ name: data.name ?? "", tel: data.tel ?? "", address });
        // ข้อมูลใน DB ครบอยู่แล้ว (เช่นเติมจากเครื่องอื่น) → ไม่ต้องให้กรอกซ้ำ พากลับหน้าเดิมเลย
        if (completeMode && isProfileComplete(synced)) window.location.replace(returnTo);
      })
      .catch((err) => {
        if (!alive) return;
        if ([401, 403].includes(getApiStatus(err) ?? 0)) { router.replace("/login?redirect=/profile"); return; }
        toast.error(getApiError(err, "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ"));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; cancelAnimationFrame(f); };
  }, [router, completeMode, returnTo]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLock.current) return;
    if (!name.trim()) { toast.error("กรุณากรอกชื่อ"); return; }
    if (!TEL_RE.test(tel.trim())) { toast.error("เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)"); return; }
    // สมาชิกต้องมีที่อยู่ครบ (backend บังคับด้วย)
    if (!geo) { toast.error("กรุณาเลือกตำบล / อำเภอ / จังหวัด จากช่องค้นหา"); return; }
    if (!addressLine.trim()) { toast.error("กรุณากรอกบ้านเลขที่ / หมู่ / ถนน"); return; }

    saveLock.current = true;
    setSaving(true);
    try {
      const { data } = await api.put<ProfileResponse>("/users/me", {
        name: name.trim(),
        tel: tel.trim(),
        address: toAddressPayload(geo, addressLine),
      });
      const saved = patchStoredUser({ name: data.name ?? "", tel: data.tel ?? "", address: normalizeAddress(data.address) });
      toast.success(completeMode ? "ข้อมูลครบแล้ว เริ่มใช้งานได้เลย" : "บันทึกข้อมูลแล้ว");
      if (completeMode && isProfileComplete(saved)) { window.location.replace(returnTo); return; }
    } catch (err) {
      toast.error(getApiError(err, "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const busy = loading || saving;

  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <div className="container-dd py-8 md:py-12">
        <form onSubmit={save} className="mx-auto max-w-2xl space-y-6">
          {completeMode && (
            <div className="flex items-start gap-3 rounded-2xl border border-yellow/50 bg-yellow/10 p-4 text-sm">
              <ShieldCheck size={22} className="mt-0.5 flex-shrink-0 text-yellow-hover" />
              <p className="text-text-body">
                <span className="block font-bold text-text-heading">อีกขั้นเดียว — กรอกข้อมูลสมาชิกให้ครบ</span>
                ชื่อ เบอร์โทร และที่อยู่ ใช้ติดต่อเรื่องบริการและเติมให้อัตโนมัติตอนทำรายการ บันทึกแล้วไปต่อได้ทันที
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-2xl font-bold text-text-heading md:text-3xl">{completeMode ? "ข้อมูลสมาชิก" : "โปรไฟล์ของฉัน"}</h1>
            <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-text hover:text-text-heading">
              <Package size={15} /> คำสั่งซื้อของฉัน
            </Link>
          </div>

          <div className="card-dd" aria-busy={loading}>
            <h2 className="mb-4 flex items-center gap-2 font-bold text-text-heading"><UserRound size={18} className="text-yellow-hover" /> ข้อมูลบัญชี</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="pf-email" className="label-dd">อีเมล</label>
                <input id="pf-email" value={email} readOnly disabled className="input-dd cursor-not-allowed opacity-70" />
                <p className="mt-1.5 text-xs text-text-muted">อีเมลใช้เข้าสู่ระบบ — เปลี่ยนไม่ได้</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pf-name" className="label-dd">ชื่อ - นามสกุล<Req /></label>
                  <input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} required maxLength={100} autoComplete="name" className="input-dd" />
                </div>
                <div>
                  <label htmlFor="pf-tel" className="label-dd">เบอร์โทร<Req /></label>
                  <input id="pf-tel" type="tel" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} disabled={busy} required autoComplete="tel" placeholder="เช่น 0812345678" className="input-dd" />
                </div>
              </div>
            </div>
          </div>

          <div className="card-dd">
            <h2 className="mb-1 flex items-center gap-2 font-bold text-text-heading"><MapPin size={18} className="text-yellow-hover" /> ที่อยู่</h2>
            <p className="mb-4 text-xs text-text-muted">ใช้เติมให้อัตโนมัติตอนสั่งซื้อ และหน้าขายเครื่อง / ผ่อนบอลลูน</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="pf-geo" className="label-dd">ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์<Req /></label>
                <ThaiAddressAutocomplete inputId="pf-geo" value={geo} onChange={setGeo} disabled={busy} />
              </div>
              <div>
                <label htmlFor="pf-addr" className="label-dd">บ้านเลขที่ / หมู่ / ซอย / ถนน<Req /></label>
                <input id="pf-addr" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} disabled={busy} maxLength={255} autoComplete="street-address" placeholder="เช่น 99/1 หมู่ 2 ซ.สุขใจ ถ.รามคำแหง" className="input-dd" />
              </div>
              {!geo && !addressLine.trim() && !loading && (
                <p className="text-xs text-text-muted">ยังไม่ได้ตั้งที่อยู่ — ค้นหาด้านบนแล้วกรอกบ้านเลขที่ให้ครบ (จำเป็นสำหรับสมาชิก)</p>
              )}
            </div>
          </div>

          <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-base">
            {saving ? "กำลังบันทึก..." : loading ? "กำลังโหลด..." : <><Save size={18} /> {completeMode ? "บันทึกแล้วไปต่อ" : "บันทึกข้อมูล"}</>}
          </button>
        </form>
      </div>
    </div>
  );
}
