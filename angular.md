# Angular Skill — ฉบับ Fable (Angular สมัยใหม่ v17+)

> ต่อยอดจาก [coder.md](coder.md) — Angular ให้โครงสร้างมาเยอะ จุดชี้ขาดคือ **ใช้ RxJS/Signals ให้ถูก และเคารพ dependency injection**

---

## 1. โครงสร้างสมัยใหม่ (แนวทางปัจจุบันของ Angular)

- **Standalone components** เป็นค่าเริ่มต้น — เลิกสร้าง NgModule ใหม่ (ของเก่าค่อย ๆ migrate)
- **Signals** สำหรับ state ใน component, **RxJS** สำหรับ event stream/async ที่ซับซ้อน — สองอย่างนี้เสริมกัน ไม่ใช่แทนกัน
- Control flow ใหม่ในเทมเพลต: `@if`, `@for`, `@switch` แทน `*ngIf`/`*ngFor`
  - `@for` **บังคับ `track`** — ใช้ id เสถียร: `@for (item of items; track item.id)`
- `inject()` function แทน constructor injection ได้ (สั้นกว่า, ใช้ใน function/guard ได้):
```typescript
export class OrderListComponent {
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
}
```
- โครงสร้างโฟลเดอร์ตาม **feature** ไม่ใช่ตาม type:
```
features/
  orders/
    order-list.component.ts
    order-detail.component.ts
    order.service.ts
    order.model.ts
  shared/          # ของที่ใช้ข้าม feature จริง ๆ เท่านั้น
```

---

## 2. Component Design

### 2.1 Smart / Dumb แยกชัด
- **Smart (container)**: inject service, ถือ state, ต่อ router — มีน้อยตัว
- **Dumb (presentational)**: `input()` เข้า `output()` ออก, ไม่ inject service ธุรกิจ — ส่วนใหญ่ของแอปควรเป็นแบบนี้
```typescript
@Component({ selector: 'app-order-card', ... })
export class OrderCardComponent {
  order = input.required<Order>();          // signal input
  cancelled = output<string>();             // แทน @Output + EventEmitter

  onCancel() { this.cancelled.emit(this.order().id); }
}
```

### 2.2 กฎในเทมเพลตและ change detection
- **ห้ามเรียก method หนัก ๆ ในเทมเพลต** — ถูกเรียกทุก change detection cycle
  → ใช้ `computed()` signal หรือ pure pipe แทน
```typescript
// ❌ template: {{ calculateTotal() }}
// ✅
total = computed(() => this.items().reduce((s, i) => s + i.price, 0));
// template: {{ total() }}
```
- ใช้ `ChangeDetectionStrategy.OnPush` ทุก component (ถ้าใช้ signals อยู่แล้วจะเป็นธรรมชาติ) — บังคับให้ data flow สะอาดและเร็วขึ้นมาก
- Logic ใน component ให้บาง — ความรู้ธุรกิจอยู่ใน service

---

## 3. RxJS — ดาบสองคมประจำ Angular

### 3.1 กฎเหล็ก: ทุก subscription ต้องมีจุดจบ
Memory leak อันดับ 1 ของ Angular คือ subscribe แล้วไม่ unsubscribe

```typescript
// ✅ ทางเลือกเรียงตามความแนะนำ
// 1) ไม่ subscribe เองเลย — ให้ template จัดการ
data$ = this.orderService.getOrders();
// template: @if (data$ | async; as data) { ... }

// 2) toSignal — แปลงเป็น signal, cleanup อัตโนมัติ
orders = toSignal(this.orderService.getOrders(), { initialValue: [] });

// 3) จำเป็นต้อง subscribe เอง → takeUntilDestroyed
constructor() {
  this.socket.messages$
    .pipe(takeUntilDestroyed())
    .subscribe(msg => this.handle(msg));
}
```

### 3.2 Operator ที่ต้องเลือกให้ถูก (จุดเกิดบั๊ก race condition)
| Operator | ใช้เมื่อ | ตัวอย่าง |
|---|---|---|
| `switchMap` | สนใจแค่ค่าล่าสุด ยกเลิกอันเก่า | **search/autocomplete, โหลดตาม route param** |
| `concatMap` | ต้องรักษาลำดับ ห้ามหล่น | บันทึกข้อมูลต่อเนื่อง |
| `mergeMap` | ยิงขนานได้ ไม่สนลำดับ | อัปโหลดหลายไฟล์ |
| `exhaustMap` | เมินคำสั่งใหม่จนอันเดิมเสร็จ | **ปุ่ม submit (กัน double-click)** |

ใช้ผิดตัว = บั๊กที่โผล่เฉพาะตอน user คลิกเร็ว ๆ หรือ network ช้า — เจอ `mergeMap` ตรงที่ควรเป็น `switchMap` ให้สงสัยไว้ก่อน

### 3.3 วินัยเพิ่มเติม
- ตั้งชื่อ observable ลงท้าย `$`: `orders$`
- อย่า subscribe ซ้อน subscribe (nested) → ใช้ higher-order operator ข้างบน
- `shareReplay(1)` เมื่อหลายที่ subscribe stream เดียวกัน (กันยิง HTTP ซ้ำ) — แต่ระวัง cache ค้าง ใส่ `refCount: true`
- Error ใน stream: `catchError` **ภายใน** inner observable — วางนอกแล้ว stream หลักตายถาวร (เช่น autocomplete ที่พังครั้งเดียวแล้วพิมพ์ต่อไม่ออกอะไรอีกเลย)

---

## 4. State Management

1. **Component state** → signals (`signal`, `computed`)
2. **แชร์ข้าม component ใน feature** → service ที่ถือ signal/BehaviorSubject (providedIn: 'root' หรือ provide ที่ feature route)
```typescript
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();          // expose แบบอ่านอย่างเดียว
  readonly total = computed(() => this._items().reduce((s, i) => s + i.price, 0));

  add(item: CartItem) { this._items.update(list => [...list, item]); }
}
```
3. **แอปใหญ่ state ซับซ้อน** → NgRx (มาตรฐาน, boilerplate เยอะ) หรือ NgRx SignalStore (ใหม่ เบากว่า)
4. หลักเดียวกับ React: **อย่าเก็บ derived state** — ใช้ `computed`; **server state** พิจารณา TanStack Query (มี Angular adapter) หรืออย่างน้อยรวม caching ไว้ใน service เดียว

---

## 5. HTTP, Form, Router

### 5.1 HttpClient
- Type ทุก response: `this.http.get<Order[]>('/api/orders')` — และอย่าเชื่อ type ลอย ๆ ถ้าสำคัญให้ validate ด้วย zod/valibot ที่ boundary
- **Interceptor** รวมศูนย์: แนบ token, จัดการ 401 → refresh/logout, แสดง error toast, ใส่ correlation id — อย่าทำซ้ำในทุก service
- Retry เฉพาะ GET ที่ idempotent: `retry({ count: 2, delay: backoff })`

### 5.2 Reactive Forms (อย่าใช้ template-driven กับฟอร์มจริงจัง)
```typescript
form = this.fb.nonNullable.group({
  email: ['', [Validators.required, Validators.email]],
  quantity: [1, [Validators.required, Validators.min(1)]],
});
```
- ใช้ `nonNullable` + typed forms — ได้ type safety เต็ม
- Custom validator เป็น pure function แยกไฟล์ → unit test ตรง ๆ ได้
- Cross-field validation ใส่ที่ group level
- แสดง error เมื่อ `touched || submitted` — อย่าด่า user ตั้งแต่ยังไม่พิมพ์

### 5.3 Router
- **Lazy load ทุก feature route** — `loadComponent`/`loadChildren` เป็น default ไม่ใช่ข้อยกเว้น
- Guard (`CanActivate`) เป็น UX ไม่ใช่ security — server ต้องเช็คสิทธิ์เองเสมอ
- Route param เป็น observable — ใช้ `switchMap` โหลดข้อมูล เพราะ component ถูก reuse ตอนเปลี่ยน param (จุดที่คนงงบ่อย: `ngOnInit` ไม่รันซ้ำ!)
```typescript
order = toSignal(
  this.route.paramMap.pipe(
    switchMap(params => this.orderService.getById(params.get('id')!))
  )
);
```

---

## 6. Testing Angular (คู่กับ tester.md)

- Service ที่ logic ล้วน → plain unit test, inject dependency ปลอมผ่าน constructor เอง (ไม่ต้องใช้ TestBed = เร็วกว่ามาก)
- Component → TestBed + **Angular Testing Library** (ปรัชญาเดียวกับ React: test ผ่านสิ่งที่ user เห็น)
- HTTP → `provideHttpClientTesting` + `HttpTestingController`:
```typescript
it('loads orders', () => {
  service.getOrders().subscribe(orders => expect(orders.length).toBe(2));
  const req = httpMock.expectOne('/api/orders');
  req.flush([order1, order2]);
  httpMock.verify();   // ยืนยันไม่มี request หลงเหลือ
});
```
- RxJS ซับซ้อน → marble testing (`TestScheduler`) หรืออย่างน้อย test ด้วย subject ปลอมที่ควบคุมจังหวะ emit ได้
- E2E → Playwright (Protractor ตายแล้ว)

---

## 7. Security ฝั่ง Angular (คู่กับ security.md)

- Angular sanitize interpolation ให้แล้ว — ช่องโหว่มาจาก:
  - `[innerHTML]` กับข้อมูล user → Angular sanitize ให้ระดับหนึ่ง แต่ถ้าใช้ `bypassSecurityTrustHtml` = ปิด safety เอง **ห้ามใช้กับ input ที่ user ควบคุม**
  - ทุก method `bypassSecurityTrust*` ต้องมีเหตุผลเป็นลายลักษณ์อักษรใน review
- Token: HttpOnly cookie ดีกว่า localStorage เหตุผลเดียวกับ React
- Angular มี XSRF protection ในตัว (`HttpClientXsrfModule`/`withXsrfConfiguration`) — เปิดใช้ให้ตรงกับ backend
- `environment.ts` ทั้งไฟล์อยู่ใน bundle — ห้ามใส่ secret

---

## 8. Checklist เฉพาะ Angular ก่อน merge

```
□ Standalone component + OnPush (หรือ signals) ทั้งหมดที่เขียนใหม่
□ ทุก subscription: async pipe / toSignal / takeUntilDestroyed — ไม่มี subscribe ลอย
□ Higher-order operator ถูกตัว (switchMap/exhaustMap/concatMap ตามพฤติกรรมที่ต้องการ)
□ ไม่มี method call หนักในเทมเพลต — ใช้ computed/pure pipe
□ @for มี track ด้วย id เสถียร
□ ฟอร์มเป็น typed reactive form, validator มี unit test
□ ทุก feature route lazy load, guard ไม่ถูกใช้แทน security ฝั่ง server
□ HTTP ผ่าน interceptor รวมศูนย์, response ถูก type
□ ไม่มี bypassSecurityTrust* กับข้อมูล user, ไม่มี secret ใน environment.ts
□ httpMock.verify() ในทุก HTTP test
```
