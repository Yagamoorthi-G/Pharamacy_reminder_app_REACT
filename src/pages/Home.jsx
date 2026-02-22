import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Home.css";
import logo from "../assets/logo.png";

export default function Home() {
  const navigate = useNavigate();
  
  // State to hold data from SQLite
  const [customers, setCustomers] = useState([]);
  const [popup, setPopup] = useState(null);

  // Fetch data on load safely
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/customers");
        const data = await response.json();
        
        // CRASH-PROOF CHECK: Only set customers if the backend returned a valid array
        if (Array.isArray(data)) {
          setCustomers(data);
        } else {
          console.error("Backend returned an error instead of an array:", data);
        }
      } catch (error) {
        console.error("Failed to fetch data or server is offline:", error);
      }
    };
    fetchData();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to midnight for accurate math

  let dueToday = [];
  let overdue = [];
  let purchaseMap = {};

  customers.forEach(c => {
    c.medicines?.forEach(m => {
      // Skip if no due date was set
      if (!m.due_date) return;
      
      // Skip if cancelled (we will add this status to the DB later)
      if (m.orderStatus === "CANCELLED") return;

      const renewalDate = new Date(m.due_date);
      renewalDate.setHours(0, 0, 0, 0);

      const diff = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));

      const entry = {
        customer: c.name,
        phone: c.phone,
        medicine: m.name,
        daysLeft: diff
      };

      if (diff < 0) overdue.push(entry);
      if (diff <= 1) dueToday.push(entry);

      // Populate purchase map if confirmed
      if (m.orderStatus === "CONFIRMED") {
        purchaseMap[m.name] ??= [];
        purchaseMap[m.name].push({
          customer: c.name,
          phone: c.phone
        });
      }
    });
  });

  return (
    <>
      <Navbar />

      <div className="home-container">
        <div className="home-content">

          {/* HEADER */}
          <div className="shop-header card">
            <div>
              <h1>Kumaran Medicals & General Store</h1>
              <p>Sadukaramadam 1st Street, Salavanpet, Vellore - 632001</p>
              <div className="shop-meta">
                <span className="pill green">📞 6374674545</span>
                <span className="pill yellow">📅 {new Date().toDateString()}</span>
              </div>
            </div>
            <img src={logo} alt="logo" />
          </div>

          {/* STATS */}
          <div className="stats-grid">
            <Stat title="Total Customers" value={customers.length} icon="👥"
              onClick={() => setPopup({ type: "customers", data: customers })}
            />
            <Stat title="Due Today" value={dueToday.length} icon="⚠️"
              onClick={() => setPopup({ type: "renewal", data: dueToday })}
            />
            <Stat title="Overdue" value={overdue.length} icon="⏰"
              onClick={() => setPopup({ type: "renewal", data: overdue })}
            />
            <Stat title="Medicines to Buy" value={Object.keys(purchaseMap).length} icon="💊"
              onClick={() => setPopup({ type: "purchase", data: purchaseMap })}
            />
          </div>

          {/* TODAY PRIORITY */}
          <div className="dashboard-grid">
            <div className="section card">
              <h3>Today’s Priority</h3>
              {dueToday.length === 0 && overdue.length === 0 ? (
                <p className="empty-state">✅ No urgent renewals today</p>
              ) : (
                <>
                  {overdue.map((x, i) => (
                    <div key={`overdue-${i}`} className="alert red">
                      🔴 {x.customer} – Overdue
                    </div>
                  ))}
                  {dueToday.map((x, i) => (
                    <div key={`due-${i}`} className="alert yellow">
                      🟡 {x.customer} – Due Today
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* QUICK ACTIONS */}
            <div className="section card">
              <h3>Quick Actions</h3>
              <div className="actions">
                <a href="/add">➕ Add Customer</a>
                <a href="/renewals">🔁 Renewals</a>
                <a href="/summary">📋 Summary</a>
                <a href="/customers">👥 Customers</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MODAL */}
      {popup && (
      <div className="modal-overlay" onClick={() => setPopup(null)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          
          <button className="modal-close" onClick={() => setPopup(null)}>
            ✕
          </button>

          <h3>
            {popup.type === "customers" && "Customer List"}
            {popup.type === "renewal" && "Renewals Due"}
            {popup.type === "purchase" && "Medicines to Buy"}
          </h3>

          <div className="modal-subtitle">
            Quick preview — full details available
          </div>

          <div className="modal-content">
            {popup.type === "customers" &&
              popup.data.map((c, i) => (
                <div key={i} className="modal-item">
                  👤 {c.name} <br /> 📞 {c.phone}
                </div>
              ))}

            {popup.type === "renewal" &&
              popup.data.map((r, i) => (
                <div key={i} className="modal-item">
                  <strong>{r.customer}</strong> <br />
                  💊 {r.medicine} — {r.daysLeft} day(s)
                </div>
              ))}

            {popup.type === "purchase" &&
              Object.entries(popup.data).map(([med, list]) => (
                <div key={med} className="modal-item">
                  <strong>{med}</strong>
                  {list.map((c, i) => (
                    <div key={i}>• {c.customer}</div>
                  ))}
                </div>
              ))}
          </div>

          <div className="modal-actions">
            <button
              className="modal-primary"
              onClick={() => {
                setPopup(null);
                navigate(
                  popup.type === "purchase"
                    ? "/summary"
                    : popup.type === "customers"
                    ? "/customers"
                    : "/renewals"
                );
              }}
            >
              View Full Details
            </button>

            <div className="modal-secondary" onClick={() => setPopup(null)}>
              No thanks
            </div>
          </div>

        </div>
      </div>
    )}

    </>
  );
}

function Stat({ title, value, icon, onClick }) {
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: "pointer" }}>
      <div className="stat-icon">{icon}</div>
      <div>
        <h4>{title}</h4>
        <h2>{value}</h2>
      </div>
    </div>
  );
}