import express from 'express';
import sqlite3Pkg from 'sqlite3';
import cors from 'cors';

const sqlite3 = sqlite3Pkg.verbose();
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 1. DATABASE INIT
const db = new sqlite3.Database('./medical_shop.db', (err) => {
  if (err) console.error(err.message);
  else {
    console.log("Connected to SQLite database.");
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS main_customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, phone TEXT NOT NULL, tags TEXT,
        reminderStatus TEXT DEFAULT 'Not Contacted',
        renewalNote TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS main_medicines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER, name TEXT NOT NULL, frequency TEXT,
        days INTEGER, tablets INTEGER, due_date DATETIME,
        orderStatus TEXT DEFAULT 'HOLD',
        purchaseStatus TEXT DEFAULT 'PENDING',
        purchasedAt DATETIME,
        FOREIGN KEY (customer_id) REFERENCES main_customers (id) ON DELETE CASCADE
      )`);
    });
  }
});

// 2. ADD CUSTOMER (With -1 Day Math)
app.post('/api/customers', (req, res) => {
  const { name, phone, tags, medicines } = req.body;
  db.run(`INSERT INTO main_customers (name, phone, tags) VALUES (?, ?, ?)`, [name, phone, JSON.stringify(tags || [])], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const customerId = this.lastID; 

      if (medicines && medicines.length > 0) {
        const stmt = db.prepare(`INSERT INTO main_medicines (customer_id, name, frequency, days, tablets, due_date) VALUES (?, ?, ?, ?, ?, ?)`);
        medicines.forEach((med) => {
          if (med.name.trim() !== "") {
            const freq = Array.isArray(med.freq) ? med.freq.join('/') : med.freq;
            const daysCount = parseInt(med.days) || 0;
            
            const dueDateObj = new Date();
            const alertOffset = daysCount > 0 ? daysCount - 1 : 0; 
            dueDateObj.setDate(dueDateObj.getDate() + alertOffset);
            
            stmt.run([customerId, med.name, freq, daysCount, med.tablets || 0, dueDateObj.toISOString()]);
          }
        });
        stmt.finalize();
      }
      res.status(201).json({ success: true, customerId });
    }
  );
});

// 3. GET ALL CUSTOMERS (With last_visit fix)
app.get('/api/customers', (req, res) => {
  const query = `
    SELECT c.*, m.id as med_id, m.name as med_name, m.frequency, m.days, m.tablets, m.due_date, m.orderStatus, m.purchaseStatus, m.purchasedAt
    FROM main_customers c LEFT JOIN main_medicines m ON c.id = m.customer_id
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const customersMap = {};
    rows.forEach(row => {
      if (!customersMap[row.id]) {
        customersMap[row.id] = { 
          id: row.id, name: row.name, phone: row.phone, 
          reminderStatus: row.reminderStatus, renewalNote: row.renewalNote, 
          last_visit: row.created_at, medicines: [] 
        };
      }
      if (row.med_id) {
        customersMap[row.id].medicines.push({
          id: row.med_id, name: row.med_name, frequency: row.frequency, 
          days: row.days, tablets: row.tablets, due_date: row.due_date, 
          orderStatus: row.orderStatus, purchaseStatus: row.purchaseStatus, purchasedAt: row.purchasedAt
        });
      }
    });
    res.json(Object.values(customersMap));
  });
});

// 4. GET SINGLE CUSTOMER FOR EDITING (This is what went missing!)
app.get('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  db.get(`SELECT * FROM main_customers WHERE id = ?`, [id], (err, customer) => {
    if (err || !customer) return res.status(404).json({ error: "Customer not found" });
    db.all(`SELECT * FROM main_medicines WHERE customer_id = ?`, [id], (err, medicines) => {
      customer.medicines = medicines || [];
      res.json(customer);
    });
  });
});

// 5. UPDATE CUSTOMER FOR EDITING (Also missing!)
app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, medicines } = req.body;
  db.run(`UPDATE main_customers SET name = ?, phone = ? WHERE id = ?`, [name, phone, id], function(err) {
    db.run(`DELETE FROM main_medicines WHERE customer_id = ?`, [id], function() {
      if (medicines && medicines.length > 0) {
        const stmt = db.prepare(`INSERT INTO main_medicines (customer_id, name, frequency, days, tablets, due_date) VALUES (?, ?, ?, ?, ?, ?)`);
        medicines.forEach((med) => {
          if (med.name && med.name.trim() !== "") {
            const freq = Array.isArray(med.frequency) ? med.frequency.join('/') : (med.frequency || "");
            const daysCount = parseInt(med.days) || 0;
            
            const dueDateObj = new Date();
            const alertOffset = daysCount > 0 ? daysCount - 1 : 0; 
            dueDateObj.setDate(dueDateObj.getDate() + alertOffset);
            
            stmt.run([id, med.name, freq, daysCount, med.tablets || 0, dueDateObj.toISOString()]);
          }
        });
        stmt.finalize();
      }
      res.json({ success: true });
    });
  });
});

// 6. STATUS UPDATES (Hold, Confirm, Cancel, etc.)
app.patch('/api/medicines/:id/status', (req, res) => {
  const { id } = req.params;
  const { orderStatus, purchaseStatus, purchasedAt } = req.body;
  const updates = [];
  const params = [];
  
  if (orderStatus !== undefined) { updates.push("orderStatus = ?"); params.push(orderStatus); }
  if (purchaseStatus !== undefined) { updates.push("purchaseStatus = ?"); params.push(purchaseStatus); }
  if (purchasedAt !== undefined) { updates.push("purchasedAt = ?"); params.push(purchasedAt); }
  params.push(id);

  db.run(`UPDATE main_medicines SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    res.json({ success: true });
  });
});

app.patch('/api/customers/:id/meta', (req, res) => {
  const { id } = req.params;
  const { reminderStatus, renewalNote } = req.body;
  const updates = [];
  const params = [];
  
  if (reminderStatus !== undefined) { updates.push("reminderStatus = ?"); params.push(reminderStatus); }
  if (renewalNote !== undefined) { updates.push("renewalNote = ?"); params.push(renewalNote); }
  params.push(id);

  db.run(`UPDATE main_customers SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    res.json({ success: true });
  });
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
