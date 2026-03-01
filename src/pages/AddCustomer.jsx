import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./AddCustomer.css";

const freqCount = (freq) => (Array.isArray(freq) ? freq.length : 0);
const MED_TYPES = ["Tablet", "Syrup", "Capsule", "Drops", "Cream", "Injection", "General items"];

export default function AddCustomer() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState([]);
  
  // Added "type" to initial state
  const [medicines, setMedicines] = useState([{ name: "", type: "Tablet", freq: [], days: "", tablets: 0 }]);
  
  const [medicineList, setMedicineList] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3000/api/medicines/search")
      .then(res => {
        if (!res.ok) throw new Error("Server not responding");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setMedicineList(data);
      })
      .catch(e => console.error("Search API Error (Did you restart server.js?):", e));
  }, []);

  const toggleTag = (tag) => {
    setTags(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
  };

  const addMedicine = () => {
    setMedicines([...medicines, { name: "", type: "Tablet", freq: [], days: "", tablets: 0 }]);
  };

  const deleteMedicine = (index) => {
    const copy = [...medicines];
    copy.splice(index, 1);
    setMedicines(copy);
  };

  const updateMedicine = (index, field, value) => {
    const copy = [...medicines];
    copy[index][field] = value;
    if (field === "days") {
        const fCount = freqCount(copy[index].freq);
        copy[index].tablets = fCount * Number(value || 0);
    }
    setMedicines(copy);
  };

  const toggleFreq = (index, f) => {
    const copy = [...medicines];
    const current = copy[index].freq;
    copy[index].freq = current.includes(f) ? current.filter(x => x !== f) : [...current, f];
    copy[index].tablets = freqCount(copy[index].freq) * Number(copy[index].days || 0);
    setMedicines(copy);
  };

  const saveCustomer = async () => {
    if (!name || !phone) return alert("Name and phone required");
    try {
        const res = await fetch("http://localhost:3000/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone, tags, medicines })
        });
        if (res.ok) navigate("/customers");
        else alert("Failed to save");
    } catch (e) {
        console.error(e);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="card">
          <div className="card-header">
            <h2>New Prescription</h2>
            <p className="subtitle">Enter customer details and medication below</p>
          </div>

          <div className="section-title">CUSTOMER DETAILS</div>
          <div className="two-col">
            <div className="input-group">
              <label>Full Name</label>
              <input placeholder="e.g. Rajesh Kumar" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input placeholder="e.g. 9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="tags-container">
            <span className="tag-label">Category:</span>
            <div className="tags">
              {["Weekly", "Monthly", "Irregular"].map(t => (
                <label key={t} className={tags.includes(t) ? "active" : ""}>
                  <input type="checkbox" checked={tags.includes(t)} onChange={() => toggleTag(t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div className="section-title">MEDICATION LIST</div>
          <div className="med-grid-layout med-header">
            <div>MEDICINE NAME</div>
            <div>TYPE</div>
            <div style={{ textAlign: "center" }}>FREQUENCY</div>
            <div style={{ textAlign: "center" }}>DAYS</div>
            <div style={{ textAlign: "center" }}>TOTAL</div>
            <div style={{ textAlign: "center" }}>ACTION</div>
          </div>

          {medicines.map((m, index) => {
            const filteredMeds = medicineList.filter(med => 
              med.toLowerCase().includes((m.name || "").toLowerCase())
            );

            return (
              <div key={index} className="med-row med-grid-layout">
                
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    placeholder="Search medicine..."
                    value={m.name}
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
                  value={m.type} 
                  onChange={(e) => updateMedicine(index, "type", e.target.value)}
                >
                  {MED_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>

                <div className="freq-group">
                  {["M", "A", "E", "N"].map(f => (
                    <label key={f} className={`freq-label ${m.freq.includes(f) ? "active" : ""}`}>
                      <input type="checkbox" checked={m.freq.includes(f)} onChange={() => toggleFreq(index, f)} />
                      {f}
                    </label>
                  ))}
                </div>

                <input className="small-input" type="number" placeholder="0" value={m.days} onChange={(e) => updateMedicine(index, "days", e.target.value)} />
                <input className="small-input readonly" readOnly value={m.tablets} />
                
                <button className="delete-btn" onClick={() => deleteMedicine(index)}>✕</button>
              </div>
            );
          })}

          <div className="btn-group">
            <button className="add-med" onClick={addMedicine}>+ Add Medicine</button>
            <button className="save-cust" onClick={saveCustomer}>✔ Save Customer</button>
          </div>
        </div>
      </div>
    </>
  );
}