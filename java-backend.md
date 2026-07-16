# Java Backend Skill — ฉบับ Fable (Java + Spring Boot)

> ต่อยอดจาก [coder.md](coder.md) — ไฟล์นี้คือกฎเฉพาะของ Java/Spring ที่ต้องใช้คู่กัน

---

## 1. Modern Java ที่ควรเขียน (Java 17+)

### 1.1 ใช้ feature ใหม่แทน pattern เก่า
```java
// ✅ record แทน POJO + getter/setter/equals/hashCode ยาวเหยียด — สำหรับ DTO/value object
public record OrderSummary(String orderId, BigDecimal total, OrderStatus status) {}

// ✅ sealed + pattern matching แทน instanceof chain — ทำให้ compiler บังคับครบทุก case
public sealed interface PaymentResult permits Approved, Declined, Pending {}

String message = switch (result) {
    case Approved a  -> "จ่ายสำเร็จ: " + a.transactionId();
    case Declined d  -> "ถูกปฏิเสธ: " + d.reason();
    case Pending p   -> "รอดำเนินการ";
    // ไม่ต้องมี default — เพิ่ม type ใหม่แล้ว compile ไม่ผ่านทันที = จับบั๊กตั้งแต่ compile time
};

// ✅ var เมื่อ type ชัดจากฝั่งขวา, ✅ text block สำหรับ SQL/JSON ยาว ๆ
var users = new ArrayList<User>();
```

### 1.2 Null Safety — วินัยสำคัญที่สุดใน Java
- **`Optional` ใช้เป็น return type เท่านั้น** — ห้ามใช้เป็น field, parameter, หรือใน collection
- ห้าม `optional.get()` เปล่า ๆ → ใช้ `orElseThrow(() -> new NotFoundException(...))`, `map`, `orElse`
- Method ที่ return collection: **return empty collection ไม่ใช่ null** (`List.of()`)
- Validate ที่ขอบด้วย `Objects.requireNonNull(x, "message")` ใน constructor
- ใช้ annotation `@Nullable`/`@NonNull` (JSpecify/Spring) + เปิด IDE inspection ให้ฟ้อง

### 1.3 Immutability เป็นค่าเริ่มต้น
- field เป็น `final` เว้นแต่มีเหตุผล, DTO เป็น `record`
- Collection ที่ส่งออกจาก object: `List.copyOf(items)` หรือ `Collections.unmodifiableList` — อย่าปล่อย reference ภายในหลุดออกไปให้คนนอกแก้
- `String`, `BigDecimal`, `LocalDateTime` immutable อยู่แล้ว — อย่าลืมว่า method พวกนี้ **return ค่าใหม่**: `date.plusDays(1)` เฉย ๆ ไม่มีผลอะไร ต้อง assign

### 1.4 เรื่องที่ Java พลาดประจำ
- **เงินใช้ `BigDecimal` เท่านั้น** ห้าม `double` — และเทียบด้วย `compareTo` ไม่ใช่ `equals` (`new BigDecimal("1.0").equals(new BigDecimal("1.00"))` = false!)
- เทียบ object ด้วย `.equals()` ไม่ใช่ `==` (`==` เทียบ reference — Integer cache ทำให้ `==` "บังเอิญถูก" กับเลขเล็กแล้วพังกับเลขใหญ่)
- Override `equals` ต้อง override `hashCode` คู่กันเสมอ (ไม่งั้น HashMap/HashSet เพี้ยน)
- เวลา: ใช้ `java.time` (`Instant` เก็บลง DB, `ZonedDateTime` ตอนแสดงผล) — ห้ามแตะ `java.util.Date`/`Calendar`
- Stream: อ่านง่ายเมื่อสั้น — ถ้า chain เกิน ~5 ขั้นหรือมี side effect ข้างใน ให้กลับไปใช้ loop; ห้าม `forEach` ที่ mutate ตัวแปรนอก

---

## 2. Spring Boot — โครงสร้างและวินัย

### 2.1 Layer แบ่งชัด dependency ชี้ทิศเดียว
```
Controller  → รับ/ตอบ HTTP, validate รูปแบบ, map DTO ↔ domain — ห้ามมี business logic
Service     → business logic, จัดการ transaction
Repository  → คุยกับ DB เท่านั้น
Domain      → entity + value object + กฎธุรกิจในตัว object เอง
```
- **DTO แยกจาก Entity เสมอ** — expose entity ตรง ๆ ทาง API = ผูก DB schema ติดกับ API contract + เปิดช่อง mass assignment + lazy loading ระเบิดตอน serialize
- Constructor injection เท่านั้น (ห้าม field `@Autowired`) — บังคับ dependency ชัด, ทำให้ field เป็น final ได้, test ง่าย:
```java
@Service
public class OrderService {
    private final OrderRepository orderRepo;
    private final PaymentClient paymentClient;

    public OrderService(OrderRepository orderRepo, PaymentClient paymentClient) {
        this.orderRepo = orderRepo;
        this.paymentClient = paymentClient;
    }
}
```

### 2.2 Validation ที่ boundary
```java
public record CreateOrderRequest(
    @NotBlank String productId,
    @Positive int quantity,
    @Email String contactEmail
) {}

@PostMapping("/orders")
public OrderResponse create(@Valid @RequestBody CreateOrderRequest req) { ... }
```
- `@Valid` ลืมใส่ = annotation ทั้งหมดไม่ทำงานเงียบ ๆ — เช็คทุก endpoint
- Business rule ที่ซับซ้อน (เช็ค stock, เช็คสิทธิ์) อยู่ใน service ไม่ใช่ annotation

### 2.3 Exception Handling รวมศูนย์
```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    ProblemDetail handleNotFound(OrderNotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(Exception.class)   // ตาข่ายสุดท้าย — log เต็ม, ตอบ generic
    ProblemDetail handleUnexpected(Exception e) {
        log.error("Unexpected error", e);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Internal error");
    }
}
```
- สร้าง exception hierarchy ของ domain เอง (`OrderNotFoundException extends DomainException`) — อย่าโยน `RuntimeException` เปล่า
- ห้ามส่ง stack trace / SQL / internal message กลับไปหา client ใน production

### 2.4 Transaction — จุดที่คนพลาดเงียบ ๆ ที่สุด
- `@Transactional` ทำงานผ่าน **proxy** → **เรียก method ภายใน class เดียวกัน annotation ไม่ทำงาน** (self-invocation) — ต้องแยก bean หรือ restructure
- ใช้ที่ชั้น **service** ไม่ใช่ controller/repository
- Default rollback เฉพาะ `RuntimeException` — checked exception ไม่ rollback ถ้าไม่ตั้ง `rollbackFor`
- **ห้ามเรียก external API (HTTP) ข้างใน transaction** — connection DB ถูกถือค้างระหว่างรอ network = pool หมดตอน traffic สูง
- `@Transactional(readOnly = true)` สำหรับ query ล้วน — ช่วย performance และกันเขียนพลาด

### 2.5 JPA/Hibernate กับดักใหญ่
- **N+1 คือบั๊ก performance อันดับ 1**: default `LAZY` แล้ว loop เข้า relation = query ระเบิด
  - แก้ด้วย `JOIN FETCH` ใน JPQL, `@EntityGraph`, หรือ query แบบ DTO projection ตรง ๆ
  - เปิด log SQL ตอน dev (`spring.jpa.show-sql` + hibernate statistics) แล้ว**นับ query จริง**
- `ToMany` ต้องเป็น `LAZY` เสมอ (`EAGER` = ดึงโลกทั้งใบมาโดยไม่ตั้งใจ)
- อย่าใช้ entity เป็น key ใน HashMap ก่อน persist (id เปลี่ยน → hashCode เปลี่ยน)
- Bulk operation ใช้ query ตรง (`@Modifying @Query`) — อย่า load ทีละ entity มา save ทีละตัว
- Pagination ใช้ `Pageable` — และระวัง `findAll()` เปล่า ๆ บนตารางใหญ่

---

## 3. Concurrency ใน Java

- Spring bean เป็น **singleton** — field ใน `@Service`/`@Controller` ถูกแชร์ทุก request → **ห้ามเก็บ state ต่อ-request ใน field** (นี่คือ race condition ยอดฮิตใน Spring)
- ตัวแปรแชร์ข้าม thread: ใช้ `AtomicInteger`/`ConcurrentHashMap`/`synchronized` — อย่าเดาว่า "คงไม่ชนกันหรอก"
- `SimpleDateFormat` ไม่ thread-safe (ใช้ `DateTimeFormatter` แทน — อันนี้ safe)
- Virtual threads (Java 21): เหมาะกับ I/O-bound สูง ๆ — แต่ระวัง `synchronized` block ที่ pin carrier thread
- ป้องกัน double-submit / concurrent update ด้วย optimistic locking (`@Version`) หรือ unique constraint ที่ DB — **constraint ที่ DB คือแนวป้องกันสุดท้ายที่เชื่อถือได้จริง** (เช็คใน service อย่างเดียวกันการยิงพร้อมกันไม่ได้)

---

## 4. Testing ฝั่ง Java (คู่กับ tester.md)

### 4.1 เครื่องมือหลัก
- **JUnit 5 + AssertJ** (`assertThat(x).isEqualTo(y)` — อ่านง่าย diff สวย) + **Mockito**
- Unit test service: mock เฉพาะ repository/client ขอบระบบ
```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock OrderRepository orderRepo;
    @InjectMocks OrderService service;

    @Test
    void rejectsOrderWhenStockInsufficient() {
        when(orderRepo.findStock("P1")).thenReturn(2);

        assertThatThrownBy(() -> service.create("P1", 5))
            .isInstanceOf(InsufficientStockException.class)
            .hasMessageContaining("P1");
    }
}
```

### 4.2 เลือกระดับ test ให้ถูก (เรียงจากเบา → หนัก)
| ระดับ | ใช้เมื่อ | หมายเหตุ |
|---|---|---|
| Plain JUnit (ไม่มี Spring) | logic ล้วน | เร็วสุด — พยายามให้ logic ส่วนใหญ่เทสต์ได้ระดับนี้ |
| `@WebMvcTest` | ทดสอบ controller + validation + exception handler | mock service, ใช้ MockMvc |
| `@DataJpaTest` | ทดสอบ query/repository | คู่กับ Testcontainers ไม่ใช่ H2 |
| `@SpringBootTest` + **Testcontainers** | integration เต็ม | ช้า — ใช้กับ flow สำคัญ |

- **ใช้ Testcontainers (PostgreSQL/MySQL จริงใน Docker) แทน H2** — H2 behavior ต่างจาก DB จริง (SQL dialect, lock, constraint) ทำให้ test ผ่านแต่ production พัง
- `@SpringBootTest` ทั้ง context ช้า — อย่าใช้พร่ำเพรื่อกับสิ่งที่ unit test ได้

---

## 5. Security เฉพาะ Java/Spring (คู่กับ security.md)

- Spring Security: กำหนดกฎแบบ **deny by default** — `anyRequest().authenticated()` ปิดท้าย chain เสมอ
- Method-level: `@PreAuthorize("hasRole('ADMIN')")` — และอย่าลืมเช็ค **ownership ระดับ object** ใน service (IDOR)
- SQL: ใช้ JPA parameter binding / `@Query` กับ named parameter — ห้ามต่อ string เข้า JPQL/native query
- Mass assignment: มี DTO แยก + field ชัดเจน ป้องกันโดยโครงสร้างอยู่แล้ว — อย่าทำลายมันด้วยการรับ entity ตรง ๆ
- Deserialization: ห้ามรับ Java serialized object จากภายนอก; Jackson อย่าเปิด default typing กับ input ไม่น่าไว้ใจ
- Dependency: ใช้ OWASP Dependency-Check / `mvn versions:display-dependency-updates` + อัปเดต Spring Boot ตาม patch สม่ำเสมอ (CVE ของ ecosystem นี้มาเรื่อย ๆ)
- Actuator endpoint: expose เฉพาะ `health`/`info` สาธารณะ — `env`, `heapdump`, `beans` คือขุมทรัพย์ของ attacker ต้องล็อกหรือปิด

---

## 6. Logging & Observability

- ใช้ SLF4J + parameterized message: `log.info("Order {} created for user {}", orderId, userId)` — ห้ามต่อ string (เสีย performance แม้ level ปิดอยู่)
- ห้าม `e.printStackTrace()` / `System.out.println` ในโค้ดจริง
- log แล้ว rethrow อย่าทำทั้งคู่ซ้ำหลายชั้น (error เดียว log 4 รอบ อ่าน log ไม่รู้เรื่อง) — จับ log ที่ชั้นที่ handle จริงครั้งเดียว
- ใส่ correlation id (MDC) ทุก request — ตามรอย request เดียวข้าม service ได้
- Metrics ผ่าน Micrometer/Actuator: latency, error rate, connection pool usage — pool หมดคืออาการป่วยที่เจอบ่อยสุดของ Spring app

---

## 7. Checklist เฉพาะ Java ก่อน merge

```
□ ไม่มี business logic ใน controller / ไม่มี entity หลุดออก API
□ Constructor injection + field final ทั้งหมด
□ @Valid ครบทุก @RequestBody, DTO มี validation annotation
□ @Transactional อยู่ถูกชั้น, ไม่มี self-invocation, ไม่มี HTTP call ในนั้น
□ เปิด SQL log แล้วนับ query — ไม่มี N+1
□ เงิน = BigDecimal, เวลา = java.time, เทียบด้วย equals/compareTo ถูกตัว
□ ไม่มี mutable state ใน singleton bean
□ Exception มี handler รวมศูนย์, ไม่ leak internal detail
□ Test: logic หลักเป็น plain JUnit, integration ใช้ Testcontainers
□ Actuator ล็อกแล้ว, dependency audit ผ่าน
```
