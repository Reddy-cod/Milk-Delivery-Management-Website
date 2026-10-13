export const STORAGE_KEY = "milkmate-data-v1";

export const todayISO = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const offsetDay = (day, amount) => {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return todayISO(date);
};

export const money = (amount) =>
  `₹${Math.round(Number(amount) || 0).toLocaleString("en-IN")}`;

export const monthLabel = (month) =>
  new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

export const dayLabel = (day) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export function plannedDeliveries(customers, deliveries, day) {
  return customers
    .filter((customer) => customer.active)
    .map((customer) => {
      const record = deliveries.find(
        (delivery) =>
          delivery.customerId === customer.id && delivery.date === day,
      );
      return {
        ...customer,
        status: record?.status || "pending",
        deliveryId: record?.id,
      };
    });
}

export function monthRows(customers, deliveries, payments, month) {
  return customers
    .map((customer) => {
      const fulfilled = deliveries.filter(
        (delivery) =>
          delivery.customerId === customer.id &&
          delivery.date.startsWith(month) &&
          delivery.status === "delivered",
      );
      const amount = fulfilled.reduce(
        (sum, delivery) =>
          sum +
          Number(delivery.quantity ?? customer.quantity) *
            Number(delivery.price ?? customer.price),
        0,
      );
      const paid = payments
        .filter(
          (payment) =>
            payment.customerId === customer.id && payment.month === month,
        )
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      return {
        ...customer,
        deliveries: fulfilled.length,
        amount,
        paid,
        due: Math.max(0, amount - paid),
      };
    })
    .filter((row) => row.amount > 0 || row.paid > 0);
}

export function seedData(day = todayISO()) {
  const names = [
    [
      "Aarav Sharma",
      "9812345601",
      "12 Green Park",
      "North Route",
      "Cow milk",
      2,
      64,
    ],
    [
      "Priya Patel",
      "9812345602",
      "8 Lake View Road",
      "East Route",
      "Buffalo milk",
      1,
      78,
    ],
    [
      "Rohan Mehta",
      "9812345603",
      "42 Maple Street",
      "North Route",
      "Cow milk",
      1.5,
      64,
    ],
    [
      "Neha Kapoor",
      "9812345604",
      "3 Sunrise Apartments",
      "West Route",
      "Cow milk",
      2,
      64,
    ],
    [
      "Vikram Singh",
      "9812345605",
      "21 Park Avenue",
      "East Route",
      "Buffalo milk",
      2,
      78,
    ],
    [
      "Ananya Iyer",
      "9812345606",
      "5 Rose Villa",
      "South Route",
      "Cow milk",
      1,
      64,
    ],
    [
      "Kabir Khan",
      "9812345607",
      "17 Oak Lane",
      "West Route",
      "Cow milk",
      3,
      64,
    ],
    [
      "Meera Joshi",
      "9812345608",
      "9 Hill Crest",
      "North Route",
      "Buffalo milk",
      1,
      78,
    ],
    [
      "Aditya Rao",
      "9812345609",
      "28 River Road",
      "South Route",
      "Cow milk",
      2,
      64,
    ],
    [
      "Sana Ali",
      "9812345610",
      "14 Pearl Residency",
      "East Route",
      "Cow milk",
      1.5,
      64,
    ],
    [
      "Dev Shah",
      "9812345611",
      "6 Garden Lane",
      "West Route",
      "Buffalo milk",
      2,
      78,
    ],
    [
      "Isha Nair",
      "9812345612",
      "33 Palm Street",
      "South Route",
      "Cow milk",
      1,
      64,
    ],
  ];
  const customers = names.map(
    ([name, phone, address, route, plan, quantity, price], index) => ({
      id: `customer-${index + 1}`,
      name,
      phone,
      address,
      route,
      plan,
      quantity,
      price,
      active: true,
      joined: offsetDay(day, -(38 + index * 3)),
    }),
  );
  const deliveries = [];
  for (let distance = 1; distance <= 30; distance++) {
    const date = offsetDay(day, -distance);
    customers.forEach((customer, index) => {
      if ((distance + index) % 19 !== 0)
        deliveries.push({
          id: `seed-${date}-${customer.id}`,
          customerId: customer.id,
          date,
          status: "delivered",
          quantity: customer.quantity,
          price: customer.price,
        });
    });
  }
  const payments = customers.slice(0, 5).map((customer) => ({
    id: `payment-${customer.id}`,
    customerId: customer.id,
    month: day.slice(0, 7),
    amount: customer.quantity * customer.price * 8,
    date: offsetDay(day, -1),
  }));
  return { customers, deliveries, payments };
}

export function loadData() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      stored &&
      Array.isArray(stored.customers) &&
      Array.isArray(stored.deliveries) &&
      Array.isArray(stored.payments)
    )
      return stored;
  } catch {
    /* Use sample data if storage is unavailable or corrupt. */
  }
  return seedData();
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* The app remains usable for this session. */
  }
}

export function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function billingCSV(rows, month) {
  const header = [
    "Customer",
    "Phone",
    "Month",
    "Deliveries",
    "Billed",
    "Paid",
    "Due",
  ];
  return [
    header,
    ...rows.map((row) => [
      row.name,
      row.phone,
      month,
      row.deliveries,
      row.amount,
      row.paid,
      row.due,
    ]),
  ]
    .map((cells) => cells.map(csvCell).join(","))
    .join("\r\n");
}
