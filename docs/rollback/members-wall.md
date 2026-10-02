# Rollback: กำแพงสมาชิก (Members-only wall)

> ไฟล์นี้มีเหมือนกันทั้ง 2 repo (frontend `ddmobile-website-frontend-main` และ backend `ddmobilewebsite`)

| | |
|---|---|
| วันที่เปลี่ยน | 2026-10-03 |
| Tag ก่อนเปลี่ยน (สถานะเดิม) | `pre-members-wall` — มีในทั้ง 2 repo |
| Tag หลังเปลี่ยน | `members-wall-v1` — มีในทั้ง 2 repo |
| Migration ใหม่ | `V45__user_terms_accepted.sql` (backend) — เพิ่มคอลัมน์อย่างเดียว |
| ทดสอบขั้นตอน rollback | 2026-10-03 — รันคำสั่งระดับ 2 ใน clone ทดลอง: revert ไม่ชน, โค้ดกลับตรง `pre-members-wall`, แอปเปิดกับ DB ที่รัน V45 แล้วได้ |

## เปลี่ยนอะไรไปบ้าง

**ก่อน:** ใครก็ดูสินค้า ราคา แผนผ่อนได้ · ขายเครื่อง/ผ่อนบอลลูนส่งได้โดยไม่ล็อกอิน · สมัครไม่บังคับบ้านเลขที่ · สมัครแล้วต้องล็อกอินซ้ำ

**หลัง:**
- เปิดสาธารณะเฉพาะ `/` `/login` `/privacy` `/contact` `/sell` `/trade-in` `/services` `/installments` และลิงก์ระบบ `/r/*` `/d/*`
- หน้าอื่นทั้งหมดต้องเป็นสมาชิก (allowlist) — ตัดสินที่ `proxy.ts` ก่อน render
- สมาชิกต้องมี ชื่อ + เบอร์ + ที่อยู่ครบ (รวมบ้านเลขที่) ไม่ครบ → `/profile?complete=1` (แอดมิน/พนักงานยกเว้น)
- สมัคร: บังคับที่อยู่ครบ + ติ๊กยอมรับนโยบาย (บันทึก `users.terms_accepted_at`) · สมัครแล้วล็อกอินให้ทันที
- ส่งคำขอบริการทุกแบบ (`POST /service-requests`, `POST /trade-in/requests`) ต้องล็อกอิน

**ไฟล์ที่เกี่ยวข้อง**
- Frontend: `proxy.ts`, `lib/accessGate.ts`, `lib/session.ts`, `lib/profile.ts`, `lib/api.ts`, `app/login/page.tsx`, `app/profile/page.tsx`, `components/service/ServiceRequestForm.tsx`, `components/Navbar.tsx`, `app/admin/page.tsx`
- Backend: `AuthController` (register → auto-login), `AuthService`, `RegisterRequestDto` (address + acceptTerms บังคับ), `AddressDto` (addressLine บังคับ), `ProfileDtos` (address บังคับ), `User.termsAcceptedAt`, `ServiceRequestService` + `SecurityConfig` (คำขอบริการต้องล็อกอิน), `V45__user_terms_accepted.sql`

---

## ระดับ 1 — ปิดกำแพงฉุกเฉิน (ไม่แตะโค้ด, ~2–3 นาที)

ใช้เมื่อ: ยอดคนเข้าดูสินค้าตกมาก / โฆษณาเสียเปล่า / อยากลองปิดชั่วคราว

1. Vercel → Project → Settings → Environment Variables → เพิ่ม `NEXT_PUBLIC_MEMBERS_WALL` = `off` (Production)
2. Deployments → **Redeploy** (จำเป็น — ค่าถูกฝังตอน build)
3. ตรวจ: เปิด `/products` แบบไม่ล็อกอิน ต้องเห็นรายการสินค้า

ผล: ดูสินค้า/ราคา/แผนผ่อนได้อิสระเหมือนเดิม · **การทำรายการยังต้องเป็นสมาชิก** (ชำระเงิน, ส่งคำขอขาย/ผ่อน/บอลลูน) · การสมัครยังบังคับที่อยู่ + ยอมรับนโยบาย
เปิดกำแพงกลับ: ลบตัวแปรนี้ (หรือตั้งค่าอื่นที่ไม่ใช่ `off`) แล้ว Redeploy

## ระดับ 2 — ย้อนโค้ดทั้งหมดกลับแบบเดิม

⚠️ **ลำดับสำคัญ: backend ก่อน แล้วค่อย frontend** (ตรงข้ามกับตอน deploy)
เพราะหน้าเว็บตัวเก่าไม่ส่งช่องยอมรับนโยบาย ถ้า backend ใหม่ยังอยู่ ลูกค้าจะสมัครสมาชิกไม่ได้

⚠️ **เก็บไฟล์ `V45__user_terms_accepted.sql` ไว้เสมอ (อย่าลบ)** — ฐานข้อมูลบันทึกว่ารัน V45 แล้ว
- ทดสอบจริงแล้ว (2026-10-03): ถ้าลบ แอป **ยังเปิดได้** แต่ Flyway เตือน "Schema has a version (45) that is newer than the latest available migration (44)"
- อันตรายจริงคือ**ภายหลัง**: ถ้ามีคนสร้าง migration ใหม่ชื่อ `V45__...` (เพราะไฟล์ล่าสุดในโค้ดเหลือ V44) จะชนกับ V45 ที่รันไปแล้ว → ตอนนั้นแอปเปิดไม่ขึ้น
- คอลัมน์ `terms_accepted_at` ปล่อยไว้ได้ ไม่กระทบอะไร และเป็นหลักฐานความยินยอม (PDPA) ของคนที่สมัครช่วงนี้

⚠️ **ห้าม `git reset --hard` แล้ว force push บน main** — จะลบ commit อื่นที่ตามมาทีหลังทิ้ง ใช้ `git revert` เท่านั้น

> ระหว่าง `git revert` จะเห็น `CONFLICT (modify/delete): docs/rollback/members-wall.md` — **ปกติ ไม่ต้องตกใจ**
> (บันทึกนี้ถูกแก้หลัง tag) คำสั่ง `git checkout HEAD -- ...` บรรทัดถัดไปแก้ให้ แล้ว commit ต่อได้เลย

### 2.1 Backend (`ddmobilewebsite`)
```bash
git checkout main && git pull
git revert --no-commit members-wall-v1
# เก็บ migration V45 + บันทึกนี้ (ฉบับล่าสุดบน main) ไว้ — ถ้า revert แจ้ง conflict ที่ 2 ไฟล์นี้ คำสั่งนี้แก้ให้เลย
git checkout HEAD -- src/main/resources/db/migration/V45__user_terms_accepted.sql docs/rollback/members-wall.md
git commit -m "revert: members-only wall (keep V45 migration + rollback notes)"
git push origin main
```
รอ image ใหม่ deploy แล้วตรวจ: `curl -s https://ddmobilewebsite.fourwheel.in.th/actuator/health` ต้อง `UP`

### 2.2 Frontend (`ddmobile-website-frontend-main`) — หลัง backend ขึ้นแล้ว
```bash
git checkout main && git pull
git revert --no-commit members-wall-v1
git checkout HEAD -- docs/rollback/members-wall.md
git commit -m "revert: members-only wall (keep rollback notes)"
git push origin main
```
แล้วลบ env `NEXT_PUBLIC_MEMBERS_WALL` บน Vercel (ถ้าเคยตั้ง)

> ถ้ามี commit อื่นแก้ไฟล์เดียวกันหลัง `members-wall-v1` แล้ว `git revert` ชน (conflict) — แก้ให้ได้ผลแบบก่อนมีกำแพง
> โดยเทียบกับ tag `pre-members-wall` (`git diff pre-members-wall -- <ไฟล์>`)

### 2.3 ตรวจหลัง rollback
- [ ] เปิด `/products` และหน้าเครื่องแบบไม่ล็อกอินได้
- [ ] สมัครสมาชิกใหม่ได้ (ไม่บังคับบ้านเลขที่/ติ๊กยอมรับ — กลับเป็นแบบเดิม)
- [ ] ส่งคำขอขายเครื่อง/ผ่อนบอลลูนแบบไม่ล็อกอินได้
- [ ] ล็อกอิน → ชำระเงิน → คำสั่งซื้อ ทำงานปกติ
- [ ] `/r/<token>` (ลิงก์ดูรูปจากแชท LINE) และ LINE webhook ยังทำงาน (ไม่เกี่ยวกับกำแพง)

## ข้อมูลที่เกิดขึ้นระหว่างมีกำแพง
- บัญชีที่สมัครช่วงนี้ + ที่อยู่ + เวลายอมรับนโยบาย **ยังอยู่ครบ** หลัง rollback (ไม่มีข้อมูลหาย)
- cookie `dd_session` ที่ค้างในเบราว์เซอร์ลูกค้าไม่มีผลหลัง rollback (ไม่มีโค้ดอ่าน) และหมดอายุเองใน 14 วัน
