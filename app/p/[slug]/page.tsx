import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CampaignLanding from "@/components/campaign/CampaignLanding";
import { loadPublicCampaign, mediaById } from "@/lib/campaign";

interface Props { params: Promise<{ slug: string }>; }

/** การ์ดพรีวิวลิงก์ (Facebook / LINE): ชื่อหน้า + คำอธิบาย + ปกคลิป/รูปส่วนบนสุด */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPublicCampaign(slug);
  if (!page) return { title: "ไม่พบหน้านี้ | DD Mobile", robots: { index: false } };
  const title = `${page.title} | DD Mobile`;
  const description = page.description ?? page.content.hero?.subheadline ?? undefined;
  const heroId = page.content.hero?.mediaId;
  const hero = heroId != null ? mediaById(page.media).get(heroId) : undefined;
  const image = hero ? (hero.kind === "VIDEO" ? hero.posterUrl : hero.url) : null;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", ...(image ? { images: [{ url: image, width: hero!.width, height: hero!.height }] } : {}) },
  };
}

/** หน้า Landing สำหรับยิงแอด — สร้าง/แก้ในหลังบ้าน (เมนู "หน้า Landing ยิงแอด") · ยังไม่เผยแพร่ = 404 */
export default async function CampaignPage({ params }: Props) {
  const { slug } = await params;
  const page = await loadPublicCampaign(slug);
  if (!page) notFound();
  return <CampaignLanding title={page.title} content={page.content} media={page.media} />;
}
