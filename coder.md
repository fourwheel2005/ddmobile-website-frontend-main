# Coder Skill — หลักการเขียนโค้ดฉบับ Fable

> เป้าหมาย: เขียนโค้ดที่ **ถูกต้อง อ่านง่าย แก้ง่าย และไม่สร้างหนี้** — ตามลำดับความสำคัญนี้เสมอ

---

## 1. Mindset ก่อนเขียนโค้ด

### 1.1 เข้าใจปัญหาก่อนแตะคีย์บอร์ด
- อ่าน requirement แล้วถามตัวเอง: **input คืออะไร, output คืออะไร, edge case มีอะไรบ้าง**
- ถ้าอธิบายวิธีแก้เป็นภาษาคนไม่ได้ใน 2–3 ประโยค แปลว่ายังไม่เข้าใจปัญหา — อย่าเพิ่งเขียน
- แยก "สิ่งที่โจทย์ต้องการจริง" ออกจาก "สิ่งที่เราอยากทำเพิ่ม" (YAGNI — You Aren't Gonna Need It)

### 1.2 อ่านโค้ดเดิมก่อนเขียนโค้ดใหม่
- ก่อนเพิ่มฟีเจอร์ในโปรเจกต์เดิม ให้หา pattern ที่โค้ดเบสใช้อยู่แล้ว (การตั้งชื่อ, โครงสร้างโฟลเดอร์, วิธี handle error) แล้ว **เขียนให้กลมกลืน** ไม่ใช่เขียนตามสไตล์ตัวเอง
- หาว่ามี utility/helper ที่ทำสิ่งนี้อยู่แล้วหรือไม่ ก่อนเขียนซ้ำ (grep ก่อนเขียนเสมอ)

### 1.3 ทำงานเป็นรอบเล็ก ๆ
- เขียนทีละส่วนเล็ก → รัน/ทดสอบ → ค่อยไปต่อ อย่าเขียนยาว 300 บรรทัดแล้วค่อยรันครั้งแรก
- ทุกการเปลี่ยนแปลงควรอยู่ในสถานะ "รันผ่านได้" ให้บ่อยที่สุด

---

## 2. Logic & Problem Solving

### 2.1 ลำดับการคิด
1. **Restate** — เขียนโจทย์ใหม่ด้วยคำของตัวเอง
2. **Examples** — สร้างตัวอย่าง input/output อย่างน้อย 3 ชุด: กรณีปกติ, กรณีขอบ (empty, null, ค่าสุดขั้ว), กรณีผิดพลาด
3. **Brute force ก่อน** — คิดวิธีที่ตรงไปตรงมาที่สุดให้ได้ก่อน แล้วค่อย optimize
4. **Complexity** — ประเมิน Big-O ว่ารับได้ไหมกับขนาดข้อมูลจริง (n=100 กับ n=10 ล้าน ใช้วิธีต่างกัน)
5. **Implement → Verify** — เขียนแล้วไล่ trace ด้วยตัวอย่างจากข้อ 2

### 2.2 เทคนิคลด Logic ซับซ้อน
**Early return / Guard clause** — จัดการกรณีผิดปกติก่อน แล้วให้ happy path อยู่ระดับ indent น้อยสุด

```python
# ❌ Nested hell
def process(order):
    if order is not None:
        if order.items:
            if order.user.is_active:
                return do_work(order)

# ✅ Guard clauses
def process(order):
    if order is None:
        raise ValueError("order is required")
    if not order.items:
        return EmptyResult()
    if not order.user.is_active:
        raise InactiveUserError(order.user.id)
    return do_work(order)
```

**แทนที่ boolean flag ซ้อน ๆ ด้วย state ที่ชัดเจน**

```typescript
// ❌ 4 flags = 16 สถานะที่เป็นไปได้ แต่จริง ๆ มีแค่ 4
let isLoading, isError, isSuccess, isIdle;

// ✅ สถานะเดียว เป็นไปได้แค่ที่ประกาศ
type Status = 'idle' | 'loading' | 'success' | 'error';
```

**Make illegal states unrepresentable** — ออกแบบ type/โครงสร้างข้อมูลให้สถานะที่ผิดเขียนไม่ได้ตั้งแต่แรก ดีกว่ามาเช็ค runtime

**Table-driven แทน if-else ยาว ๆ**

```python
# ❌ if rank == "gold": discount = 0.2 elif rank == "silver": ...
# ✅
DISCOUNT = {"gold": 0.20, "silver": 0.10, "bronze": 0.05}
discount = DISCOUNT.get(rank, 0.0)
```

### 2.3 กับดัก Logic ที่พลาดบ่อย (เช็คทุกครั้ง)
- **Off-by-one**: ขอบเขต loop, slice, `<` vs `<=`, index เริ่ม 0 หรือ 1
- **Null/undefined/empty**: string ว่าง ≠ null ≠ ไม่มี key — แยกให้ชัดว่ากรณีไหนหมายถึงอะไร
- **Mutation โดยไม่ตั้งใจ**: ส่ง list/dict/object เข้า function แล้วโดนแก้ไข — ระวัง shared reference
- **Floating point**: ห้ามใช้ `==` กับ float, ห้ามใช้ float เก็บเงิน (ใช้ Decimal/integer สตางค์)
- **Timezone**: เก็บเวลาเป็น UTC เสมอ แปลงเป็น local เฉพาะตอนแสดงผล
- **Concurrency/race condition**: read-modify-write ที่ไม่ atomic, check-then-act (เช็คว่ามีไฟล์แล้วค่อยเปิด — ระหว่างนั้นไฟล์อาจหายไปแล้ว)
- **Integer overflow / division**: หารด้วยศูนย์, การหารจำนวนเต็มที่ปัดทิ้งเศษ

---

## 3. Clean Code

### 3.1 การตั้งชื่อ (สำคัญที่สุดใน clean code)
- ชื่อบอก **what/why** ไม่ใช่ **how**: `activeUsers` ดีกว่า `filteredList`
- ฟังก์ชันขึ้นต้นด้วย verb: `calculateTax()`, `fetchUser()`, `isValid()` (boolean ขึ้นต้น is/has/can/should)
- ความยาวชื่อแปรผันตาม scope: ตัวแปรใน loop 3 บรรทัดใช้ `i` ได้, ตัวแปร global ต้องชื่อเต็ม
- ห้ามใช้ชื่อโกหก: `getUser()` ที่จริง ๆ ไป create user ด้วย = บั๊กรอวันเกิด
- หน่วยใส่ในชื่อถ้าไม่มี type ช่วย: `timeoutMs`, `sizeKb`, `priceThb`

### 3.2 ฟังก์ชัน
- **ทำเรื่องเดียว** — ถ้าอธิบายฟังก์ชันต้องใช้คำว่า "และ" แปลว่าควรแยก
- สั้นพอที่อ่านจบในหน้าจอเดียว (~20–40 บรรทัด เป็น guideline ไม่ใช่กฎเหล็ก)
- พารามิเตอร์ ≤ 3 ตัว ถ้าเกินให้รวมเป็น object/struct
- **หลีกเลี่ยง boolean parameter**: `render(true)` อ่านไม่รู้เรื่อง → แยกเป็น `renderCompact()` / `renderFull()` หรือใช้ named argument
- แยก **pure function** (คำนวณอย่างเดียว ไม่มี side effect) ออกจากส่วนที่ยุ่งกับ I/O — pure function ทดสอบง่ายกว่ามาก

### 3.3 Comment
- Comment ที่ดีอธิบาย **why** ไม่ใช่ what — โค้ดบอก what อยู่แล้ว
- ✅ `// ใช้ retry 3 ครั้งเพราะ API ฝั่ง partner ล่มช่วงสั้น ๆ บ่อย (ตกลงกับทีมเขาแล้ว)`
- ❌ `// loop through items` (อ่านโค้ดก็รู้)
- ถ้าต้อง comment อธิบายว่าโค้ดทำอะไร → สัญญาณว่าควร refactor ให้โค้ดอ่านออกเอง
- ลบโค้ดที่ comment ทิ้งไว้ — git จำให้อยู่แล้ว

### 3.4 หลักการเชิงโครงสร้าง
- **DRY อย่างมีสติ**: duplicate 2 ที่ยังทนได้, 3 ที่ค่อย extract — abstraction ที่ผิดแพงกว่า duplication ("prefer duplication over the wrong abstraction")
- **KISS**: วิธีที่ง่ายที่สุดที่แก้ปัญหาได้ = วิธีที่ถูก
- **Single Level of Abstraction**: ในฟังก์ชันเดียว อย่าผสมโค้ด high-level (`processOrder()`) กับ low-level (`bytes[i] & 0xFF`)
- **Fail fast**: validate input ที่ขอบของระบบ (API boundary) แล้วข้างในเชื่อถือข้อมูลได้เลย ไม่ต้องเช็คซ้ำทุกชั้น
- ค่าคงที่ห้าม hardcode กระจาย: รวมเป็น named constant / config

---

## 4. Design Patterns & Architecture

### 4.1 SOLID แบบใช้งานจริง
| หลักการ | ความหมายภาคปฏิบัติ |
|---|---|
| **S**ingle Responsibility | ไฟล์/คลาสหนึ่งมี "เหตุผลที่จะถูกแก้" เพียงเหตุผลเดียว — ถ้าแก้เรื่อง UI แล้วต้องแตะไฟล์เดียวกับ business logic แปลว่าผิด |
| **O**pen/Closed | เพิ่มฟีเจอร์ใหม่โดย "เพิ่มโค้ด" ไม่ใช่ "แก้โค้ดเดิม" — ทำได้ผ่าน interface/strategy |
| **L**iskov Substitution | subclass ต้องใช้แทน parent ได้โดยพฤติกรรมไม่พัง — ถ้า override แล้วต้อง throw NotImplemented แปลว่า hierarchy ผิด |
| **I**nterface Segregation | interface เล็กหลายอันดีกว่าอันใหญ่อันเดียว — client ไม่ควรถูกบังคับ implement สิ่งที่ไม่ใช้ |
| **D**ependency Inversion | โค้ด business logic ขึ้นกับ interface ไม่ใช่ concrete class (DB, HTTP client) → เปลี่ยน infra ได้โดยไม่แตะ logic และ mock ง่ายตอนเทสต์ |

### 4.2 Patterns ที่ใช้บ่อยจริง (และเมื่อไหร่ควรใช้)
- **Strategy** — เมื่อมี algorithm หลายแบบสลับกันได้ (วิธีคิดค่าส่ง, วิธีจ่ายเงิน) → แทน if-else ยาว
- **Factory** — เมื่อการสร้าง object ซับซ้อนหรือต้องเลือก type ตอน runtime
- **Repository** — กั้นกลางระหว่าง business logic กับ database → เทสต์ logic ได้โดยไม่ต้องมี DB จริง
- **Adapter** — ห่อ library ภายนอกด้วย interface ของเราเอง → เปลี่ยน library ได้โดยแก้ที่เดียว
- **Observer / Event** — เมื่อ action หนึ่งต้อง trigger หลายอย่างที่ไม่ควรรู้จักกัน (ส่งอีเมล + log + update cache หลังสมัครสมาชิก)
- **Decorator/Middleware** — เพิ่ม behavior (logging, auth, retry) โดยไม่แก้ core logic

⚠️ **Anti-pattern ที่พบบ่อย**: ใช้ pattern เพราะอยากใช้ ไม่ใช่เพราะปัญหาต้องการ — โค้ด 50 บรรทัดไม่ต้องการ AbstractFactoryBuilderProvider

### 4.3 การจัดโครงสร้าง
- แบ่ง layer ให้ dependency ชี้ทิศเดียว: `UI → Application → Domain ← Infrastructure`
- **High cohesion, low coupling**: สิ่งที่เปลี่ยนด้วยกันควรอยู่ด้วยกัน, สิ่งที่ไม่เกี่ยวกันต้องไม่รู้จักกัน
- ตั้งคำถามก่อนเพิ่ม dependency ใหม่: เขียนเอง 30 บรรทัดได้ไหม? library นี้ maintain อยู่ไหม? ดึงมาแล้วพา dependency อื่นมากี่ตัว?

---

## 5. Error Handling

- **อย่ากลืน error เงียบ ๆ** — `catch (e) {}` คือบาปมหันต์ ถ้า handle ไม่ได้ให้โยนต่อพร้อม context
- Error message ต้องตอบ 3 อย่าง: **เกิดอะไร, กับข้อมูลไหน, ควรทำอะไรต่อ**
  - ❌ `Error: invalid input`
  - ✅ `OrderValidationError: quantity must be positive, got -3 (order_id=ORD-8812)`
- แยก error ที่ **คาดไว้** (user กรอกผิด → แสดงข้อความสวย ๆ) กับ **ไม่คาด** (bug → log เต็ม ๆ + alert)
- Wrap error พร้อมบริบทตอนข้าม layer: `raise PaymentError("charge failed") from e`
- **Retry อย่างมีสติ**: retry เฉพาะ transient error (timeout, 503) พร้อม exponential backoff + jitter และมีเพดาน — ห้าม retry error ที่ retry แล้วก็พังเหมือนเดิม (400, validation)
- ทำ operation ให้ **idempotent** เมื่อเป็นไปได้ → retry ปลอดภัย
- Resource ต้องถูกปิดเสมอ: ใช้ `with` / `try-finally` / `defer` / RAII

---

## 6. Performance (ตามลำดับที่ถูกต้อง)

1. **เขียนให้ถูกก่อน แล้วค่อยเร็ว** — "premature optimization is the root of all evil" แต่...
2. **อย่าเลือก O(n²) ทั้งที่ O(n) เขียนง่ายพอกัน** — เลือก data structure ให้ถูก (hash map สำหรับ lookup, set สำหรับ membership)
3. **Measure ก่อน optimize** — ใช้ profiler หา hotspot จริง อย่าเดา (ที่เดามักผิด)
4. จุดที่ช้าจริงในระบบส่วนใหญ่: **I/O และ N+1 query** ไม่ใช่ CPU
   - N+1: ดึง order 100 ตัว แล้ว loop query user ทีละตัว = 101 queries → ใช้ JOIN หรือ batch/`IN` query
   - เรียก API ใน loop → รวมเป็น batch หรือยิง concurrent
5. **Cache** เมื่อข้อมูลอ่านบ่อยเขียนน้อย — แต่จำไว้ว่า cache invalidation คือปัญหาที่ยากที่สุดปัญหาหนึ่ง กำหนด TTL และแผน invalidate ตั้งแต่วันแรก
6. Pagination ทุกอย่างที่ list ได้ — endpoint ที่ return ทั้งตารางคือระเบิดเวลา

---

## 7. Git & Workflow

- Commit เล็ก ๆ ที่มีธีมเดียว: "แก้บั๊ก X" ไม่ปนกับ "rename ตัวแปร 40 ไฟล์"
- Commit message: บรรทัดแรกสรุปว่าทำอะไร (imperative: "Add", "Fix"), body อธิบาย **ทำไม**
- แยก refactor commit ออกจาก behavior-change commit — reviewer จะขอบคุณ
- ก่อน push: รัน test + lint + ไล่อ่าน diff ของตัวเองหนึ่งรอบ (จะเจอ debug print และของหลงกดทุกครั้ง)
- Feature flag สำหรับของใหญ่ที่ยังไม่เสร็จ ดีกว่า branch ยาวเป็นเดือนที่ merge ทีเดียวนรกแตก

---

## 8. Checklist ก่อนถือว่า "เสร็จ"

```
□ ทำงานถูกกับกรณีปกติ (พิสูจน์ด้วยการรันจริง ไม่ใช่ "น่าจะได้")
□ จัดการ edge cases: empty, null, ค่าซ้ำ, ค่าสุดขั้ว, unicode/อีโมจิ
□ Error case ทุกจุดมี handling ที่ตั้งใจ (ไม่ใช่ปล่อยตาย)
□ ไม่มี hardcoded secret / path เครื่องตัวเอง / debug code หลงเหลือ
□ ชื่อทุกตัวอ่านแล้วเข้าใจโดยไม่ต้องเปิดดู implementation
□ มี test ครอบ behavior หลัก (ดู tester.md)
□ ผ่าน security checklist (ดู security.md)
□ อ่าน diff ตัวเองรอบสุดท้ายเหมือนเป็น reviewer คนอื่น
```
