import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API_BASE = "https://docuforge-backend-cypl.onrender.com";

function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // ---- fetch invoices + anomalies on load ----
  useEffect(() => {
    fetchInvoices();
    fetchAnomalies();
  }, []);

  async function fetchInvoices() {
    try {
      const res = await fetch(`${API_BASE}/invoices`);
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error("Failed to fetch invoices", err);
    }
  }

  async function fetchAnomalies() {
    try {
      const res = await fetch(`${API_BASE}/anomalies`);
      const data = await res.json();
      setAnomalies(data.flags || []);
    } catch (err) {
      console.error("Failed to fetch anomalies", err);
    }
  }

  // ---- handle PDF upload ----
  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setUploadMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setUploadMessage(`Processed successfully — ${data.anomalies_detected} anomaly flag(s) detected across all invoices.`);
        fetchInvoices();
        fetchAnomalies();
      } else {
        setUploadMessage(`Error: ${data.detail || "Upload failed"}`);
      }
    } catch (err) {
      setUploadMessage("Error: Could not reach backend. Is the server running?");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  // ---- handle semantic search ----
  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
  }

  // helper: does this invoice have anomaly flags?
  function getFlags(invoiceId) {
    return anomalies.filter((a) => a.invoice_id === invoiceId);
  }

  const displayedInvoices = searchResults !== null ? searchResults : invoices;

  return (
    <div className="dash">
      <nav className="dash-nav">
        <Link to="/" className="dash-logo">
          <span className="logo-mark"></span>DOCUFORGE.AI
        </Link>
        <div className="dash-nav-right">
          <span className="dash-stat-pill">{invoices.length} invoices</span>
          <span className="dash-stat-pill dash-stat-pill-amber">{anomalies.length} flags</span>
        </div>
      </nav>

      <div className="dash-wrap">
        <div className="dash-header">
          <div className="section-eyebrow">Live Dashboard</div>
          <h1 className="dash-title">Document Intelligence Console</h1>
          <p className="dash-sub">Upload a PDF to extract, flag, and index it in real time.</p>
        </div>

        {/* Upload zone */}
        <div className="upload-zone">
          <input
            type="file"
            accept="application/pdf"
            id="file-upload"
            onChange={handleUpload}
            disabled={loading}
            style={{ display: "none" }}
          />
          <label htmlFor="file-upload" className="upload-label">
            {loading ? "Processing..." : "Choose a PDF to upload →"}
          </label>
          {uploadMessage && (
            <p className={`upload-message ${uploadMessage.startsWith("Error") ? "is-error" : ""}`}>
              {uploadMessage}
            </p>
          )}
        </div>

        {/* Search bar */}
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder='Search by meaning — e.g. "high value pending invoices"'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </button>
          {searchResults !== null && (
            <button type="button" className="clear-btn" onClick={clearSearch}>
              Clear
            </button>
          )}
        </form>

        {/* Invoice table */}
        <div className="table-card">
          <div className="table-card-head">
            <span>{searchResults !== null ? `Search results for "${searchQuery}"` : "All Invoices"}</span>
          </div>

          {displayedInvoices.length === 0 ? (
            <div className="empty-state">No invoices yet — upload a PDF to get started.</div>
          ) : (
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Invoice No</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {displayedInvoices.map((inv) => {
                  const flags = getFlags(inv.id);
                  return (
                    <tr key={inv.id} className={flags.length > 0 ? "row-flagged" : ""}>
                      <td>{inv.vendor_name || "—"}</td>
                      <td className="mono">{inv.invoice_no || "—"}</td>
                      <td className="mono">{inv.amount ? `₹${inv.amount.toLocaleString()}` : "—"}</td>
                      <td className="mono">{inv.date || "—"}</td>
                      <td>
                        <span className={`status-pill status-${inv.status}`}>{inv.status}</span>
                      </td>
                      <td>
                        {flags.length > 0 ? (
                          <span className="flag-badge" title={flags.map((f) => f.reason).join(" | ")}>
                            🚩 {flags.length}
                          </span>
                        ) : (
                          <span className="flag-badge-clean">Clean</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;