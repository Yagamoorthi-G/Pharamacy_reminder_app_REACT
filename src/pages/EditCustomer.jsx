import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import "./EditCustomer.css";

const freqCount = (freq) => (freq ? freq.split("/").length : 0);
const MED_TYPES = ["Tablet", "Syrup", "Capsule", "Drops", "Cream", "Injection", "General items"];

export default function EditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [undoData, setUndoData] = useState(null);
  const undoTimer = useRef(null);
  
  const [medicineList, setMedicineList] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);

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

    const fetchMedicines = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/medicines/search");
        if (!res.ok) throw new Error("Server not responding");
        const data = await res.json();
        if (Array.isArray(data)) setMedicineList(data);
      } catch(e) { 
        console.error("Search API Error:", e);
      }
    };

    fetchCustomer();
    fetchMedicines();
  }, [id]);

  if (!customer) return <div className="page-container"><h2>Loading...</h2></div>;

  const addMedicine = () => {
    setMedicines([...medicines, { name: "", type: "Tablet", frequency: "", days: 0, tablets: 0 }]);
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

  // NEW: DELETE CUSTOMER FUNCTION
  const deleteCustomer = async () => {
    const confirmDelete = window.confirm(
      "🛑 WARNING 🛑\n\nAre you sure you want to permanently delete this customer and all of their medicines? This cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(`http://localhost:3000/api/customers/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        alert("Customer permanently deleted.");
        navigate("/customers");
      } else {
        alert("Failed to delete customer.");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
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
              <div>Type</div>
              <div className="center-text">Freq</div>
              <div>Days</div>
              <div>Total</div>
              <div></div>
            </div>

            <div className="med-grid-body">
              {medicines.map((m, index) => {
                const filteredMeds = medicineList.filter(med => 
                  med.toLowerCase().includes((m.name || "").toLowerCase())
                );

                return (
                  <div key={index} className="med-row">
                    
                    <div style={{ position: "relative", width: "100%" }}>
                      <input
                        value={m.name || ""}
                        placeholder="Search medicine..."
                        onChange={(e) => {
                          updateMedicine(index, "name", e.target.value);
                          setActiveDropdown(index);
                        }}
                        onFocus={() => setActiveDropdown(index)}
                        onBlur={() => setActiveDropdown(null)}
                        autoComplete="off"
                        style={{ width: "100%", boxSizing: "border-box" }}
                      />

                      {activeDropdown === index && filteredMeds.length > 0 && (
                        <div style={{
                          position: "absolute", top: "100%", left: 0, width: "100%",
                          background: "white", border: "1px solid #e5e7eb", zIndex: 999,
                          maxHeight: "200px", overflowY: "auto", boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                          borderRadius: "4px", marginTop: "2px"
                        }}>
                          {filteredMeds.map((med, i) => (
                            <div
                              key={i}
                              onMouseDown={(e) => {
                                e.preventDefault(); 
                                updateMedicine(index, "name", med);
                                setActiveDropdown(null);
                              }}
                              style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #f3f4f6", color: "#1f2937", textAlign: "left" }}
                              onMouseEnter={(e) => e.target.style.background = "#f0fdf4"}
                              onMouseLeave={(e) => e.target.style.background = "white"}
                            >
                              {med}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* NEW: Medicine Type Dropdown */}
                    <select 
                      className="type-select" 
                      value={m.type || "Tablet"} 
                      onChange={(e) => updateMedicine(index, "type", e.target.value)}
                    >
                      {MED_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>

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
                );
              })}
            </div>

            <div className="card-footer">
              <button className="btn-add" onClick={addMedicine}>+ Add Medicine</button>
            </div>
          </div>

          {/* NEW: DANGER ZONE SECTON */}
          <div className="card danger-zone">
            <div className="visit-header">
              <span className="visit-date" style={{color: "#dc2626"}}>⚠️ Danger Zone</span>
            </div>
            <p style={{color: "var(--text-light)", marginBottom: "15px"}}>
              Permanently remove this customer and all of their prescriptions from the database. This action cannot be undone.
            </p>
            <button className="btn-delete-customer" onClick={deleteCustomer}>
              🗑️ Delete Customer
            </button>
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