import type { Metadata } from "next";
import { loadInvite } from "@/lib/reviews";
import ReviewInviteExperience from "@/components/reviews/ReviewInviteExperience";

interface Props { params: Promise<{ token: string }>; }

/**
 * การ์ดพรีวิวลิงก์ในแชท (LINE / Messenger / IG): ชวนรีวิวแบบกลาง ๆ ไม่มีชื่อลูกค้า · ห้าม index (ลิงก์ส่วนตัว)
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const r = await loadInvite(token);
  const product = r.kind === "ok" ? r.invite.productName : null;
  const title = "ให้คะแนนการซื้อของคุณ | DD Mobile";
  const description = product
    ? `รีวิวการซื้อ ${product} กับ DD Mobile · ใช้เวลาไม่ถึง 1 นาที ไม่ต้องสมัครสมาชิก`
    : "รีวิวการซื้อกับ DD Mobile · ใช้เวลาไม่ถึง 1 นาที ไม่ต้องสมัครสมาชิก";
  return { title, description, robots: { index: false, follow: false }, openGraph: { title, description, type: "website" } };
}

export default async function ReviewInvitePage({ params }: Props) {
  const { token } = await params;
  const r = await loadInvite(token);
  return <ReviewInviteExperience token={token} initial={r.kind === "ok" ? r.invite : null} />;
}
