"use client";
import { useEffect, useState } from "react";
import {
  CheckCircle2, MessageCircle, FileSignature, ShoppingBag, UserCheck, FileText
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import type { InstallmentPlan, InstallmentSerial } from "@/lib/installment";
import { LINE_URL } from "@/lib/contact";

export default function InstallmentsPage() {
  const [minMonthly, setMinMonthly] = useState<number | null>(null);
  const [rateReady, setRateReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadLowestInstallment = async () => {
      try {
        const [plansRes, serialsRes] = await Promise.all([
          api.get("/installment/plans"),
          api.get("/installment/serials"),
        ]);
        const plans = Array.isArray(plansRes.data) ? plansRes.data as InstallmentPlan[] : [];
        const serials = Array.isArray(serialsRes.data) ? serialsRes.data as InstallmentSerial[] : [];
        const monthlyValues = [
          ...plans.flatMap((plan) => plan.terms ?? []).map((term) => term.monthly),
          ...serials.flatMap((serial) => serial.terms ?? []).map((term) => term.monthly),
          ...serials.map((serial) => serial.monthly),
        ].filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
        if (!cancelled) setMinMonthly(monthlyValues.length > 0 ? Math.min(...monthlyValues) : null);
      } catch {
        // ไม่เดาราคาเมื่อข้อมูลตารางผ่อนไม่พร้อม
      } finally {
        if (!cancelled) setRateReady(true);
      }
    };
    loadLowestInstallment();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page-wrapper min-h-screen bg-bg-base">

      {/* 1. HEADER */}
      <section className="bg-bg-subtle">
        <div className="container-dd py-12 md:py-16">
          <span className="badge-dd badge-warning">อาชีพไหนก็ผ่อนได้</span>
          <h1 className="mt-4 text-3xl font-bold text-text-heading md:text-5xl">
            อยากได้มือถือ แต่ไม่มีบัตรเครดิต <span className="text-yellow-hover">ทำไงดี?</span>
          </h1>
          <p className="mt-4 max-w-2xl text-text-muted">
            ที่ ดีดี โมบาย เราช่วยให้คุณเลือกแผนผ่อนตามรุ่นและคุณสมบัติของคุณได้ง่ายขึ้น โดยแอดมินจะยืนยันเงื่อนไขก่อนดำเนินการทุกครั้ง
          </p>
          <div className="mt-6 inline-flex items-baseline gap-3 rounded-2xl border border-border-default bg-white px-6 py-4 shadow-card">
            <span className="text-sm text-text-muted">{rateReady && minMonthly == null ? "ดูแผนผ่อนของแต่ละรุ่น" : "ผ่อนเริ่มต้นเพียง"}</span>
            {minMonthly != null && <><span className="text-3xl font-bold text-price">฿{minMonthly.toLocaleString()}</span><span className="text-sm text-text-muted">/เดือน</span></>}
            {!rateReady && <span className="text-sm font-medium text-text-muted">กำลังตรวจแผนผ่อน…</span>}
          </div>
        </div>
      </section>

      {/* 2. BENEFITS */}
      <section className="container-dd py-10 md:py-12">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {benefits.map((benefit, idx) => (
            <div key={idx} className="card-dd flex items-center gap-4">
              <CheckCircle2 size={24} className="flex-shrink-0 text-yellow-hover" />
              <p className="font-medium text-text-body">{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="bg-bg-subtle py-12 md:py-16">
        <div className="container-dd">
          <p className="section-label">3 ขั้นตอนง่ายๆ รับเครื่องชัวร์</p>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            {steps.map((step, idx) => (
              <div key={idx} className="card-dd">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow text-text-heading">{step.icon}</div>
                <div className="mb-1 text-sm font-semibold text-yellow-hover">ขั้นตอนที่ {idx + 1}</div>
                <h3 className="mb-2 text-lg font-bold text-text-heading">{step.title}</h3>
                <p className="text-sm text-text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. REQUIREMENTS */}
      <section className="container-dd py-12 md:py-16">
        <p className="section-label">รายละเอียด สิ่งที่ต้องเตรียม</p>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="card-dd">
            <div className="mb-5 flex items-center gap-4">
              <div className="rounded-xl bg-yellow p-3 text-text-heading"><UserCheck size={26} /></div>
              <h3 className="card-title mb-0">คุณสมบัติ</h3>
            </div>
            <ul className="space-y-3">
              {["นักศึกษา อายุ 18 ปีขึ้นไป", "บุคคลธรรมดา อายุ 20 - 60 ปี", "มีบัตรประชาชนสัญชาติไทย", "พนักงานประจำ / อาชีพอิสระ / ธุรกิจส่วนตัว"].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-yellow-hover" />
                  <span className="text-text-body">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-dd">
            <div className="mb-5 flex items-center gap-4">
              <div className="rounded-xl bg-yellow p-3 text-text-heading"><FileText size={26} /></div>
              <h3 className="card-title mb-0">เอกสารที่ต้องเตรียม</h3>
            </div>
            <ul className="space-y-3">
              {["บัตรประชาชนตัวจริง", "สลิปเงินเดือน หรือ เอกสารแสดงรายได้", "ทะเบียนนักศึกษา หรือ บัตรนักศึกษาตัวจริง (สำหรับนักศึกษา)"].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-yellow-hover" />
                  <span className="text-text-body">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 5. CTA */}
      <section className="container-dd pb-12 md:pb-16">
        <div className="rounded-3xl bg-yellow p-8 text-center md:p-12">
          <h2 className="text-2xl font-bold text-text-heading md:text-4xl">พร้อมแล้วใช่ไหม?</h2>
          <p className="mt-3 text-sm font-medium text-text-heading/70">ทักแชทหาแอดมิน เพื่อประเมินสิทธิ์เบื้องต้นได้เลย ไม่มีค่าใช้จ่าย</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={LINE_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-text-heading px-8 py-3.5 font-semibold text-white transition-transform hover:-translate-y-0.5">
              <MessageCircle size={20} /> ทักแชทแอดมิน (LINE)
            </a>
            <Link href="/products" className="inline-flex items-center justify-center rounded-full border border-text-heading/20 bg-white px-8 py-3.5 font-semibold text-text-heading transition-colors hover:bg-bg-subtle">
              ดูสินค้าน่าสนใจ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const benefits = [
  "ใช้บัตรประชาชนใบเดียวในการทำเรื่อง",
  "ดาวน์ถูก ผ่อนสบาย จ่ายเงินผ่านแอปได้",
  "เครื่องแท้มือ 1 รับประกันศูนย์ไทย",
  "มีหน้าร้านชัดเจน ปลอดภัย ไว้ใจได้"
];

const steps = [
  { icon: <MessageCircle size={28} />, title: "ทักแชทหาแอดมิน", desc: "แจ้งรุ่นที่สนใจ สอบถามเงื่อนไข และส่งเอกสารเบื้องต้นผ่านแชทได้เลย" },
  { icon: <FileSignature size={28} />, title: "ลงทะเบียน", desc: "กรอกข้อมูลยืนยันตัวตนง่ายๆ ทราบผลอนุมัติไวภายใน 1 วัน" },
  { icon: <ShoppingBag size={28} />, title: "นัดรับเครื่อง", desc: "รับเครื่องที่หน้าร้าน หรือจัดส่งด่วนถึงบ้าน พร้อมแกะกล่องเช็คเครื่อง" }
];
