import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Droplets,
  LayoutDashboard,
  MapPin,
  Menu,
  Milk,
  MoreHorizontal,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Settings,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  billingCSV,
  dayLabel,
  loadData,
  money,
  monthLabel,
  monthRows,
  offsetDay,
  plannedDeliveries,
  saveData,
  seedData,
  STORAGE_KEY,
  todayISO,
} from "./lib.js";
import "./styles.css";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "deliveries", label: "Deliveries", icon: Truck },
  { id: "customers", label: "Customers", icon: Users },
  { id: "billing", label: "Billing", icon: ReceiptText },
];
const routeColors = {
  "North Route": "blue",
  "East Route": "purple",
  "West Route": "orange",
  "South Route": "green",
};
const blankCustomer = {
  name: "",
  phone: "",
  address: "",
  route: "North Route",
  plan: "Cow milk",
  quantity: 1,
  price: 64,
  active: true,
};

function initials(name) {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function monthOffset(month, amount) {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + amount);
  return todayISO(date).slice(0, 7);
}
function formatShort(day) {
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function App() {
  const [data, setData] = useState(loadData);
  const [page, setPage] = useState("dashboard");
  const [day, setDay] = useState(todayISO);
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const [search, setSearch] = useState("");
  const [route, setRoute] = useState("All routes");
  const [customerModal, setCustomerModal] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    saveData(data);
  }, [data]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3300);
    return () => clearTimeout(timer);
  }, [toast]);

  const active = data.customers.filter((customer) => customer.active);
  const todayRows = useMemo(
    () => plannedDeliveries(data.customers, data.deliveries, day),
    [data, day],
  );
  const invoices = useMemo(
    () => monthRows(data.customers, data.deliveries, data.payments, month),
    [data, month],
  );
  const outstanding = invoices.reduce((sum, invoice) => sum + invoice.due, 0);
  const billed = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const delivered = todayRows.filter((row) => row.status === "delivered");
  const deliveredLitres = delivered.reduce(
    (sum, row) => sum + Number(row.quantity),
    0,
  );
  const plannedLitres = todayRows.reduce(
    (sum, row) => sum + Number(row.quantity),
    0,
  );
  const progress = todayRows.length
    ? Math.round((delivered.length / todayRows.length) * 100)
    : 0;

  function go(next) {
    setPage(next);
    setSearch("");
    setRoute("All routes");
    setMobileNav(false);
  }
  function updateStatus(customer, status) {
    setData((current) => {
      const deliveries = current.deliveries.filter(
        (item) => !(item.customerId === customer.id && item.date === day),
      );
      if (status !== "pending")
        deliveries.push({
          id: crypto.randomUUID(),
          customerId: customer.id,
          date: day,
          status,
          quantity: customer.quantity,
          price: customer.price,
        });
      return { ...current, deliveries };
    });
    setToast(
      status === "delivered"
        ? "Delivery marked complete"
        : status === "skipped"
          ? "Delivery skipped"
          : "Delivery returned to pending",
    );
  }
  function saveCustomer(customer) {
    const clean = {
      ...customer,
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      address: customer.address.trim(),
      quantity: Number(customer.quantity),
      price: Number(customer.price),
    };
    if (
      !clean.name ||
      !clean.phone ||
      !clean.address ||
      clean.quantity <= 0 ||
      clean.price < 0
    )
      return;
    setData((current) => ({
      ...current,
      customers: customer.id
        ? current.customers.map((item) =>
            item.id === customer.id ? clean : item,
          )
        : [
            ...current.customers,
            { ...clean, id: crypto.randomUUID(), joined: todayISO() },
          ],
    }));
    setCustomerModal(null);
    setToast(customer.id ? "Customer updated" : "Customer added");
  }
  function toggleCustomer(customer) {
    setData((current) => ({
      ...current,
      customers: current.customers.map((item) =>
        item.id === customer.id ? { ...item, active: !item.active } : item,
      ),
    }));
    setToast(customer.active ? "Subscription paused" : "Subscription resumed");
  }
  function recordPayment(customerId, amount) {
    const numeric = Number(amount);
    if (!customerId || !Number.isFinite(numeric) || numeric <= 0) return;
    setData((current) => ({
      ...current,
      payments: [
        ...current.payments,
        {
          id: crypto.randomUUID(),
          customerId,
          month,
          amount: numeric,
          date: todayISO(),
        },
      ],
    }));
    setPaymentModal(null);
    setToast("Payment recorded");
  }
  function exportBilling() {
    const blob = new Blob(["\uFEFF", billingCSV(invoices, month)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `milkmate-billing-${month}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Billing report downloaded");
  }
  function resetData() {
    if (
      !window.confirm(
        "Reset all customers, deliveries, and payments to sample data? This cannot be undone.",
      )
    )
      return;
    localStorage.removeItem(STORAGE_KEY);
    setData(seedData());
    setDay(todayISO());
    setMonth(todayISO().slice(0, 7));
    setToast("Demo data restored");
  }

  const searchRows = (rows) =>
    rows.filter((row) =>
      `${row.name} ${row.phone} ${row.address || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  const deliveryRows = searchRows(todayRows).filter(
    (row) => route === "All routes" || row.route === route,
  );
  const customerRows = searchRows(data.customers).filter(
    (row) => route === "All routes" || row.route === route,
  );
  const invoiceRows = searchRows(invoices);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div
          className="brand"
          onClick={() => go("dashboard")}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => event.key === "Enter" && go("dashboard")}
        >
          <span className="brand-mark">
            <Droplets size={21} strokeWidth={2.7} />
          </span>
          <span>
            milk<span className="brand-accent">mate</span>
            <small>MANAGEMENT</small>
          </span>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => go(id)}
            >
              <Icon size={19} strokeWidth={page === id ? 2.3 : 1.9} />
              <span>{label}</span>
              {id === "deliveries" &&
                todayRows.filter((row) => row.status === "pending").length >
                  0 && (
                  <span className="nav-count">
                    {todayRows.filter((row) => row.status === "pending").length}
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => go("settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>
          <div className="support-card">
            <div className="support-icon">
              <CircleHelp size={18} />
            </div>
            <b>Need a hand?</b>
            <p>Everything you need to run your daily deliveries.</p>
            <button onClick={() => go("settings")}>
              View guide <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <div className="sidebar-footer">
          <span className="footer-avatar">M</span>
          <div>
            <b>My Dairy</b>
            <small>Local workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>
      </aside>
      {mobileNav && (
        <button
          className="mobile-overlay"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      )}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open menu"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">Workspace</span>
            <ChevronRight className="breadcrumb-chevron" size={15} />
            <span className="breadcrumb-current">
              {page[0].toUpperCase() + page.slice(1)}
            </span>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">
              <CalendarDays size={16} />
              {formatShort(todayISO())}
            </span>
            <span className="topbar-divider" />
            <span className="profile-avatar">MD</span>
          </div>
        </header>
        <div className="page-content">
          {page === "dashboard" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR OVERVIEW</span>
                  <h1>
                    Good morning <span className="wave">☀</span>
                  </h1>
                  <p>
                    Here's what's happening with your dairy today,{" "}
                    {dayLabel(day)}.
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setCustomerModal({ ...blankCustomer })}
                >
                  <Plus size={18} /> Add customer
                </button>
              </div>
              <div className="hero-banner">
                <div className="hero-copy">
                  <span className="hero-tag">
                    <span className="live-dot" /> DAILY OPERATIONS
                  </span>
                  <h2>Fresh starts here.</h2>
                  <p>
                    Keep every delivery on track and every customer smiling.
                  </p>
                  <button onClick={() => go("deliveries")}>
                    Manage deliveries <ArrowRight size={17} />
                  </button>
                </div>
                <div className="hero-graphic" aria-hidden="true">
                  <div className="hero-circle circle-one" />
                  <div className="hero-circle circle-two" />
                  <div className="hero-milk">
                    <Milk size={86} strokeWidth={1.2} />
                  </div>
                  <div className="hero-spark spark-one">✦</div>
                  <div className="hero-spark spark-two">✦</div>
                </div>
              </div>
              <div className="stats-grid">
                <Stat
                  icon={Truck}
                  tone="teal"
                  label="Today's deliveries"
                  value={`${delivered.length} / ${todayRows.length}`}
                  foot={`${progress}% completed`}
                  trend="up"
                />
                <Stat
                  icon={Droplets}
                  tone="blue"
                  label="Milk delivered"
                  value={`${deliveredLitres.toLocaleString("en-IN")} L`}
                  foot={`${plannedLitres.toLocaleString("en-IN")} L planned today`}
                />
                <Stat
                  icon={Users}
                  tone="purple"
                  label="Active customers"
                  value={active.length}
                  foot={`${data.customers.length} total customers`}
                />
                <Stat
                  icon={Wallet}
                  tone="orange"
                  label="Outstanding"
                  value={money(outstanding)}
                  foot={`For ${monthLabel(month)}`}
                />
              </div>
              <div className="dashboard-grid">
                <section className="card progress-card">
                  <div className="card-header">
                    <div>
                      <h3>Delivery progress</h3>
                      <p>Keep your daily route moving</p>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => go("deliveries")}
                    >
                      View all <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="progress-body">
                    <div
                      className="progress-ring"
                      style={{ "--progress": `${progress}%` }}
                    >
                      <div>
                        <strong>{progress}%</strong>
                        <span>complete</span>
                      </div>
                    </div>
                    <div className="progress-breakdown">
                      <div>
                        <span className="status-dot dot-green" />
                        Delivered <strong>{delivered.length}</strong>
                      </div>
                      <div>
                        <span className="status-dot dot-orange" />
                        Pending{" "}
                        <strong>
                          {
                            todayRows.filter((row) => row.status === "pending")
                              .length
                          }
                        </strong>
                      </div>
                      <div>
                        <span className="status-dot dot-gray" />
                        Skipped{" "}
                        <strong>
                          {
                            todayRows.filter((row) => row.status === "skipped")
                              .length
                          }
                        </strong>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="card volume-card">
                  <div className="card-header">
                    <div>
                      <h3>Milk delivered</h3>
                      <p>Volume over the last 7 days</p>
                    </div>
                    <span className="card-icon">
                      <Activity size={18} />
                    </span>
                  </div>
                  <VolumeChart deliveries={data.deliveries} day={day} />
                </section>
              </div>
              <section className="card recent-card">
                <div className="card-header">
                  <div>
                    <h3>Today's deliveries</h3>
                    <p>A quick look at your delivery list</p>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => go("deliveries")}
                  >
                    View all deliveries <ArrowRight size={15} />
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>CUSTOMER</th>
                        <th>SUBSCRIPTION</th>
                        <th>ROUTE</th>
                        <th>STATUS</th>
                        <th className="right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayRows.slice(0, 5).map((row) => (
                        <tr key={row.id}>
                          <td>
                            <CustomerCell customer={row} />
                          </td>
                          <td>
                            <b>{row.quantity} L</b>
                            <span className="cell-sub">{row.plan}</span>
                          </td>
                          <td>
                            <RouteBadge route={row.route} />
                          </td>
                          <td>
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="right">
                            <button
                              className="row-link"
                              onClick={() => {
                                setPage("deliveries");
                                setSearch(row.name);
                              }}
                            >
                              View <ArrowRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {page === "deliveries" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">DAILY OPERATIONS</span>
                  <h1>Deliveries</h1>
                  <p>Plan your route and keep every drop accounted for.</p>
                </div>
                <div className="heading-actions">
                  <button
                    className="outline-button"
                    onClick={() => setDay(todayISO())}
                  >
                    <CalendarDays size={17} /> Today
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => setCustomerModal({ ...blankCustomer })}
                  >
                    <Plus size={18} /> Add customer
                  </button>
                </div>
              </div>
              <div className="stats-grid deliveries-stats">
                <Stat
                  icon={Truck}
                  tone="teal"
                  label="Scheduled"
                  value={todayRows.length}
                  foot="Active subscriptions"
                />
                <Stat
                  icon={Check}
                  tone="green"
                  label="Delivered"
                  value={delivered.length}
                  foot={`${progress}% completed`}
                />
                <Stat
                  icon={Clock3}
                  tone="orange"
                  label="Pending"
                  value={
                    todayRows.filter((row) => row.status === "pending").length
                  }
                  foot="Still on your route"
                />
                <Stat
                  icon={Droplets}
                  tone="blue"
                  label="Total volume"
                  value={`${plannedLitres} L`}
                  foot="Planned for this day"
                />
              </div>
              <section className="card full-card">
                <div className="list-heading">
                  <div>
                    <h3>Delivery schedule</h3>
                    <p>{dayLabel(day)}</p>
                  </div>
                  <div className="date-switch">
                    <button
                      aria-label="Previous day"
                      onClick={() => setDay(offsetDay(day, -1))}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <input
                      aria-label="Delivery date"
                      type="date"
                      value={day}
                      onChange={(event) =>
                        setDay(event.target.value || todayISO())
                      }
                    />
                    <button
                      aria-label="Next day"
                      onClick={() => setDay(offsetDay(day, 1))}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                <FilterBar
                  search={search}
                  setSearch={setSearch}
                  route={route}
                  setRoute={setRoute}
                  showRoute
                  placeholder="Search customers..."
                />
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>CUSTOMER</th>
                        <th>ADDRESS</th>
                        <th>ROUTE</th>
                        <th>QUANTITY</th>
                        <th>STATUS</th>
                        <th className="right">MARK AS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <CustomerCell customer={row} />
                          </td>
                          <td className="muted-cell">{row.address}</td>
                          <td>
                            <RouteBadge route={row.route} />
                          </td>
                          <td>
                            <b>{row.quantity} L</b>
                            <span className="cell-sub">{row.plan}</span>
                          </td>
                          <td>
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="right">
                            <div className="action-group">
                              <button
                                title="Mark delivered"
                                aria-label={`Mark ${row.name} delivered`}
                                className={
                                  row.status === "delivered"
                                    ? "selected delivered-action"
                                    : ""
                                }
                                onClick={() =>
                                  updateStatus(
                                    row,
                                    row.status === "delivered"
                                      ? "pending"
                                      : "delivered",
                                  )
                                }
                              >
                                <Check size={17} />
                              </button>
                              <button
                                title="Skip delivery"
                                aria-label={`Skip ${row.name} delivery`}
                                className={
                                  row.status === "skipped"
                                    ? "selected skipped-action"
                                    : ""
                                }
                                onClick={() =>
                                  updateStatus(
                                    row,
                                    row.status === "skipped"
                                      ? "pending"
                                      : "skipped",
                                  )
                                }
                              >
                                <X size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {deliveryRows.length === 0 && (
                    <EmptyState text="No deliveries match your search." />
                  )}
                </div>
                <div className="table-footer">
                  Showing {deliveryRows.length} of {todayRows.length} scheduled
                  deliveries
                </div>
              </section>
            </>
          )}
          {page === "customers" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR COMMUNITY</span>
                  <h1>Customers</h1>
                  <p>
                    Manage subscriptions and stay connected with your customers.
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setCustomerModal({ ...blankCustomer })}
                >
                  <Plus size={18} /> Add customer
                </button>
              </div>
              <div className="mini-summary">
                <div>
                  <span className="mini-icon green">
                    <Users size={20} />
                  </span>
                  <span>
                    <b>{data.customers.length}</b>
                    <small>Total customers</small>
                  </span>
                </div>
                <div>
                  <span className="mini-icon blue">
                    <TrendingUp size={20} />
                  </span>
                  <span>
                    <b>{active.length}</b>
                    <small>Active subscriptions</small>
                  </span>
                </div>
                <div>
                  <span className="mini-icon orange">
                    <Droplets size={20} />
                  </span>
                  <span>
                    <b>
                      {active.reduce((sum, c) => sum + Number(c.quantity), 0)} L
                    </b>
                    <small>Daily demand</small>
                  </span>
                </div>
              </div>
              <section className="card full-card">
                <div className="list-heading">
                  <div>
                    <h3>All customers</h3>
                    <p>Every customer, one simple view</p>
                  </div>
                  <span className="count-pill">
                    {data.customers.length} customers
                  </span>
                </div>
                <FilterBar
                  search={search}
                  setSearch={setSearch}
                  route={route}
                  setRoute={setRoute}
                  showRoute
                  placeholder="Search by name, phone or address..."
                />
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>CUSTOMER</th>
                        <th>ADDRESS</th>
                        <th>ROUTE</th>
                        <th>SUBSCRIPTION</th>
                        <th>STATUS</th>
                        <th className="right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <CustomerCell customer={row} />
                          </td>
                          <td className="muted-cell">{row.address}</td>
                          <td>
                            <RouteBadge route={row.route} />
                          </td>
                          <td>
                            <b>{row.quantity} L / day</b>
                            <span className="cell-sub">
                              {row.plan} · {money(row.price)}/L
                            </span>
                          </td>
                          <td>
                            <span
                              className={`pill ${row.active ? "pill-green" : "pill-gray"}`}
                            >
                              <span className="pill-dot" />
                              {row.active ? "Active" : "Paused"}
                            </span>
                          </td>
                          <td className="right">
                            <div className="customer-actions">
                              <button
                                onClick={() => setCustomerModal({ ...row })}
                              >
                                Edit
                              </button>
                              <button onClick={() => toggleCustomer(row)}>
                                {row.active ? "Pause" : "Resume"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {customerRows.length === 0 && (
                    <EmptyState text="No customers match your search." />
                  )}
                </div>
                <div className="table-footer">
                  Showing {customerRows.length} of {data.customers.length}{" "}
                  customers
                </div>
              </section>
            </>
          )}
          {page === "billing" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">PAYMENTS & REPORTS</span>
                  <h1>Billing</h1>
                  <p>Know what's been delivered, paid, and still due.</p>
                </div>
                <button className="outline-button" onClick={exportBilling}>
                  <Download size={17} /> Export CSV
                </button>
              </div>
              <div className="stats-grid billing-stats">
                <Stat
                  icon={ReceiptText}
                  tone="blue"
                  label="Total billed"
                  value={money(billed)}
                  foot={monthLabel(month)}
                />
                <Stat
                  icon={Wallet}
                  tone="green"
                  label="Collected"
                  value={money(
                    invoices.reduce((sum, row) => sum + row.paid, 0),
                  )}
                  foot="Payments recorded"
                />
                <Stat
                  icon={ArrowUpRight}
                  tone="orange"
                  label="Outstanding"
                  value={money(outstanding)}
                  foot="Awaiting payment"
                />
                <Stat
                  icon={Users}
                  tone="purple"
                  label="Customers billed"
                  value={invoices.length}
                  foot="With deliveries this month"
                />
              </div>
              <section className="card full-card">
                <div className="list-heading">
                  <div>
                    <h3>Monthly statements</h3>
                    <p>Charges reflect completed deliveries only</p>
                  </div>
                  <div className="date-switch">
                    <button
                      aria-label="Previous month"
                      onClick={() => setMonth(monthOffset(month, -1))}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span>{monthLabel(month)}</span>
                    <button
                      aria-label="Next month"
                      onClick={() => setMonth(monthOffset(month, 1))}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                <FilterBar
                  search={search}
                  setSearch={setSearch}
                  placeholder="Search customers..."
                />
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>CUSTOMER</th>
                        <th>DELIVERIES</th>
                        <th>BILLED</th>
                        <th>PAID</th>
                        <th>BALANCE</th>
                        <th className="right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <CustomerCell customer={row} />
                          </td>
                          <td>
                            <b>{row.deliveries} days</b>
                          </td>
                          <td>
                            <b>{money(row.amount)}</b>
                          </td>
                          <td className="positive-text">{money(row.paid)}</td>
                          <td>
                            <b
                              className={
                                row.due > 0 ? "due-text" : "positive-text"
                              }
                            >
                              {money(row.due)}
                            </b>
                          </td>
                          <td className="right">
                            <button
                              className="row-link"
                              disabled={row.due <= 0}
                              onClick={() =>
                                setPaymentModal({
                                  customerId: row.id,
                                  amount: row.due,
                                })
                              }
                            >
                              {row.due > 0 ? "Record payment" : "Paid"}{" "}
                              {row.due > 0 && <ArrowRight size={14} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {invoiceRows.length === 0 && (
                    <EmptyState text="No billing activity for this month." />
                  )}
                </div>
                <div className="table-footer">
                  Showing {invoiceRows.length} of {invoices.length} statements
                </div>
              </section>
              <div className="info-note">
                <CircleHelp size={17} /> Charges are calculated from deliveries
                marked complete. Payment records are stored in this browser.
              </div>
            </>
          )}
          {page === "settings" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">WORKSPACE</span>
                  <h1>Settings</h1>
                  <p>A few things to know about your Milkmate workspace.</p>
                </div>
              </div>
              <div className="settings-grid">
                <section className="card settings-card">
                  <div className="settings-icon">
                    <Milk size={25} />
                  </div>
                  <h3>Welcome to Milkmate</h3>
                  <p>
                    Your data lives in this browser. Add customers, update
                    deliveries, and record payments. Everything saves
                    automatically as you work.
                  </p>
                  <div className="guide-list">
                    <div>
                      <span>1</span>Add customers and set their daily milk
                      quantity and price.
                    </div>
                    <div>
                      <span>2</span>Mark each day's deliveries complete or
                      skipped.
                    </div>
                    <div>
                      <span>3</span>View monthly balances, record payments, and
                      export a CSV.
                    </div>
                  </div>
                </section>
                <section className="card settings-card">
                  <div className="settings-icon orange">
                    <RotateCcw size={23} />
                  </div>
                  <h3>Demo data</h3>
                  <p>
                    Start over with the original sample customers, deliveries,
                    and payments. This will replace all changes saved in this
                    browser.
                  </p>
                  <button
                    className="outline-button danger-button"
                    onClick={resetData}
                  >
                    <RotateCcw size={17} /> Reset demo data
                  </button>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
      {customerModal && (
        <CustomerModal
          customer={customerModal}
          onClose={() => setCustomerModal(null)}
          onSave={saveCustomer}
        />
      )}
      {paymentModal && (
        <PaymentModal
          payment={paymentModal}
          customer={data.customers.find(
            (item) => item.id === paymentModal.customerId,
          )}
          month={month}
          onClose={() => setPaymentModal(null)}
          onSave={recordPayment}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, tone, label, value, foot, trend }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className={`stat-icon ${tone}`}>
          <Icon size={21} strokeWidth={2} />
        </span>
        <MoreHorizontal size={19} className="stat-more" />
      </div>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-foot">
        {trend === "up" && <ArrowUpRight size={14} />} {foot}
      </span>
    </div>
  );
}
function CustomerCell({ customer }) {
  return (
    <div className="customer-cell">
      <span className={`avatar avatar-${customer.name.charCodeAt(0) % 5}`}>
        {initials(customer.name)}
      </span>
      <span>
        <b>{customer.name}</b>
        <small>{customer.phone}</small>
      </span>
    </div>
  );
}
function RouteBadge({ route }) {
  return (
    <span className={`route-badge route-${routeColors[route] || "blue"}`}>
      <MapPin size={13} />
      {route}
    </span>
  );
}
function StatusBadge({ status }) {
  return (
    <span className={`pill pill-${status}`}>
      <span className="pill-dot" />
      {status[0].toUpperCase() + status.slice(1)}
    </span>
  );
}
function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <Search size={27} />
      <b>Nothing to show yet</b>
      <span>{text}</span>
    </div>
  );
}
function FilterBar({
  search,
  setSearch,
  route,
  setRoute,
  showRoute,
  placeholder,
}) {
  return (
    <div className="filter-bar">
      <label className="search-field">
        <Search size={18} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholder}
          aria-label="Search"
        />
      </label>
      {showRoute && (
        <label className="select-field">
          <select
            aria-label="Filter by route"
            value={route}
            onChange={(event) => setRoute(event.target.value)}
          >
            {["All routes", ...Object.keys(routeColors)].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <ChevronDown size={16} />
        </label>
      )}
    </div>
  );
}
function VolumeChart({ deliveries, day }) {
  const values = Array.from({ length: 7 }, (_, index) => {
    const date = offsetDay(day, index - 6);
    return {
      date,
      litres: deliveries
        .filter((item) => item.date === date && item.status === "delivered")
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    };
  });
  const max = Math.max(1, ...values.map((item) => item.litres));
  return (
    <div className="chart">
      <div className="chart-bars">
        {values.map((item, index) => (
          <div
            className="chart-column"
            key={item.date}
            title={`${item.litres} L on ${formatShort(item.date)}`}
          >
            <div
              className={`chart-bar ${index === 6 ? "latest" : ""}`}
              style={{ height: `${Math.max(5, (item.litres / max) * 100)}%` }}
            />
            <span>
              {new Date(`${item.date}T12:00:00`).toLocaleDateString("en-IN", {
                weekday: "short",
              })}
            </span>
          </div>
        ))}
      </div>
      <div className="chart-note">
        <span className="chart-note-dot" /> Daily litres delivered
      </div>
    </div>
  );
}
function CustomerModal({ customer, onClose, onSave }) {
  const [form, setForm] = useState(customer);
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">CUSTOMER DETAILS</span>
            <h2 id="customer-modal-title">
              {customer.id ? "Edit customer" : "Add a customer"}
            </h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(form);
          }}
        >
          <div className="form-grid">
            <label className="field full">
              Full name
              <input
                required
                autoFocus
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="e.g. Aarav Sharma"
              />
            </label>
            <label className="field">
              Phone number
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(event) => set("phone", event.target.value)}
                placeholder="e.g. 9812345601"
              />
            </label>
            <label className="field">
              Delivery route
              <select
                value={form.route}
                onChange={(event) => set("route", event.target.value)}
              >
                {Object.keys(routeColors).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="field full">
              Delivery address
              <input
                required
                value={form.address}
                onChange={(event) => set("address", event.target.value)}
                placeholder="House number, street, area"
              />
            </label>
            <label className="field">
              Milk type
              <select
                value={form.plan}
                onChange={(event) => set("plan", event.target.value)}
              >
                <option>Cow milk</option>
                <option>Buffalo milk</option>
              </select>
            </label>
            <label className="field">
              Quantity per day (L)
              <input
                required
                type="number"
                min="0.1"
                step="0.1"
                value={form.quantity}
                onChange={(event) => set("quantity", event.target.value)}
              />
            </label>
            <label className="field">
              Price per litre (₹)
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => set("price", event.target.value)}
              />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="outline-button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit">
              {customer.id ? "Save changes" : "Add customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function PaymentModal({ payment, customer, month, onClose, onSave }) {
  const [amount, setAmount] = useState(payment.amount);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">RECORD PAYMENT</span>
            <h2 id="payment-modal-title">Payment received</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <p className="modal-copy">
          Record a payment from <b>{customer?.name}</b> for {monthLabel(month)}.
          Current balance: <b>{money(payment.amount)}</b>.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(payment.customerId, amount);
          }}
        >
          <label className="field">
            Amount received (₹)
            <input
              required
              autoFocus
              type="number"
              min="0.01"
              max={payment.amount}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="outline-button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit">
              Save payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
