import test from "node:test";
import assert from "node:assert/strict";
import {
  billingCSV,
  monthRows,
  offsetDay,
  plannedDeliveries,
  seedData,
} from "./lib.js";

test("delivery status is scoped to the selected date", () => {
  const customers = [
    { id: "a", active: true },
    { id: "b", active: false },
  ];
  const deliveries = [
    { id: "one", customerId: "a", date: "2026-10-13", status: "delivered" },
  ];
  assert.deepEqual(
    plannedDeliveries(customers, deliveries, "2026-10-13").map((x) => x.status),
    ["delivered"],
  );
  assert.deepEqual(
    plannedDeliveries(customers, deliveries, "2026-10-14").map((x) => x.status),
    ["pending"],
  );
});

test("monthly billing counts delivered quantities and deducts payments", () => {
  const customers = [{ id: "a", name: "A", quantity: 2, price: 60 }];
  const deliveries = [
    {
      customerId: "a",
      date: "2026-10-01",
      status: "delivered",
      quantity: 2,
      price: 60,
    },
    {
      customerId: "a",
      date: "2026-10-02",
      status: "skipped",
      quantity: 2,
      price: 60,
    },
    {
      customerId: "a",
      date: "2026-09-30",
      status: "delivered",
      quantity: 2,
      price: 60,
    },
  ];
  const payments = [{ customerId: "a", month: "2026-10", amount: 50 }];
  assert.deepEqual(
    monthRows(customers, deliveries, payments, "2026-10").map(
      ({ deliveries, amount, paid, due }) => ({
        deliveries,
        amount,
        paid,
        due,
      }),
    ),
    [{ deliveries: 1, amount: 120, paid: 50, due: 70 }],
  );
});

test("seed data includes customers and recent completed deliveries", () => {
  const data = seedData("2026-10-13");
  assert.equal(data.customers.length, 12);
  assert.ok(data.deliveries.length > 300);
  assert.equal(offsetDay("2026-03-01", -1), "2026-02-28");
});

test("CSV escapes customer input", () => {
  const csv = billingCSV(
    [
      {
        name: 'A,"B"',
        phone: "123",
        deliveries: 1,
        amount: 60,
        paid: 0,
        due: 60,
      },
    ],
    "2026-10",
  );
  assert.match(csv, /"A,""B"""/);
});
