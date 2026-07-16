# Tester Skill — หลักการทดสอบฉบับ Fable

> เป้าหมาย: test ที่ **จับบั๊กจริงได้ ไม่เปราะ และอ่านเป็นเอกสารของระบบได้** — test ที่ผ่านตลอดแต่ไม่เคยจับอะไรได้คือภาระ ไม่ใช่ทรัพย์สิน

---

## 1. หลักคิดพื้นฐาน

### 1.1 Test พฤติกรรม ไม่ใช่ implementation
- ถาม: "ถ้า refactor ภายในโดยพฤติกรรมไม่เปลี่ยน test ควรผ่านไหม?" → ต้องผ่าน
- test ที่ assert ว่า "เรียก method X 3 ครั้ง" มักเปราะ — assert ที่ **ผลลัพธ์** แทน
- Mock ให้น้อยที่สุดเท่าที่จำเป็น: mock เฉพาะขอบระบบ (network, DB, เวลา, random) อย่า mock โค้ดตัวเอง

### 1.2 Test Pyramid (แบบยืดหยุ่น)
```
        /  E2E  \        น้อย: ช้า แพง เปราะ — เฉพาะ critical flow (สมัคร, จ่ายเงิน)
       / Integr. \       กลาง: ทดสอบชิ้นส่วนต่อกันจริง (API + DB จริงใน container)
      /   Unit    \      มาก: เร็ว เจาะ logic ทุกกิ่ง — รันได้ในไม่กี่วินาที
```
- Logic ล้วน ๆ → unit test ให้หนัก
- โค้ดที่งานหลักคือ "ต่อของเข้าด้วยกัน" (CRUD API) → integration test คุ้มกว่า unit ที่ mock ทุกอย่างจนไม่เหลืออะไรให้เทสต์

### 1.3 เขียน test เมื่อไหร่
- **เจอบั๊ก → เขียน test ที่ reproduce บั๊กก่อนแก้เสมอ** (เห็นมันแดง → แก้ → เห็นมันเขียว) นี่คือ test ที่คุ้มค่าที่สุด เพราะพิสูจน์แล้วว่าจับบั๊กจริงได้
- Logic ซับซ้อน/เงื่อนไขเยอะ → เขียน test ก่อนหรือระหว่างเขียนโค้ด (TDD ช่วยออกแบบ API ให้ใช้ง่ายด้วย)
- **Test ต้องเคย fail ให้เห็น**: test ที่เขียนหลังโค้ดแล้วเขียวทันที ให้ลอง break โค้ดชั่วคราวเพื่อยืนยันว่ามันแดงจริง — ไม่งั้นอาจกำลัง test อากาศ

---

## 2. โครงสร้าง Test ที่ดี

### 2.1 AAA Pattern
```python
def test_expired_coupon_is_rejected():
    # Arrange — จัดฉาก
    coupon = make_coupon(expires_at=YESTERDAY)
    cart = make_cart(total=500)

    # Act — ทำสิ่งเดียวที่กำลังทดสอบ
    result = apply_coupon(cart, coupon)

    # Assert — ตรวจผล
    assert result.discount == 0
    assert result.error == CouponError.EXPIRED
```

### 2.2 กฎการเขียน
- **ชื่อ test = ประโยคบอกพฤติกรรม**: `test_expired_coupon_is_rejected` ไม่ใช่ `test_coupon_2` — เวลา fail ต้องรู้ทันทีว่าระบบผิดสัญญาข้อไหน
- **หนึ่ง test หนึ่งพฤติกรรม** — fail แล้วชี้จุดได้เลย ไม่ต้องไล่ debug ตัว test
- **Test แต่ละตัวอิสระต่อกัน**: รันเดี่ยวได้ รันสลับลำดับได้ รัน parallel ได้ — ห้ามพึ่ง state จาก test ก่อนหน้า
- **Deterministic**: ตรึง random seed, freeze เวลา (`freezegun`, fake clock), ห้ามพึ่ง network จริงหรือ sleep เดา ๆ
- ใช้ **test data builder / factory** ให้แต่ละ test ระบุเฉพาะ field ที่เกี่ยวข้อง: `make_user(age=17)` — field อื่นเป็น default ที่ valid
- Assert message ให้มีบริบท และเลือก assertion ที่ diff สวย (`assertEqual` ทั้ง object ดีกว่าเช็คทีละ field 10 บรรทัด)

### 2.3 กลิ่นเหม็นของ test (test smells)
- Test ที่มี `if/else` หรือ loop logic ซับซ้อน → ใครจะ test ตัว test?
- Test ที่ sleep รอ → เปลี่ยนเป็น polling with timeout หรือ inject fake clock
- Test ที่ต้องรันตามลำดับ → shared state รั่ว
- Test เขียวตลอดชีวิต ไม่เคยแดงแม้โค้ดพัง → ลบหรือเขียนใหม่
- Flaky test → **ห้าม retry จนกว่าจะเขียว** ให้หา root cause: 90% คือ race condition, เวลา, หรือ shared state

---

## 3. เลือก Test Case ยังไงให้ครอบคลุม

### 3.1 Equivalence Partitioning + Boundary Value
แบ่ง input เป็นกลุ่มที่พฤติกรรมเหมือนกัน แล้วเทสต์ **ตัวแทนของกลุ่ม + ค่าตรงขอบ**

ตัวอย่าง: ส่วนลดสำหรับอายุ 18–60 ปี
- กลุ่ม: ต่ำกว่า 18 / 18–60 / เกิน 60
- ค่าที่ต้องเทสต์: `17, 18, 19, 59, 60, 61` + ค่าประหลาด: `0, -1, 150, None`

### 3.2 Checklist edge case มาตรฐาน (ท่องให้ขึ้นใจ)
```
□ Empty: "", [], {}, 0 รายการ
□ None/null/undefined ในทุก field ที่ optional
□ หนึ่งรายการ (n=1) — off-by-one ชอบตายตรงนี้
□ ค่าซ้ำ / ข้อมูล duplicate
□ ค่าสุดขั้ว: 0, -1, MAX_INT, string ยาวมาก, ไฟล์ 0 byte
□ Unicode: ภาษาไทย, อีโมจิ 👨‍👩‍👧‍👦 (grapheme หลาย codepoint), RTL text
□ Whitespace: ช่องว่างนำ/ตาม, string ที่มีแต่ space
□ ลำดับผิดคาด: ข้อมูลมาไม่เรียง, event มาสลับลำดับ, callback มาก่อน setup เสร็จ
□ เวลา: ข้ามเที่ยงคืน, ข้ามปี, timezone, DST, 29 ก.พ.
□ Concurrent: เรียกพร้อมกัน 2 ครั้ง, double-submit, double-click
□ Failure ระหว่างทาง: network ตายกลาง operation, disk เต็ม, process โดน kill
```

### 3.3 Error path สำคัญเท่า happy path
ทุก `throw`/`raise`/error branch ในโค้ดควรมี test ยืนยันว่า:
1. มัน throw จริงเมื่อควร throw
2. error type/message ถูกต้อง
3. ระบบอยู่ในสถานะดี (ไม่มี partial write, resource ถูกปิด, transaction rollback)

### 3.4 Property-based testing (อาวุธลับ)
แทนที่จะคิด case เอง ให้เครื่องสุ่มพัน ๆ case แล้ว assert คุณสมบัติที่ต้องจริงเสมอ:
```python
# Hypothesis (Python) / fast-check (JS/TS)
@given(st.lists(st.integers()))
def test_sort_properties(xs):
    result = my_sort(xs)
    assert len(result) == len(xs)                    # ไม่ทำของหาย
    assert all(a <= b for a, b in zip(result, result[1:]))  # เรียงจริง
    assert sorted(xs) == result                      # เทียบกับ reference
```
เหมาะกับ: parser, serializer (`decode(encode(x)) == x`), การคำนวณเงิน, อะไรก็ตามที่มี invariant

---

## 4. เทคนิคจัดการ Dependency

### 4.1 ลำดับความน่าเชื่อถือ (เลือกบนสุดที่ทำได้)
1. **ของจริงใน container** — DB จริงผ่าน Testcontainers/docker-compose → มั่นใจสุด
2. **Fake** — in-memory implementation ที่ทำตัวเหมือนจริง (in-memory repository, fake filesystem)
3. **Stub** — return ค่าที่กำหนดตายตัว ใช้จัดฉาก
4. **Mock (verify การเรียก)** — ใช้เฉพาะเมื่อ "การเรียก" คือพฤติกรรมที่ต้องการเทสต์จริง ๆ (เช่น "ต้องส่งอีเมลหา user")

### 4.2 Design for testability
- Inject dependency ผ่าน constructor/parameter — โค้ดที่ `new Database()` ข้างในตัวเองเทสต์ยาก
- แยก logic ออกจาก I/O: ฟังก์ชัน `calculate(data)` ที่ pure เทสต์ง่ายกว่า `calculateFromDb()` ร้อยเท่า
- เวลา/random ให้ inject: `def is_expired(coupon, now: datetime)` แทนการเรียก `datetime.now()` ข้างใน
- ถ้าโค้ดเทสต์ยากมาก มักแปลว่า **design มีปัญหา** ไม่ใช่ต้องการ mock framework ที่เก่งขึ้น

---

## 5. Integration & E2E

- Integration test: ใช้ DB/queue จริงใน container, reset state ทุก test (transaction rollback หรือ truncate)
- ทดสอบที่ **API boundary**: ยิง HTTP จริง เช็ค status code + response body + side effect ใน DB
- ทดสอบ contract กับ service ภายนอกด้วย recorded response (VCR/nock) + contract test — อย่ายิง production ของคนอื่นใน CI
- E2E: เลือกเฉพาะ user journey ที่ถ้าพังแล้วธุรกิจเสียหาย (login, checkout, จ่ายเงิน) — ทุก flow ย่อยลงไปให้ integration/unit จัดการ
- E2E selector ใช้ `data-testid` หรือ role/label — อย่าใช้ CSS class ที่เปลี่ยนตาม styling

---

## 6. Coverage & คุณภาพของชุด test

- Coverage คือ **เครื่องมือหา blind spot** ไม่ใช่ KPI — 100% coverage ที่ assert อ่อน ๆ แย่กว่า 75% ที่ assert เข้ม
- ดู **branch coverage** ไม่ใช่แค่ line coverage
- จุดที่ต้องครอบให้หนา: เงินทอง, permission/auth, การคำนวณ, state machine, parser
- จุดที่ปล่อยได้: glue code ตรงไปตรงมา, generated code, config
- **Mutation testing** (mutmut, Stryker) = ตัววัดคุณภาพจริง: เครื่องแอบแก้โค้ด (`>` → `>=`) แล้วดูว่า test จับได้ไหม — ถ้า mutant รอด แปลว่า test หลอกตัวเอง

---

## 7. เมื่อ Test Fail — วินัยในการอ่าน

1. **อ่าน error message จริง ๆ ทั้งอัน** — คำตอบมักอยู่ในนั้นแล้ว
2. Fail เพราะโค้ดผิด หรือ test ผิด หรือ expectation เปลี่ยน? — อย่ารีบแก้ test ให้ผ่าน ถามก่อนว่า test พูดถูกไหม
3. **ห้ามแก้ test ให้อ่อนลงเพื่อให้ผ่าน** (ลบ assert, เพิ่ม try/except, skip) — นั่นคือการซ่อนบั๊ก ไม่ใช่แก้บั๊ก
4. Reproduce ให้ได้ก่อนแก้ — แก้สิ่งที่ reproduce ไม่ได้ = เดา
5. รันเฉพาะ test ที่ fail ให้รอบเร็วขึ้น (`pytest -k`, `--lf`) แล้วค่อยรันทั้งชุดปิดท้าย

---

## 8. Checklist ชุด test ที่ดี

```
□ รันทั้งชุดเร็วพอที่จะรันก่อน commit ทุกครั้ง (unit ควรจบเป็นวินาที)
□ รันซ้ำ 10 รอบผลเหมือนเดิม (deterministic, ไม่ flaky)
□ ทุก test เคยเห็นมันแดงมาก่อน (พิสูจน์ว่าจับของจริงได้)
□ ชื่อ test อ่านเรียงกันแล้วเหมือน spec ของระบบ
□ ครอบ happy path + error path + edge cases จาก checklist ข้อ 3.2
□ ไม่มี test ที่ผูกกับ implementation detail จน refactor ไม่ได้
□ Test ใหม่ทุกตัวสำหรับบั๊กทุกตัวที่เคยเจอ (regression suite โตตามแผลจริง)
```
