# Security Skill — ความปลอดภัยของโค้ดฉบับ Fable

> หลักใหญ่ 3 ข้อ: **อย่าเชื่อ input จากภายนอก**, **ให้สิทธิ์น้อยที่สุดที่พอทำงาน (least privilege)**, **ป้องกันหลายชั้น (defense in depth)** — เพราะชั้นเดียวพังได้เสมอ

---

## 1. Input Validation & Injection (ต้นตอช่องโหว่อันดับหนึ่ง)

### 1.1 กฎเหล็ก
- **ทุก input จากนอกระบบคือของไม่น่าไว้ใจ**: form, query string, header, cookie, ไฟล์อัปโหลด, ข้อมูลจาก API partner, แม้แต่ค่าจาก DB ที่ user เคยกรอก
- Validate แบบ **allowlist** (บอกว่าอะไรรับได้) ไม่ใช่ blocklist (บอกว่าอะไรห้าม — จะมีคนหาทางเลี่ยงได้เสมอ)
- Validate ที่ **ฝั่ง server เสมอ** — client-side validation เป็นแค่ UX ไม่ใช่ security

### 1.2 SQL Injection
```python
# ❌ อันตราย — string concatenation/format
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")

# ✅ Parameterized query เท่านั้น
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
```
- ใช้ ORM/query builder ก็ยังพลาดได้ถ้าใช้ raw fragment: ระวัง `.raw()`, `text()`, `$where`
- ชื่อตาราง/คอลัมน์ parameterize ไม่ได้ → ต้องเช็คกับ allowlist ของชื่อที่รู้จักเท่านั้น

### 1.3 Command Injection
```python
# ❌ os.system(f"convert {filename} out.png")
# ✅ ส่งเป็น argument list ไม่ผ่าน shell
subprocess.run(["convert", filename, "out.png"], shell=False)
```
- หลีกเลี่ยง `shell=True` / backtick / `eval` / `exec` กับข้อมูลที่มาจาก user เด็ดขาด

### 1.4 Path Traversal
```python
# ❌ open(f"uploads/{filename}")  → filename = "../../etc/passwd"
# ✅
base = Path("uploads").resolve()
target = (base / filename).resolve()
if not target.is_relative_to(base):
    raise SecurityError("path traversal attempt")
```

### 1.5 XSS (Cross-Site Scripting)
- Escape output ตาม **context**: HTML body, attribute, JS, URL — คนละวิธี escape
- ใช้ template engine ที่ auto-escape (React JSX, Jinja2 autoescape) และ **อย่า** ใช้ `dangerouslySetInnerHTML` / `innerHTML` / `v-html` กับข้อมูล user เว้นแต่ผ่าน sanitizer (DOMPurify)
- ตั้ง **Content-Security-Policy** header เป็นตาข่ายชั้นสอง
- Cookie สำคัญ: `HttpOnly; Secure; SameSite=Lax` เป็นอย่างน้อย

### 1.6 อื่น ๆ ที่พลาดบ่อย
- **SSRF**: server ไป fetch URL ที่ user ส่งมา → บล็อก internal IP (169.254.x, 10.x, 127.x, metadata endpoint ของ cloud) และ resolve DNS แล้วเช็คซ้ำ
- **Deserialization**: ห้าม `pickle.loads` / `yaml.load` (ใช้ `yaml.safe_load`) / Java deserialization กับข้อมูลไม่น่าไว้ใจ — คือ remote code execution ดี ๆ นี่เอง
- **File upload**: เช็ค type จาก content จริง (magic bytes) ไม่ใช่นามสกุลไฟล์, จำกัดขนาด, เก็บนอก webroot, ตั้งชื่อใหม่เอง (อย่าใช้ชื่อจาก user), เสิร์ฟผ่าน domain แยกถ้าทำได้
- **ReDoS**: regex ที่มี nested quantifier (`(a+)+`) กับ input ยาว ๆ ทำ CPU ค้าง — ระวัง regex ที่รับ input จาก user
- **XXE**: ปิด external entity ใน XML parser (`defusedxml` ใน Python)
- **Prototype pollution (JS)**: ระวัง `Object.assign`/merge ลึก ๆ กับ JSON จาก user — เช็ค key `__proto__`, `constructor`

---

## 2. Authentication & Authorization

### 2.1 Password
- Hash ด้วย **bcrypt / argon2 / scrypt** เท่านั้น — MD5, SHA-1, SHA-256 เพียว ๆ ใช้ไม่ได้ (เร็วเกิน = brute force ง่าย)
- อย่า implement crypto เอง อย่าคิด scheme เอง — ใช้ library มาตรฐาน
- Rate limit + lockout ที่หน้า login, ใช้ generic error ("email หรือรหัสผ่านไม่ถูกต้อง") — อย่าบอกว่า email มีในระบบ (user enumeration)
- Compare secret ด้วย **constant-time comparison** (`hmac.compare_digest`) กัน timing attack

### 2.2 Session & Token
- Session ID สร้างจาก CSPRNG (`secrets` module ไม่ใช่ `random`), regenerate หลัง login, invalidate ตอน logout ที่ฝั่ง server จริง ๆ
- **JWT**: ตรวจ signature เสมอ, ระบุ algorithm ที่รับ (**ปฏิเสธ `alg: none`**), ตรวจ `exp`/`aud`/`iss`, อายุสั้น + refresh token, เก็บให้พ้น XSS (HttpOnly cookie ดีกว่า localStorage)
- CSRF: ใช้ SameSite cookie + CSRF token สำหรับ state-changing request

### 2.3 Authorization (จุดที่พังบ่อยกว่า authentication)
- **IDOR / Broken Object Level Auth** — ช่องโหว่ยอดฮิตอันดับ 1 ของ API:
```python
# ❌ ใครก็ตามที่ login แล้วดู order ของคนอื่นได้แค่เปลี่ยนเลข id
order = db.get_order(order_id)

# ✅ เช็คความเป็นเจ้าของทุกครั้งที่แตะ resource
order = db.get_order(order_id)
if order.user_id != current_user.id:
    raise Forbidden()   # หรือ 404 เพื่อไม่เผยว่า id มีอยู่จริง
```
- เช็ค permission ที่ **server ทุก endpoint ทุก method** — การซ่อนปุ่มใน UI ไม่ใช่การกันสิทธิ์
- Default = deny: ถ้า logic ตัดสินไม่ได้ว่าอนุญาต ให้ปฏิเสธ
- อย่าลืม endpoint รอง: export, bulk API, webhook, GraphQL resolver, endpoint เก่าที่ลืมปิด

---

## 3. Secrets & ข้อมูลอ่อนไหว

- **ห้าม hardcode secret ในโค้ด/commit ลง git เด็ดขาด** — ใช้ env var / secret manager (Vault, AWS Secrets Manager)
- ถ้า secret เคยหลุดลง git แล้ว: **rotate ทันที** — การลบ commit ไม่พอ (history + fork + clone ยังอยู่)
- `.env` ต้องอยู่ใน `.gitignore` และมี `.env.example` (ค่า dummy) ให้เพื่อนร่วมทีม
- **Log อย่างระวัง**: ห้าม log password, token, เลขบัตร, ข้อมูลส่วนบุคคล — วาง redact/masking ที่ logger กลาง
- Error response ฝั่ง production: ห้ามส่ง stack trace / query / path ภายในกลับไปหา user — log เต็มไว้ฝั่ง server แล้วส่ง error id กลับไปพอ
- เข้ารหัสข้อมูลอ่อนไหว at-rest และ in-transit (TLS ทุกอย่าง รวมถึง service-to-service ภายใน)
- HTTP client ห้ามปิด TLS verification (`verify=False`, `rejectUnauthorized: false`) — เจอในโค้ดจริงบ่อยจนน่ากลัว

---

## 4. Dependency & Supply Chain

- รัน audit เป็นประจำ + ใน CI: `npm audit`, `pip-audit`, `cargo audit`, Dependabot/Renovate
- **Pin version + lockfile commit เสมอ** — build ต้อง reproducible
- ก่อนเพิ่ม dependency: ดาวน์โหลดเยอะไหม? maintain อยู่ไหม? typo-squatting ไหม (ชื่อคล้าย package ดัง)? ต้องการจริงไหม?
- ระวัง `postinstall` script ของ npm package — คือโค้ดที่รันบนเครื่องคุณทันทีที่ install
- Docker: ใช้ official/slim base image, อย่ารัน container เป็น root, scan image (trivy)

---

## 5. API & Web Security Hardening

```
□ Rate limiting ทุก endpoint (โดยเฉพาะ login, OTP, search, อะไรที่แพง)
□ Request size limit + timeout ทุกชั้น
□ Pagination บังคับ — ห้ามมี endpoint ที่ dump ทั้งตารางได้
□ Mass assignment: รับเฉพาะ field ที่อนุญาต (explicit DTO/schema)
   — อย่า bind request body เข้า model ตรง ๆ (user ส่ง "is_admin": true มาได้)
□ HTTP headers: CSP, X-Content-Type-Options: nosniff,
   X-Frame-Options/frame-ancestors, HSTS
□ CORS: ระบุ origin ชัดเจน — ห้าม `*` คู่กับ credentials
□ ปิด debug mode / stack trace / directory listing ใน production
□ Webhook ที่รับเข้า: verify signature (HMAC) ก่อนเชื่อ payload
□ การเทียบ id: ระวัง type juggling ("1" == 1) ในภาษา dynamic
```

---

## 6. ตัวอย่าง Code Review มุมมอง Security

เวลาอ่านโค้ด (ตัวเองหรือคนอื่น) ให้ถามคำถามเหล่านี้กับ **ทุกบรรทัดที่แตะข้อมูลภายนอก**:

1. ข้อมูลนี้มาจากไหน? user ควบคุมมันได้ไหม (แม้ทางอ้อม)?
2. มันไปจบที่ไหน? (SQL → injection, HTML → XSS, shell → command injection, path → traversal, URL ที่ server ไป fetch → SSRF)
3. ใครเรียก endpoint นี้ได้? เช็ค authentication แล้ว เช็ค **authorization ระดับ object** หรือยัง?
4. ถ้าส่งค่านี้มา 1 ล้านครั้งใน 1 นาทีจะเกิดอะไรขึ้น?
5. ถ้าค่านี้ยาว 10MB / เป็นค่าลบ / เป็น unicode ประหลาด จะเกิดอะไรขึ้น?
6. Secret หรือข้อมูลส่วนตัวรั่วออกทาง log / error / response ได้ไหม?

---

## 7. Checklist ก่อน Deploy

```
□ ไม่มี secret ใน code, config ที่ commit, log, หรือ error message
□ ทุก query เป็น parameterized / ทุก output ถูก escape ตาม context
□ ทุก endpoint เช็ค authn + authz ระดับ object
□ Input validation แบบ allowlist ที่ boundary ฝั่ง server
□ Dependencies ผ่าน audit, lockfile ล่าสุด commit แล้ว
□ Rate limit + size limit + timeout ครบ
□ TLS ทุกการเชื่อมต่อ, security headers ครบ, debug mode ปิด
□ Log มี redaction, มี audit trail สำหรับ action สำคัญ
□ มีแผน rotate secret และแผน revoke session/token กรณีหลุด
```

> เมื่อสงสัยว่าอะไรคือมาตรฐานปัจจุบัน: อ้างอิง **OWASP Top 10**, **OWASP ASVS**, และ **OWASP Cheat Sheet Series** — เป็นแหล่งที่อัปเดตและใช้เป็น checklist ได้จริง
