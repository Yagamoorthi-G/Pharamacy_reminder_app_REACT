import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import "./PurchaseSummary.css";

export default function PurchaseSummary() {
  const [customers, setCustomers] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch active customers and permanent history ledger
  const fetchData = async () => {
    try {
      const [custRes, histRes] = await Promise.all([
        fetch("http://localhost:3000/api/customers"),
        fetch("http://localhost:3000/api/purchase-history")
      ]);
      setCustomers(await custRes.json());
      setHistory(await histRes.json());
    } catch (e) { console.error("Failed to fetch data:", e); }
  };

  useEffect(() => { fetchData(); }, []);

  // Build the summary strictly for CONFIRMED orders
  const summary = useMemo(() => {
    const grouped = {};
    customers.forEach(c => {
      c.medicines?.forEach(m => {
        if (!m.name || m.orderStatus !== "CONFIRMED") return;

        if (!grouped[m.name]) grouped[m.name] = { name: m.name, totalTablets: 0, customers: [] };
        grouped[m.name].totalTablets += Number(m.tablets || 0);
        grouped[m.name].customers.push({ name: c.name, phone: c.phone, renewalDate: m.due_date });
      });
    });
    return Object.values(grouped);
  }, [customers]);

  const markPurchased = async (medicineName) => {
    // Find all IDs that need to be rolled over
    const medsToUpdate = [];
    customers.forEach(c => {
      c.medicines.forEach(m => {
        if (m.name === medicineName && m.orderStatus === "CONFIRMED") {
          medsToUpdate.push(m.id);
        }
      });
    });

    // Send the rollover command to the backend
    for (const medId of medsToUpdate) {
      await fetch(`http://localhost:3000/api/medicines/${medId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseStatus: "PURCHASED", purchasedAt: new Date().toISOString() })
      });
    }
    
    // Instantly refresh the screen to remove it from the buy list
    fetchData();
    alert(`Successfully logged ${medicineName} to history and rolled over to next month!`);
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="content-wrap">
          <div className="summary-header">
            <div>
              <h2>Purchase Summary</h2>
              <p className="subtitle">Confirmed medicines to purchase</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-mark" onClick={() => setShowHistory(true)}>🧾 Purchased History</button>
              <button className="btn-print" onClick={() => window.print()}>🖨️ Print</button>
            </div>
          </div>

          {summary.length === 0 && <div className="empty-state">No confirmed medicines to purchase</div>}

          <div className="summary-grid">
            {summary.map((item, idx) => (
              <div key={idx} className="summary-card card-pending">
                <div className="card-top">
                  <div className="med-info">
                    <h3>{item.name}</h3>
                    <span className="qty-badge">{item.totalTablets} tablets</span>
                  </div>
                  <button className="btn-mark" onClick={() => markPurchased(item.name)}>
                    Mark Purchased & Renew
                  </button>
                </div>
                <details className="customer-details">
                  <summary>View {item.customers.length} customer(s)</summary>
                  <ul className="cust-list">
                    {item.customers.map((c, i) => (
                      <li key={i}>
                        <strong>{c.name}</strong><span className="phone"> ({c.phone})</span>
                        {c.renewalDate && <span className="date">Due: {new Date(c.renewalDate.replace(' ', 'T') + 'Z').toLocaleDateString()}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowHistory(false)}>✕</button>
            <h3>Purchased Medicines</h3>
            <div className="modal-content">
              {history.length === 0 && <div className="empty-state">No purchase history yet</div>}
              {history.map((h, i) => (
                <div key={i} className="modal-item">
                  <strong>{h.medicine_name}</strong>
                  <div>👤 {h.customer_name} ({h.tablets} tabs)</div>
                  <div>🕒 {h.purchasedAt ? new Date(h.purchasedAt.replace(' ', 'T') + 'Z').toLocaleString() : "—"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}