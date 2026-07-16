# React Skill — ฉบับ Fable

> ต่อยอดจาก [coder.md](coder.md) — หลักใหญ่ของ React: **UI คือฟังก์ชันของ state** — จัดการ state ให้ถูก แล้ว UI จะถูกเอง

---

## 1. Component Design

### 1.1 กฎการแตก component
- แตกตาม **ความรับผิดชอบ** ไม่ใช่ตามขนาด — component 200 บรรทัดที่ทำเรื่องเดียวดีกว่า 5 ชิ้นที่ผูกกันมั่ว
- แยก 2 ประเภทในหัวเสมอ:
  - **Container** — ดึงข้อมูล, ถือ state, ตัดสินใจ
  - **Presentational** — รับ props → render อย่างเดียว (pure, test ง่าย, reuse ได้)
- Component ควร **ไม่รู้** ว่าตัวเองถูกใช้ที่ไหน — รับทุกอย่างผ่าน props/context ไม่ hardcode ความรู้เรื่องหน้าอื่น

### 1.2 Props
- ใช้ TypeScript เสมอ — interface ของ props คือเอกสารของ component
```tsx
interface OrderCardProps {
  order: Order;
  onCancel: (orderId: string) => void;
  variant?: 'compact' | 'full';   // union type แทน boolean flag
}
```
- **หลีกเลี่ยง prop drilling เกิน 2–3 ชั้น** → composition (ส่ง `children`) ก่อน, context เมื่อเป็นข้อมูล global จริง (theme, user, locale)
- อย่า spread props มั่ว (`{...props}` ลง DOM element จะพา prop แปลกปลอมไปด้วย)

### 1.3 อย่าสร้าง component ข้างใน component
```tsx
// ❌ ทุก render สร้าง type ใหม่ → React unmount/remount ลูกทุกครั้ง state หาย focus หลุด
function Parent() {
  function Child() { return <input />; }
  return <Child />;
}
// ✅ ประกาศนอกไฟล์เดียวกันหรือแยกไฟล์เสมอ
```

---

## 2. State Management (จุดชี้ขาดคุณภาพแอป React)

### 2.1 กฎเลือกที่อยู่ของ state
1. **เริ่มที่ local (`useState`) เสมอ** — ยกขึ้นไป (lift up) เฉพาะเมื่อมีคนอื่นต้องใช้จริง
2. **Server state ≠ client state** — ข้อมูลจาก API ให้ใช้ **TanStack Query (React Query)** / SWR ไม่ใช่ `useEffect + useState` เอง (ได้ cache, retry, dedupe, invalidation ฟรี และตัดบั๊ก race condition ทิ้งทั้งตระกูล)
3. Global client state (theme, sidebar เปิด/ปิด, cart) → Zustand / Redux Toolkit / Context — เลือกตัวเดียวทั้งโปรเจกต์
4. **Form state** → React Hook Form + Zod schema — อย่า `useState` ทีละ field ในฟอร์มใหญ่

### 2.2 Derived state — ห้ามเก็บสิ่งที่คำนวณได้
```tsx
// ❌ state ซ้ำซ้อน — จุดที่ 2 แหล่งความจริงขัดแย้งกัน = บั๊ก
const [items, setItems] = useState<Item[]>([]);
const [total, setTotal] = useState(0);   // ลืม sync เมื่อไหร่ก็พัง

// ✅ คำนวณตอน render — ถูกเสมอโดยไม่ต้อง sync
const total = items.reduce((sum, i) => sum + i.price, 0);
// แพงจริงค่อยห่อ useMemo
```

### 2.3 Immutable update เท่านั้น
```tsx
// ❌ mutate — React ไม่เห็นการเปลี่ยนแปลง ไม่ re-render
items.push(newItem); setItems(items);

// ✅ สร้างใหม่เสมอ
setItems(prev => [...prev, newItem]);
setUser(prev => ({ ...prev, name: 'new' }));
```
- update ที่อิงค่าก่อนหน้า ใช้ **functional form** `setCount(c => c + 1)` — กันบั๊ก stale state ตอนเรียกติดกัน

---

## 3. useEffect — เครื่องมือที่ถูกใช้ผิดบ่อยที่สุด

### 3.1 กฎ: effect มีไว้ sync กับ "โลกภายนอก React" เท่านั้น
(subscription, DOM API, analytics) — **ไม่ใช่** ไว้ตอบสนอง state เปลี่ยน

```tsx
// ❌ effect ต่อ effect — ช้า (render 2 รอบ) และไล่ยาก
useEffect(() => { setFullName(first + ' ' + last); }, [first, last]);
// ✅ คำนวณตอน render
const fullName = first + ' ' + last;

// ❌ ตอบสนอง "event" ใน effect
useEffect(() => { if (submitted) sendAnalytics(); }, [submitted]);
// ✅ ทำใน event handler ตรง ๆ
const handleSubmit = () => { submit(); sendAnalytics(); };
```

### 3.2 เมื่อจำเป็นต้องใช้จริง
- **ใส่ cleanup เสมอ** เมื่อ effect สร้างอะไรค้างไว้:
```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal }).then(...);
  return () => controller.abort();   // กัน race condition + setState หลัง unmount
}, [url]);
```
- Dependency array ใส่ให้ **ครบตามจริง** (เปิด `eslint-plugin-react-hooks` เป็น error) — การแอบลบ dep เพื่อหยุด loop คือการซ่อนบั๊ก แก้ที่ต้นเหตุ: ย้าย object/function เข้า effect, ใช้ `useCallback`, หรือคิดใหม่ว่าควรเป็น effect ไหม
- Effect รันหลัง render และใน dev รัน 2 รอบ (StrictMode) — โค้ดที่พังเพราะรัน 2 รอบ = โค้ดที่มีบั๊กอยู่แล้ว (ไม่ idempotent)

---

## 4. Performance

1. **อย่า optimize ก่อนวัด** — ใช้ React DevTools Profiler หา component ที่ render บ่อย/แพงจริง
2. ลำดับอาวุธ:
   - **จัดโครงสร้างให้ดีก่อน**: ย้าย state ลงต่ำสุด (state เปลี่ยน = subtree นั้น render), แยก component ที่เปลี่ยนบ่อยออกจากที่นิ่ง
   - `React.memo` กับ component ที่ props นิ่งแต่ parent render บ่อย
   - `useMemo`/`useCallback` เพื่อรักษา reference ให้ memo/dep ทำงาน — ไม่ใช่โปรยทุกบรรทัด
3. **`key` ต้องเป็น id ที่เสถียร** — ใช้ index เป็น key กับ list ที่มี insert/delete/reorder = state ปนกัน บั๊กพิสดาร
4. List ยาวหลักพัน → virtualization (`@tanstack/react-virtual`)
5. `React.lazy` + dynamic import แยก bundle ตาม route
6. รูป: กำหนด width/height กัน layout shift, lazy load ใต้ fold

---

## 5. Custom Hooks — หน่วย reuse หลักของ React

- Logic ที่ใช้ซ้ำหรือ component เริ่มรก → ดึงเป็น hook: `useDebounce`, `useOrderSearch`, `usePermission`
- Hook ที่ดี: ชื่อบอกหน้าที่, return ชัดเจน, ซ่อน implementation
```tsx
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
```
- กฎ hooks: เรียกที่ top level เท่านั้น (ห้ามใน if/loop) — ลำดับการเรียกต้องเท่ากันทุก render

---

## 6. Testing React (คู่กับ tester.md)

- **React Testing Library + Vitest/Jest** — ปรัชญา: test สิ่งที่ user เห็น/ทำ ไม่ใช่ internal
```tsx
test('shows error when submitting empty form', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  await user.click(screen.getByRole('button', { name: /เข้าสู่ระบบ/i }));

  expect(await screen.findByText(/กรุณากรอกอีเมล/i)).toBeInTheDocument();
});
```
- Query ตามลำดับความเหมือน user: `getByRole` > `getByLabelText` > `getByText` > `getByTestId` (ทางหนีไฟ)
- ของ async ใช้ `findBy*` / `waitFor` — ห้าม sleep
- Mock ที่ **network boundary ด้วย MSW** (Mock Service Worker) — ไม่ mock fetch/axios ตรง ๆ ไม่ mock hook ตัวเอง
- Custom hook ที่ logic หนัก → test ด้วย `renderHook`
- E2E flow สำคัญ → Playwright

---

## 7. Security ฝั่ง React (คู่กับ security.md)

- JSX escape ให้อัตโนมัติ — ช่องโหว่ XSS ใน React มาจาก 3 ทางหลัก:
  1. `dangerouslySetInnerHTML` → ต้องผ่าน **DOMPurify** เท่านั้น
  2. `href={userInput}` → บล็อก `javascript:` URL (validate scheme เป็น http/https)
  3. ข้อมูล user ที่ฝังเข้า `<script>`/JSON ใน SSR
- **Token อย่าเก็บ localStorage ถ้าเลือกได้** → HttpOnly cookie (localStorage อ่านได้ด้วย XSS ทุกตัว)
- ทุก env var ที่ขึ้นต้น `VITE_`/`NEXT_PUBLIC_` **อยู่ใน bundle ที่ user เปิดดูได้** — ห้ามใส่ secret เด็ดขาด
- การซ่อนปุ่ม/route ฝั่ง client ไม่ใช่การกันสิทธิ์ — server ต้องเช็คเองทุก request

---

## 8. Checklist เฉพาะ React ก่อน merge

```
□ ไม่มี server state ใน useState+useEffect เอง (ใช้ React Query)
□ ไม่มี derived state เก็บซ้ำ / ไม่มี state ที่คำนวณได้
□ ทุก setState แบบ immutable, อิงค่าเดิมใช้ functional form
□ useEffect ทุกตัว: dep ครบ (lint ผ่าน), มี cleanup, ตอบคำถามได้ว่า "sync กับอะไรภายนอก"
□ key เป็น id เสถียร ไม่ใช่ index (สำหรับ list ที่เปลี่ยนได้)
□ ไม่มี component ประกาศใน component
□ TypeScript strict, ไม่มี any หลุด
□ Test ผ่าน role/text แบบ user จริง, mock ที่ MSW
□ ไม่มี secret ใน env ฝั่ง client, ไม่มี dangerouslySetInnerHTML ที่ไม่ผ่าน sanitizer
```
