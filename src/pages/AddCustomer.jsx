import { useState } from "react";
import Navbar from "../components/Navbar";
import "./AddCustomer.css";

const freqCount = (freq) => freq.length;

export default function AddCustomer() {
  // Temporarily empty until we build the GET endpoint to fetch existing medicines from SQLite
  const suggestions = [];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState([]);
  const [medicines, setMedicines] = useState([
    { name: "", freq: [], days: "", tablets: 0 }
  ]);

  const toggleFreq = (i, f) => {
    const copy = [...medicines];
    copy[i].freq = copy[i].freq.includes(f)
      ? copy[i].freq.filter(x => x !== f)
      : [...copy[i].freq, f];
    copy[i].tablets = freqCount(copy[i].freq) * Number(copy[i].days || 0);
    setMedicines(copy);
  };

  const updateDays = (i, value) => {
    const copy = [...medicines];
    copy[i].days = value;
    copy[i].tablets = freqCount(copy[i].freq) * Number(value || 0);
    setMedicines(copy);
  };

  const saveCustomer = async () => {
    if (!name || !phone) {
      alert("Name and phone required");
      return;
    }

    try {
      // Connect to our new backend server
      const response = await fetch("http://localhost:3000/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          tags,
          // Filter out empty rows before sending
          medicines: medicines.filter(m => m.name.trim() !== "")
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Customer saved successfully to SQLite database!");
        // Reset the form
        setName("");
        setPhone("");
        setTags([]);
        setMedicines([{ name: "", freq: [], days: "", tablets: 0 }]);
      } else {
        alert("Error saving customer: " + data.error);
      }
    } catch (error) {
      console.error("Database connection failed:", error);
      alert("Failed to connect to the server. Make sure node server.js is running.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="card">
          <div className="card-header">
            <h2>New Prescription</h2>
            <div className="subtitle">Enter customer details and medication below</div>
          </div>

          {/* Customer info */}
          <div className="section-title">Customer Details</div>
          <div className="two-col">
            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Rajesh Kumar"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Tags - SINGLE ROW */}
          <div className="tags-container">
            <span className="tag-label">Category:</span>
            <div className="tags">
              {["Weekly", "Monthly", "Irregular"].map(t => (
                <label key={t} className={tags.includes(t) ? "active" : ""}>
                  <input
                    type="checkbox"
                    checked={tags.includes(t)}
                    onChange={() =>
                      setTags(
                        tags.includes(t)
                          ? tags.filter(x => x !== t)
                          : [...tags, t]
                      )
                    }
                  />{" "}
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div className="section-title">Medication List</div>

          {/* Header - 5 Columns */}
          <div className="med-header med-grid-layout">
            <div>Medicine Name</div>
            <div style={{textAlign: "center"}}>Frequency</div>
            <div style={{textAlign: "center"}}>Days</div>
            <div style={{textAlign: "center"}}>Total</div>
            <div style={{textAlign: "center"}}>Action</div>
          </div>

          {/* Rows - 5 Columns */}
          <div className="med-rows">
            {medicines.map((m, i) => (
              <div key={i} className="med-row med-grid-layout">
                
                {/* 1. Medicine Name */}
                <div className="auto">
                  <input
                    type="text"
                    placeholder="Search medicine..."
                    value={m.name}
                    onChange={e => {
                      const copy = [...medicines];
                      copy[i].name = e.target.value;
                      setMedicines(copy);
                    }}
                  />
                  {m.name && suggestions.length > 0 && (
                    <div className="dropdown">
                      {suggestions
                        .filter(s =>
                          s.toLowerCase().startsWith(m.name.toLowerCase())
                        )
                        .slice(0, 5)
                        .map((s, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              const copy = [...medicines];
                              copy[i].name = s;
                              setMedicines(copy);
                            }}
                          >
                            {s}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* 2. Frequency Buttons (M A E N) */}
                <div className="freq-group">
                  {["M", "A", "E", "N"].map(f => (
                    <label 
                      key={f} 
                      className={`freq-label ${m.freq.includes(f) ? 'active' : ''}`}
                    >
                      {f}
                      <input
                        type="checkbox"
                        checked={m.freq.includes(f)}
                        onChange={() => toggleFreq(i, f)}
                      />
                    </label>
                  ))}
                </div>

                {/* 3. Days */}
                <input
                  type="number"
                  placeholder="0"
                  className="small-input"
                  value={m.days}
                  onChange={e => updateDays(i, e.target.value)}
                />

                {/* 4. Total */}
                <input
                  type="number"
                  value={m.tablets}
                  readOnly
                  className="small-input readonly"
                />

                {/* 5. Delete */}
                <div style={{display: "flex", justifyContent: "center"}}>
                  <button
                    className="delete-btn"
                    title="Remove Medicine"
                    onClick={() =>
                      setMedicines(medicines.filter((_, x) => x !== i))
                    }
                  >
                    ✕
                  </button>
                </div>

              </div>
            ))}
          </div>

          {/* Bottom Buttons */}
          <div className="btn-group">
            <button
              className="add-med"
              onClick={() =>
                setMedicines([
                  ...medicines,
                  { name: "", freq: [], days: "", tablets: 0 }
                ])
              }
            >
              + Add Medicine
            </button>

            <button className="save-cust" onClick={saveCustomer}>
              ✅ Save Customer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
