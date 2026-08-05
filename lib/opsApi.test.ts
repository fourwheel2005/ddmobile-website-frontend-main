import { describe, it, expect } from "vitest";
import { visibleQueues, slaLabel, nextFulfillStatuses, QUEUES } from "./opsApi";

// S14/OPS-01: ตรรกะล้วนของ workbench (nav ตามสิทธิ์ / SLA / สถานะจัดส่งถัดไป)
describe("visibleQueues", () => {
  it("ซ่อนคิวงานผิดปกติเมื่อไม่มีสิทธิ์ RECONCILIATION_VIEW", () => {
    const keys = visibleQueues(["ORDER_VIEW"], "ROLE_EMPLOYEE").map((q) => q.key);
    expect(keys).not.toContain("RECONCILIATION");
    expect(keys).toContain("PAYMENT_REVIEW");
  });

  it("โชว์ครบเมื่อมีสิทธิ์ หรือเป็นแอดมิน", () => {
    expect(visibleQueues(["RECONCILIATION_VIEW"], "ROLE_EMPLOYEE").map((q) => q.key)).toContain("RECONCILIATION");
    expect(visibleQueues([], "ROLE_ADMIN")).toHaveLength(QUEUES.length);
  });
});

describe("slaLabel", () => {
  const NOW = 1_000_000_000_000;
  it("เกินกำหนด เมื่อ overdue หรือ dueAt ผ่านมาแล้ว", () => {
    expect(slaLabel(new Date(NOW + 5 * 60000).toISOString(), true, NOW).level).toBe("overdue");
    expect(slaLabel(new Date(NOW - 60000).toISOString(), false, NOW).level).toBe("overdue");
  });
  it("ใกล้ครบ (≤15 นาที) = soon, ไกลกว่านั้น = ok", () => {
    expect(slaLabel(new Date(NOW + 10 * 60000).toISOString(), false, NOW).level).toBe("soon");
    expect(slaLabel(new Date(NOW + 40 * 60000).toISOString(), false, NOW).level).toBe("ok");
  });
  it("ไม่มี dueAt → none", () => {
    expect(slaLabel(null, false, NOW).level).toBe("none");
  });
});

describe("nextFulfillStatuses", () => {
  it("แยกเส้นทางส่ง/รับที่ร้านที่ขั้น PREPARING", () => {
    expect(nextFulfillStatuses("PREPARING", true)).toEqual(["SHIPPED"]);
    expect(nextFulfillStatuses("PREPARING", false)).toEqual(["READY_PICKUP"]);
  });
  it("ไม่ให้ข้ามขั้น (สถานะปิดแล้ว = ว่าง)", () => {
    expect(nextFulfillStatuses("COMPLETED", true)).toEqual([]);
    expect(nextFulfillStatuses("CONFIRMED", true)).toEqual(["PREPARING"]);
  });
});
