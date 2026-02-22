import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import "./RenewalStack.css";

const getDueMeta = (days) => {
  if (days < 0) return { text: "Overdue", color: "#dc2626" };
  if (days === 2) return { text: "Due Today", color: "#dc2626" };
  if (days <= 3) return { text: `Due in ${days} day${days > 1 ? "s" : ""}`, color: "#d97706" };
  return { text: `Due in ${days} days`, color: "#16a34a" };
};

const REMINDER_FLOW = [
  { key: "Not Contacted", icon: "🔔" }, { key: "Called", icon: "📞" },
  { key: "Reminder Sent", icon: "💬" }, { key: "Visited", icon: "✅" }
];

const nextReminderStatus = (current) => {
  const idx = REMINDER_FLOW.findIndex(r => r.key === current);
  return REMINDER_FLOW[(idx + 1) % REMINDER_FLOW.length];
};

export default function RenewalStack() {
  const [customers, setCustomers] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/customers");
      setCustomers(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const updateCustomerField = async (customerId, field, value) => {
    setCustomers(customers.map(c => c.id === customerId ? { ...c, [field]: value } : c));
    await fetch(`http://localhost:3000/api/customers/${customerId}/meta`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value })
    });
  };

  const updateMedicineStatus = async (medicineId, status) => {
    setCustomers(customers.map(c => ({
      ...c, medicines: c.medicines.map(m => m.id === medicineId ? { ...m, orderStatus: status } : m)
    })));
    await fetch(`http://localhost:3000/api/medicines/${medicineId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderStatus: status })
    });
  };

  const buckets = { OVERDUE: [], DUE_SOON: [], LATER: [] };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  customers.forEach((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return;
    const activeMeds = [];
    let earliestDays = Infinity;

    c.medicines?.forEach((m) => {
      if (!m.due_date || m.orderStatus === "CANCELLED" || m.purchaseStatus === "PURCHASED") return;

      const renewalDate = new Date(m.due_date);
      renewalDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((renewalDate - today) / 86400000);
      earliestDays = Math.min(earliestDays, daysLeft);

      activeMeds.push({ ...m, daysLeft, renewalDateStr: renewalDate.toDateString() });
    });

    
    if (!activeMeds.length) return;
    const patient = { ...c, activeMeds, earliestDays };
    if (earliestDays < 0) buckets.OVERDUE.push(patient);
    else if (earliestDays <= 3) buckets.DUE_SOON.push(patient);
    else buckets.LATER.push(patient);

    buckets.OVERDUE.sort((a, b) => a.earliestDays - b.earliestDays); 
    buckets.DUE_SOON.sort((a, b) => a.earliestDays - b.earliestDays); 
    buckets.LATER.sort((a, b) => a.earliestDays - b.earliestDays);

  });

  const renderBucket = (title, list) => (
    <>
      {list.length > 0 && <h3 className="page-title">{title}</h3>}
      <div className="stack-list">
        {list.map((p, i) => {
          const key = `${title}-${i}`;
          const due = getDueMeta(p.earliestDays);
          const remMeta = REMINDER_FLOW.find(r => r.key === p.reminderStatus) || REMINDER_FLOW[0];

          return (
            <div key={key} className="renewal-card">
              <div className="card-header" onClick={() => setExpanded({ ...expanded, [key]: !expanded[key] })}>
                <div className="header-info">
                  <h3>{p.name} <span style={{ marginLeft: 10, fontSize: "0.9rem", color: due.color }}>• {due.text}</span></h3>
                  <span title={p.reminderStatus} style={{ cursor: "pointer", fontSize: "1.1rem" }}
                    onClick={(e) => { e.stopPropagation(); updateCustomerField(p.id, "reminderStatus", nextReminderStatus(p.reminderStatus).key); }}>
                    {remMeta.icon}
                  </span>
                  <input type="text" placeholder="Add note..." value={p.renewalNote || ""} onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateCustomerField(p.id, "renewalNote", e.target.value)}
                  />
                </div>
                <span>{expanded[key] ? "▲" : "▼"}</span>
              </div>
              {expanded[key] && (
                <div className="card-body">
                  {p.activeMeds.map((m) => (
                    <div key={m.id} className={`medicine-row ${m.orderStatus === "CONFIRMED" ? "med-confirmed" : m.orderStatus === "HOLD" ? "med-hold" : ""}`}>
                      <div className="med-details">
                        <h4>{m.name}</h4>
                        <span>📅 {m.renewalDateStr} – {m.daysLeft < 0 ? "Overdue" : `${m.daysLeft} day(s) left`}</span>
                        <span className={`status-pill status-${m.orderStatus.toLowerCase()}`}>{m.orderStatus}</span>
                      </div>
                      <div className="action-buttons">
                        <button className="btn btn-hold" onClick={() => updateMedicineStatus(m.id, "HOLD")}>Hold</button>
                        <button className="btn btn-confirm" onClick={() => updateMedicineStatus(m.id, "CONFIRMED")}>Confirm</button>
                        <button className="btn btn-cancel" onClick={() => updateMedicineStatus(m.id, "CANCELLED")}>Cancel</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="content-wrap">
          <h2 className="page-title">Renewal Stack</h2>
          <input className="search-input" placeholder="🔍 Search patient name..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {renderBucket("🔴 Overdue", buckets.OVERDUE)}
          {renderBucket("🟠 Due Soon", buckets.DUE_SOON)}
          {renderBucket("🟢 Due Later", buckets.LATER)}
        </div>
      </div>
    </>
  );
}
