# พนักงานได้สิทธิ์เท่าแอดมิน (ROLE_EMPLOYEE = ROLE_ADMIN)

> ไฟล์นี้มีเหมือนกันทั้ง 2 repo · เปลี่ยนเมื่อ 2026-10-17

## สถานะปัจจุบัน (ค่าเริ่มต้น = เปิด)

| จุด | ตอนเปิด (ตอนนี้) | ตอนปิด (แบบเดิม) |
|---|---|---|
| API `/api/v1/admin/**`, `/api/v1/products/**`, `/actuator/prometheus` | พนักงานเข้าได้เหมือนแอดมิน | 403 |
| action ราย permission (`/ops/**` · `@PreAuthorize`) | พนักงานได้ครบทั้ง 14 สิทธิ์ ไม่ต้องมอบทีละตัว | ได้เฉพาะที่มอบไว้ในตาราง `employee_permissions` |
| หลังล็อกอิน | พนักงานไปหน้า `/admin` | พนักงานไปหน้า `/employee` |
| Navbar | พนักงานเห็นทั้ง "หลังบ้าน" (`/admin`) และ "งานของฉัน" (`/employee`) | เห็นเฉพาะ "งานของฉัน" |

**ทำงานอย่างไร:** role ใน DB ของพนักงานยังเป็น `ROLE_EMPLOYEE` เหมือนเดิม (ไม่มี migration · ไม่แก้ข้อมูล) —
ตอนตรวจ token ทุกคำขอ `EmployeePermissionService` จะเติม authority `ROLE_ADMIN` + `PERM_*` ทั้งหมดให้พนักงาน
ทุก endpoint ที่ล็อกด้วย ROLE_ADMIN จึงเปิดให้พนักงานพร้อมกันโดยไม่ต้องแก้ทีละจุด ·
`/ops/me` และผลล็อกอินยังรายงาน role จริงเป็น `ROLE_EMPLOYEE` (ป้ายในหน้ารายชื่อพนักงานยังแยกได้)

**ยังเหมือนเดิม:**
- ลูกค้าเข้าหลังบ้านไม่ได้ (403) · ไม่ล็อกอิน = 401
- ลบบัญชีพนักงาน/ระงับ → token เดิมใช้ไม่ได้ทันที
- ลบบัญชีตัวเองไม่ได้
- คืนเงินแบบ maker–checker: คนขอกับคนอนุมัติต้องเป็นคนละคน (เช็กจากอีเมล ไม่ใช่ role)
- สิทธิ์รายตัวที่เคยมอบไว้ในตาราง `employee_permissions` ไม่ถูกลบ — ปิดสวิตช์แล้วกลับมาใช้ชุดเดิมทันที

**สิ่งที่ต้องรู้ (ความเสี่ยง):** พนักงานทุกคนทำได้ทุกอย่างที่แอดมินทำได้ — ดูข้อมูลลูกค้า/รูปบัตรประชาชน ·
อนุมัติ/คืนเงิน · แก้ราคา/โปรโมชัน · **สร้างบัญชีแอดมินใหม่ และลบบัญชีแอดมินคนอื่นได้** ·
บัญชีพนักงานที่ถูกยึดจึงมีผลเท่าบัญชีแอดมินที่ถูกยึด → ใช้รหัสผ่านแข็งแรง และลบบัญชีพนักงานที่ลาออกทันที

## ปิด (กลับไปใช้สิทธิ์รายตัวแบบเดิม — ไม่ต้องแก้โค้ด)

1. **Backend:** ตั้ง `EMPLOYEE_FULL_ADMIN=false` ใน `.env` + `docker-compose.yaml` บนเซิร์ฟเวอร์
   (ไฟล์ compose บนเซิร์ฟเวอร์ต้องมีบรรทัด `- EMPLOYEE_FULL_ADMIN=${EMPLOYEE_FULL_ADMIN:-true}` ด้วย ไม่งั้นค่าไม่เข้า container)
   แล้ว `docker compose up -d --force-recreate app` — มีผลทันทีกับ token ที่ออกไปแล้ว (แคชสิทธิ์ ≤ 60 วิ)
2. **Frontend (Vercel):** ตั้ง `NEXT_PUBLIC_EMPLOYEE_FULL_ADMIN=off` → **Redeploy** (ค่า NEXT_PUBLIC ฝังตอน build)

ลำดับไม่สำคัญด้านความปลอดภัย — backend ตัดสินสิทธิ์จริงเสมอ · ถ้าปิดแค่ backend พนักงานจะยังเห็นเมนู "หลังบ้าน"
แต่เปิดเข้าไปแล้วโหลดข้อมูลไม่ได้ (403) จนกว่าจะ redeploy หน้าเว็บ

เปิดกลับ: ลบ/ตั้ง `EMPLOYEE_FULL_ADMIN=true` และ `NEXT_PUBLIC_EMPLOYEE_FULL_ADMIN` (ไม่ตั้ง = เปิด) แล้วทำแบบเดียวกัน

## Revert โค้ดทั้งหมด (ปกติไม่จำเป็น)

tag `pre-employee-full-admin` (ก่อนเปลี่ยน) / `employee-full-admin-v1` (หลังเปลี่ยน) — ทำในแต่ละ repo:

```bash
git revert --no-commit employee-full-admin-v1
git checkout HEAD -- docs/rollback/employee-full-admin.md   # เก็บไฟล์บันทึกนี้ไว้
git commit -m "revert: employee full-admin access"
```

ไม่มี migration ฐานข้อมูลในการเปลี่ยนครั้งนี้

## ไฟล์ที่เปลี่ยน

- Backend: `service/EmployeePermissionService.java` (เติม authority) · `controller/OpsController.java` (`/ops/me` รายงาน role จริง) ·
  `application.yaml` (`app.staff.employee-full-admin`) · `docker-compose.yaml` · เทส `EmployeePermissionServiceTest`, `EmployeeFullAdminTest`,
  `OpsAuthorizationMatrixTest` (ตรึงเป็นโหมดสิทธิ์รายตัว)
- Frontend: `lib/roles.ts` (+ test) · `app/admin/page.tsx` · `app/login/page.tsx` · `app/employee/page.tsx` · `components/Navbar.tsx` · `components/EmployeeManager.tsx`
