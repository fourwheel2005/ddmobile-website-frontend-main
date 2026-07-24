import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Cookie, BarChart3, Megaphone, Database, UserCheck, Mail, Phone } from "lucide-react";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import { TEL, TEL_HREF, LINE_URL } from "@/lib/contact";
import { MAX_AGE_DAYS } from "@/lib/cookieConsent";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัวและคุกกี้ | DD Mobile",
  description:
    "นโยบายความเป็นส่วนตัวและการใช้คุกกี้ของ DD Mobile — เราเก็บและใช้ข้อมูลอย่างไร ประเภทคุกกี้ และสิทธิของคุณตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA)",
};

/** วันที่ปรับปรุงนโยบายล่าสุด — อัปเดตเมื่อแก้ไขเนื้อหาสำคัญ */
const LAST_UPDATED = "24 กรกฎาคม 2568";

const COOKIE_TYPES = [
  {
    icon: ShieldCheck,
    title: "คุกกี้ที่จำเป็น (Necessary)",
    desc: "จำเป็นต่อการทำงานพื้นฐานของเว็บไซต์ เช่น การเข้าสู่ระบบ ตะกร้าสินค้า และการรักษาความปลอดภัย ไม่สามารถปิดได้ และไม่ต้องขอความยินยอม",
  },
  {
    icon: BarChart3,
    title: "คุกกี้เพื่อการวิเคราะห์ (Analytics)",
    desc: "ช่วยให้เราเข้าใจว่าผู้ใช้เข้าชมและใช้งานหน้าใดบ้าง เพื่อวัดผลและปรับปรุงเว็บไซต์ให้ดีขึ้น ทำงานเมื่อคุณให้ความยินยอมเท่านั้น",
  },
  {
    icon: Megaphone,
    title: "คุกกี้เพื่อการตลาด (Marketing)",
    desc: "ใช้เพื่อแสดงโปรโมชันและเนื้อหาที่ตรงกับความสนใจของคุณ ทั้งบนเว็บไซต์และแพลตฟอร์มอื่น ทำงานเมื่อคุณให้ความยินยอมเท่านั้น",
  },
];

const RIGHTS = [
  "สิทธิในการเข้าถึงและขอสำเนาข้อมูลส่วนบุคคลของคุณ",
  "สิทธิในการขอแก้ไขข้อมูลให้ถูกต้องเป็นปัจจุบัน",
  "สิทธิในการขอลบหรือทำลายข้อมูล เมื่อหมดความจำเป็น",
  "สิทธิในการเพิกถอนความยินยอมที่เคยให้ไว้ได้ทุกเมื่อ",
  "สิทธิในการคัดค้านหรือระงับการใช้ข้อมูลของคุณ",
];

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-dd">
      <h2 className="flex items-center gap-2.5 text-xl font-bold text-text-heading md:text-2xl">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-yellow/15 text-yellow-hover">
          <Icon size={20} />
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-3 leading-loose text-text-body">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      {/* HERO */}
      <section className="bg-bg-subtle">
        <div className="container-dd py-12 md:py-16">
          <p className="section-label">ความเป็นส่วนตัว</p>
          <h1 className="text-3xl font-bold text-text-heading md:text-5xl">
            นโยบายความเป็นส่วนตัว<span className="text-yellow-hover">และคุกกี้</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-text-muted">
            DD Mobile ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของคุณ นโยบายนี้อธิบายว่าเราเก็บ ใช้
            และปกป้องข้อมูลของคุณอย่างไร ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
          </p>
          <p className="mt-3 text-sm text-text-disabled">ปรับปรุงล่าสุด: {LAST_UPDATED}</p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="container-dd space-y-5 py-12 md:py-16">
        <Section icon={Database} title="ข้อมูลที่เราเก็บรวบรวม">
          <p>เราเก็บรวบรวมข้อมูลเท่าที่จำเป็นต่อการให้บริการ ได้แก่</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>ข้อมูลที่คุณให้โดยตรง เช่น ชื่อ เบอร์โทรศัพท์ ที่อยู่จัดส่ง เมื่อสมัครสมาชิกหรือสั่งซื้อ</li>
            <li>ข้อมูลการทำรายการ เช่น คำสั่งซื้อ การผ่อนชำระ และประวัติการติดต่อ</li>
            <li>ข้อมูลทางเทคนิคที่เก็บผ่านคุกกี้ เช่น ประเภทอุปกรณ์และการใช้งานหน้าเว็บ</li>
          </ul>
        </Section>

        <Section icon={UserCheck} title="วัตถุประสงค์ในการใช้ข้อมูล">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>เพื่อดำเนินการตามคำสั่งซื้อ การผ่อนชำระ และการจัดส่งสินค้า</li>
            <li>เพื่อติดต่อ ให้บริการหลังการขาย และตอบข้อสงสัย</li>
            <li>เพื่อปรับปรุงเว็บไซต์และประสบการณ์การใช้งาน (เมื่อได้รับความยินยอม)</li>
            <li>เพื่อปฏิบัติตามกฎหมายและป้องกันการทุจริต</li>
          </ul>
        </Section>

        <Section icon={Cookie} title="ประเภทคุกกี้ที่เราใช้">
          <p>เว็บไซต์นี้ใช้คุกกี้ 3 ประเภท คุณเลือกยินยอมแต่ละประเภทได้เอง (ยกเว้นคุกกี้ที่จำเป็น):</p>
          <div className="mt-2 grid grid-cols-1 gap-3">
            {COOKIE_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.title} className="flex items-start gap-3 rounded-2xl border border-border-default bg-bg-subtle p-4">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-text-muted">
                    <Icon size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-text-heading">{t.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{t.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p>
            เราจะบันทึกการตั้งค่าความยินยอมของคุณไว้เป็นเวลา {MAX_AGE_DAYS} วัน จากนั้นจะสอบถามใหม่อีกครั้ง
            คุณสามารถเปลี่ยนแปลงหรือเพิกถอนความยินยอมได้ทุกเมื่อ:
          </p>
          <CookieSettingsButton className="btn-secondary mt-1 w-full py-3 text-sm sm:w-auto sm:px-6" />
        </Section>

        <Section icon={UserCheck} title="สิทธิของเจ้าของข้อมูล">
          <p>ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล คุณมีสิทธิดังนี้:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            {RIGHTS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p>หากต้องการใช้สิทธิดังกล่าว โปรดติดต่อเราผ่านช่องทางด้านล่าง</p>
        </Section>

        <Section icon={ShieldCheck} title="การเก็บรักษาและความปลอดภัย">
          <p>
            เราเก็บรักษาข้อมูลของคุณเท่าที่จำเป็นตามวัตถุประสงค์ข้างต้นและตามที่กฎหมายกำหนด
            พร้อมมาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อป้องกันการเข้าถึง เปลี่ยนแปลง หรือเปิดเผยโดยไม่ได้รับอนุญาต
            เราจะไม่จำหน่ายข้อมูลส่วนบุคคลของคุณให้บุคคลภายนอกเพื่อวัตถุประสงค์ทางการตลาดโดยไม่ได้รับความยินยอม
          </p>
        </Section>

        <Section icon={Mail} title="ติดต่อเรา">
          <p>หากมีคำถามเกี่ยวกับนโยบายนี้ หรือต้องการใช้สิทธิเกี่ยวกับข้อมูลส่วนบุคคล ติดต่อได้ที่:</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={TEL_HREF} className="flex items-center gap-2.5 rounded-xl border border-border-default bg-white p-3 text-sm text-text-body transition-colors hover:border-yellow">
              <Phone size={18} className="text-yellow-hover" /> โทร {TEL}
            </a>
            <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-xl border border-border-default bg-white p-3 text-sm text-text-body transition-colors hover:border-yellow">
              <Mail size={18} className="text-line" /> ทักไลน์แอดมิน
            </a>
          </div>
        </Section>

        <p className="pt-2 text-center text-sm text-text-muted">
          กลับสู่ <Link href="/" className="font-medium text-yellow-hover hover:underline">หน้าหลัก</Link>
        </p>
      </section>
    </div>
  );
}
