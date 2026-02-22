import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import "./EditCustomer.css";

const freqCount = (freq) => (freq ? freq.split("/").length : 0);

export default function EditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [undoData, setUndoData] = useState(null);
  const undoTimer = useRef(null);

  // Fetch data from SQLite on load
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/customers/${id}`);
        if (!response.ok) throw new Error("Customer not found");
        const data = await response.json();
        
        setCustomer({ name: data.name, phone: data.phone });
        setMedicines(data.medicines);
      } catch (error) {
        console.error(error);
      }
    };
    fetchCustomer();
  }, [id]);

  if (!customer) return <div className="page-container"><h2>Loading...</h2></div>;

  /* =========================
     MEDICINE ACTIONS
     ========================= */
  const addMedicine = () => {
    setMedicines([...medicines, { name: "", frequency: "", days: 0, tablets: 0 }]);
  };

  const deleteMedicine = (index) => {
    const copy = [...medicines];
    const deleted = copy[index];
    copy.splice(index, 1);
    setMedicines(copy);

    setUndoData({ index, medicine: deleted });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoData(null), 10000);
  };

  const undoDelete = () => {
    if (!undoData) return;
    const copy = [...medicines];
    copy.splice(undoData.index, 0, undoData.medicine);
    setMedicines(copy);
    setUndoData(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  const updateMedicine = (index, field, value) => {
    const copy = [...medicines];
    copy[index][field] = value;

    if (field === "days") {
      const freq = freqCount(copy[index].frequency);
      copy[index].tablets = freq > 0 ? freq * Number(value || 0) : 0;
    }
    setMedicines(copy);
  };

  const toggleFrequency = (index, f) => {
    const copy = [...medicines];
    const current = copy[index].frequency ? copy[index].frequency.split("/") : [];

    copy[index].frequency = current.includes(f)
      ? current.filter(x => x !== f).join("/")
      : [...current, f].join("/");

    const freq = freqCount(copy[index].frequency);
    const days = copy[index].days || 0;
    copy[index].tablets = freq * days;
    setMedicines(copy);
  };

  /* =========================
     SAVE TO SQLITE
     ========================= */
  const saveAll = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customer.name,
          phone: customer.phone,
          medicines: medicines
        })
      });

      if (response.ok) {
        alert("Changes saved successfully to database!");
        navigate("/customers");
      } else {
        alert("Failed to save changes.");
      }
    } catch (error) {
      console.error("Database connection failed:", error);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="header-section">
          <h2>Edit Prescription</h2>
          <div className="customer-badge">
            <input 
              className="name" 
              value={customer.name} 
              onChange={e => setCustomer({...customer, name: e.target.value})}
              style={{border: "none", fontWeight: "bold", fontSize: "1.1rem"}}
            />
            <input 
              className="phone" 
              value={customer.phone} 
              onChange={e => setCustomer({...customer, phone: e.target.value})}
              style={{border: "none", color: "var(--primary-green)"}}
            />
          </div>
        </div>

        <div className="visits-list">
          <div className="card">
            <div className="visit-header">
              <span className="visit-date">Active Prescription</span>
            </div>

            <div className="med-grid-header">
              <div>Medicine</div>
              <div className="center-text">Freq</div>
              <div>Days</div>
              <div>Total</div>
              <div></div>
            </div>

            <div className="med-grid-body">
              {medicines.map((m, index) => (
                <div key={index} className="med-row">
                  <input
                    value={m.name || ""}
                    placeholder="Medicine Name"
                    onChange={(e) => updateMedicine(index, "name", e.target.value)}
                  />

                  <div className="freq-group">
                    {["M", "A", "E", "N"].map(f => (
                      <label key={f} className={`freq-label ${m.frequency?.includes(f) ? "active" : ""}`}>
                        <input
                          hidden
                          type="checkbox"
                          checked={m.frequency?.includes(f) || false}
                          onChange={() => toggleFrequency(index, f)}
                        />
                        {f}
                      </label>
                    ))}
                  </div>

                  <input
                    type="number"
                    value={m.days || ""}
                    placeholder="0"
                    onChange={(e) => updateMedicine(index, "days", e.target.value)}
                  />

                  <input type="number" readOnly value={m.tablets || 0} className="readonly" />

                  <button className="btn-delete" onClick={() => deleteMedicine(index)}>✕</button>
                </div>
              ))}
            </div>

            <div className="card-footer">
              <button className="btn-add" onClick={addMedicine}>+ Add Medicine</button>
            </div>
          </div>
        </div>

        <div className="footer-actions">
          <button className="btn-save" onClick={saveAll}>💾 Save All Changes</button>
        </div>
      </div>

      {undoData && (
        <div style={{ position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", background: "#333", color: "white", padding: "10px 20px", borderRadius: "8px", display: "flex", gap: "15px", alignItems: "center" }}>
          Medicine deleted
          <button onClick={undoDelete} style={{ background: "transparent", color: "#facc15", border: "none", fontWeight: "bold", cursor: "pointer" }}>UNDO</button>
        </div>
      )}
    </>
  );
}
