import { useState } from "react";

export default function RgpSystem() {
  const [partyName, setPartyName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [items, setItems] = useState([{ itemCode: "", desc: "", uom: "PCS", qty: 0 }]);

  const updateItem = (i, key, val) =>
    setItems(items.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));

  const addRow = () =>
    setItems([...items, { itemCode: "", desc: "", uom: "PCS", qty: 0 }]);

  const removeRow = (i) => setItems(items.filter((_, idx) => idx !== i));

  const submit = (e) => {
    e.preventDefault();
    const payload = { partyName, dueDate, vehicleNo, items };
    alert("RGP form data (demo):\n" + JSON.stringify(payload, null, 2));
  };

  return (
    <section style={styles.container}>
      <h1 style={styles.heading}>Returnable Gate Pass (RGP) System</h1>

      <form onSubmit={submit} style={styles.form}>
        <div style={styles.section}>
          <label style={styles.label}>
            Party Name
            <input
              style={styles.input}
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder="e.g. ABC Trims"
              required
            />
          </label>

          <label style={styles.label}>
            Due Date
            <input
              style={styles.input}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </label>

          <label style={styles.label}>
            Vehicle Number
            <input
              style={styles.input}
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              placeholder="e.g. RJ14 XX 1234"
            />
          </label>
        </div>

        <h2 style={styles.subheading}>Items</h2>

        <div style={styles.table}>
          <div style={{ ...styles.row, ...styles.headerRow }}>
            <div>Item Code</div>
            <div>Description</div>
            <div>UOM</div>
            <div>Qty</div>
            <div></div>
          </div>

          {items.map((item, i) => (
            <div key={i} style={styles.row}>
              <input
                style={styles.cell}a
                value={item.itemCode}
                onChange={(e) => updateItem(i, "itemCode", e.target.value)}
                placeholder="TRIM-01"
              />
              <input
                style={styles.cell}
                value={item.desc}
                onChange={(e) => updateItem(i, "desc", e.target.value)}
                placeholder="e.g. Hangtags"
              />
              <input
                style={styles.cell}
                value={item.uom}
                onChange={(e) => updateItem(i, "uom", e.target.value)}
                placeholder="PCS"
              />
              <input
                style={styles.cell}
                type="number"
                min="0"
                value={item.qty}
                onChange={(e) => updateItem(i, "qty", Number(e.target.value))}
              />
              <button type="button" style={styles.deleteBtn} onClick={() => removeRow(i)}>
                Delete
              </button>
            </div>
          ))}
        </div>

        <div style={styles.buttonRow}>
          <button type="button" onClick={addRow} style={styles.addBtn}>
            + Add Item
          </button>
          <button type="submit" style={styles.submitBtn}>
            Submit (Demo)
          </button>
        </div>
      </form>
    </section>
  );
}

const styles = {
  container: {
    maxWidth: 960,
    margin: "0 auto",
    padding: 24,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#333",
  },
  subheading: {
    fontSize: 20,
    fontWeight: 600,
    marginTop: 30,
    marginBottom: 12,
    color: "#333",
  },
  form: {
    background: "#f9f9f9",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  section: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
    marginBottom: 20,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    fontSize: 14,
    fontWeight: 500,
    color: "#555",
  },
  input: {
    marginTop: 6,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 14,
  },
  table: {
    border: "1px solid #ddd",
    borderRadius: 10,
    overflow: "hidden",
  },
  headerRow: {
    background: "#eee",
    fontWeight: 600,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1.2fr 2fr 0.8fr 0.7fr 0.6fr",
    gap: 8,
    padding: 10,
    alignItems: "center",
    borderTop: "1px solid #eee",
  },
  cell: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
  },
  deleteBtn: {
    padding: "6px 10px",
    background: "#ffefef",
    color: "#d00",
    border: "1px solid #f5c2c2",
    borderRadius: 6,
    cursor: "pointer",
  },
  buttonRow: {
    marginTop: 20,
    display: "flex",
    gap: 12,
  },
  addBtn: {
    padding: "10px 16px",
    background: "#f0f0f0",
    border: "1px dashed #aaa",
    borderRadius: 8,
    fontWeight: 500,
    cursor: "pointer",
  },
  submitBtn: {
    padding: "10px 16px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 500,
    cursor: "pointer",
  },
};
