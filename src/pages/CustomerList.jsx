import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./CustomerList.css";

/* =========================
   CALCULATE RENEWAL INFO
   ========================= */
const calcRenewalInfo = (customer) => {
  if (!customer.medicines || customer.medicines.length === 0) return null;

  let earliestDays = Infinity;
  let earliestDate = null;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to midnight for accurate day counts

  customer.medicines.forEach((m) => {
    if (!m.due_date) return;
    
    const renewalDate = new Date(m.due_date);
    renewalDate.setHours(0, 0, 0, 0);

    const daysLeft = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < earliestDays) {
      earliestDays = daysLeft;
      earliestDate = renewalDate;
    }
  });

  if (earliestDays === Infinity) return null;

  return {
    daysLeft: earliestDays,
    renewalDate: earliestDate
  };
};

/* =========================
   COLOR LOGIC
   ========================= */
const getDueColor = (days) => {
  if (days <= 1) return "#dc2626";      // 🔴 Red (0,1, overdue)
  if (days <= 3) return "#d97706";      // 🟠 Orange (2–3)
  return "#16a34a";                     // 🟢 Green (4+)
};

export default function CustomerList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);

  /* =========================
     FETCH DATA FROM SQLITE
     ========================= */
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/customers");
        const data = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error("Failed to fetch customers:", error);
      }
    };

    fetchCustomers();
  }, []);

  /* =========================
     BUILD & SORT LIST
     ========================= */
  const list = customers
    .map((c) => {
      const renewal = calcRenewalInfo(c);
      return renewal ? { ...c, renewal } : null;
    })
    .filter(Boolean)
    .filter((c) => {
      if (!search) return true;
      return (
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
      );
    })
    // 🔥 Always sort by nearest renewal
    .sort((a, b) => a.renewal.daysLeft - b.renewal.daysLeft);

  /* =========================
     RENDER
     ========================= */
  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="content-wrapper">
          <h2 className="page-title">Customer List</h2>

          {/* SEARCH */}
          <input
            className="search-input"
            placeholder="🔍 Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* CUSTOMER CARDS */}
          {list.map((c) => (
            <div key={c.id} className="customer-card">
              <div className="card-header">
                <div>
                  <h3>
                    {c.name}{" "}
                    <span
                      style={{
                        fontSize: "0.9rem",
                        color: getDueColor(c.renewal.daysLeft)
                      }}
                    >
                      ●{" "}
                      {c.renewal.daysLeft < 0
                        ? "Overdue"
                        : c.renewal.daysLeft === 0
                        ? "Due Today"
                        : `Due in ${c.renewal.daysLeft} day(s)`}
                    </span>
                  </h3>

                  <p>📞 {c.phone}</p>
                </div>
              </div>

              <div className="card-body">
                <p>
                  <strong>Added On:</strong>{" "}
                  {c.last_visit 
                    ? new Date(c.last_visit.replace(' ', 'T') + 'Z').toDateString() 
                    : "N/A"}
                </p>

                <p>
                  <strong>Next Expected Renewal:</strong>{" "}
                  {c.renewal.renewalDate.toDateString()}
                </p>

                <button
                  className="btn-edit"
                  onClick={() => navigate(`/edit/${c.id}`)}
                >
                  ✎ Edit Details
                </button>
              </div>
            </div>
          ))}

          {list.length === 0 && (
            <p className="empty-state">No matching customers found in database.</p>
          )}
        </div>
      </div>
    </>
  );
}