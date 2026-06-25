import { useState } from "react";
import { useEbayLookup } from "../hooks/useEbayLookup"; // adjust path if needed

export default function EbayLookup({ initialQuery = "", initialUpc = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [upc, setUpc] = useState(initialUpc);
  const { lookup, results, stats, loading, error, clear } = useEbayLookup();

  const handleSearch = () => {
    if (!query && !upc) return;
    lookup({ query: query || undefined, upc: upc || undefined });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 600, margin: "0 auto" }}>
      <h3 style={{ marginBottom: 12 }}>eBay Price Lookup</h3>

      {/* Search inputs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="UPC / ISBN..."
          value={upc}
          onChange={(e) => setUpc(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ ...inputStyle, maxWidth: 160 }}
        />
        <button onClick={handleSearch} disabled={loading} style={buttonStyle}>
          {loading ? "Searching..." : "Search"}
        </button>
        {results && (
          <button onClick={clear} style={{ ...buttonStyle, background: "#888" }}>
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: "red", marginBottom: 12 }}>
          Error: {error}
        </div>
      )}

      {/* Price stats summary */}
      {stats && (
        <div style={statsBoxStyle}>
          <div style={statItem}>
            <span style={statLabel}>Listings Found</span>
            <span style={statValue}>{stats.count}</span>
          </div>
          <div style={statItem}>
            <span style={statLabel}>Low</span>
            <span style={{ ...statValue, color: "#22c55e" }}>${stats.low}</span>
          </div>
          <div style={statItem}>
            <span style={statLabel}>Average</span>
            <span style={{ ...statValue, color: "#3b82f6" }}>${stats.average}</span>
          </div>
          <div style={statItem}>
            <span style={statLabel}>Median</span>
            <span style={{ ...statValue, color: "#8b5cf6" }}>${stats.median}</span>
          </div>
          <div style={statItem}>
            <span style={statLabel}>High</span>
            <span style={{ ...statValue, color: "#ef4444" }}>${stats.high}</span>
          </div>
        </div>
      )}

      {/* Individual listings */}
      {results && results.length > 0 && (
        <div>
          <h4 style={{ marginBottom: 8 }}>Active Listings</h4>
          {results.map((item, i) => (
            <div key={i} style={listingCardStyle}>
              {item.image && (
                <img
                  src={item.image}
                  alt={item.title}
                  style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.title}
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#666" }}>
                  <span>Condition: {item.condition}</span>
                  <span>Seller: {item.seller}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>
                  ${item.price}
                </div>
                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#3b82f6" }}>
                  View on eBay
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {results && results.length === 0 && (
        <div style={{ color: "#888", textAlign: "center", padding: 24 }}>
          No listings found. Try a different search term.
        </div>
      )}
    </div>
  );
}

// Styles
const inputStyle = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #ddd",
  fontSize: 14,
};

const buttonStyle = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  background: "#3b82f6",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};

const statsBoxStyle = {
  display: "flex",
  gap: 8,
  background: "#f8f9fa",
  borderRadius: 8,
  padding: "12px 16px",
  marginBottom: 16,
  flexWrap: "wrap",
};

const statItem = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flex: 1,
  minWidth: 80,
};

const statLabel = {
  fontSize: 11,
  color: "#888",
  marginBottom: 2,
};

const statValue = {
  fontSize: 18,
  fontWeight: 700,
};

const listingCardStyle = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #eee",
  marginBottom: 8,
  background: "white",
};
