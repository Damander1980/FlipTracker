import { useState } from "react";
import { CATEGORIES, STATUSES, PLATFORMS } from "../utils/constants";
import { calcProfit, formatCurrency } from "../utils/profit";

export default function Inventory({ items, settings, onEdit, onDelete, onStatusChange }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortBy, setSortBy] = useState("dateAdded");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedId, setExpandedId] = useState(null);

  const getCategoryLabel = (id) => CATEGORIES.find(c => c.id === id)?.label || id;

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  const filtered = items
    .filter(i => {
      const q = search.toLowerCase();
      return (
        (!q || i.name?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q) || i.haulTag?.toLowerCase().includes(q)) &&
        (filterStatus === "All" || i.status === filterStatus) &&
        (filterCategory === "All" || i.category === filterCategory)
      );
    })
    .sort((a, b) => {
      let aVal, bVal;
      if (sortBy === "dateAdded") { aVal = new Date(a.dateAdded); bVal = new Date(b.dateAdded); }
      else if (sortBy === "paidPrice") { aVal = parseFloat(a.paidPrice) || 0; bVal = parseFloat(b.paidPrice) || 0; }
      else if (sortBy === "profit") {
        const fee = settings.platformFees?.["eBay"] ?? 13.25;
        aVal = calcProfit({ paidPrice: a.paidPrice, soldPrice: a.soldPrice || a.avgSoldPrice, shippingCost: a.shippingCost, platformFee: fee, packagingCost: settings.packagingCost }).netProfit;
        bVal = calcProfit({ paidPrice: b.paidPrice, soldPrice: b.soldPrice || b.avgSoldPrice, shippingCost: b.shippingCost, platformFee: fee, packagingCost: settings.packagingCost }).netProfit;
      }
      else { aVal = a.name?.toLowerCase(); bVal = b.name?.toLowerCase(); }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const usedCategories = [...new Set(items.map(i => i.category).filter(Boolean))];

  const getStatusColor = (status) => {
    const map = { Unlisted: "gray", Listed: "blue", Sold: "green", Donated: "orange", Kept: "purple" };
    return map[status] || "gray";
  };

  const getDaysAgo = (date) => {
    const days = Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Inventory</h1>
        <p className="page-sub">{items.length} total items · {filtered.length} showing</p>
      </div>

      <div className="inventory-controls">
        <input
          className="search-input"
          type="text"
          placeholder="Search items, hauls..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="filter-row">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {usedCategories.map(id => (
              <option key={id} value={id}>{getCategoryLabel(id)}</option>
            ))}
          </select>

          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="dateAdded">Date Added</option>
            <option value="name">Name</option>
            <option value="paidPrice">Amount Paid</option>
            <option value="profit">Profit</option>
          </select>

          <button className="sort-dir-btn" onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}>
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h2>{items.length === 0 ? "No items yet" : "No items match"}</h2>
          <p>{items.length === 0 ? "Add your first item to get started." : "Try adjusting your search or filters."}</p>
        </div>
      ) : (
        <div className="item-list">
          {filtered.map(item => {
            const fee = settings.platformFees?.[item.listedOn] ?? 13.25;
            const profitData = calcProfit({
              paidPrice: item.paidPrice,
              soldPrice: item.soldPrice || item.avgSoldPrice,
              shippingCost: item.shippingCost,
              platformFee: fee,
              packagingCost: item.packagingCost || settings.packagingCost,
            });
            const isExpanded = expandedId === item.id;
            const isStale = item.status !== "Sold" && Math.floor((Date.now() - new Date(item.dateAdded)) / (1000 * 60 * 60 * 24)) > 30;

            return (
              <div key={item.id} className={`item-card ${isStale ? "stale" : ""}`}>
                <div className="item-card-main" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                  <div className="item-card-left">
                    <div className="item-name">{item.name}</div>
                    <div className="item-meta">
                      {item.category && <span className="item-tag">{getCategoryLabel(item.category)}</span>}
                      {item.quickFlip && <span className="item-tag quick">⚡ Quick</span>}
                      {isStale && <span className="item-tag stale-tag">⏰ Stale</span>}
                      <span className="item-date">{getDaysAgo(item.dateAdded)}</span>
                    </div>
                  </div>
                  <div className="item-card-right">
                    <div className={`profit-badge ${profitData.netProfit >= (settings.minProfit || 1) ? "good" : profitData.netProfit >= 0 ? "neutral" : "bad"}`}>
                      {formatCurrency(profitData.netProfit)}
                    </div>
                    <div className={`status-badge status-${getStatusColor(item.status)}`}>{item.status}</div>
                    <div className="expand-icon">{isExpanded ? "▲" : "▼"}</div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="item-card-detail">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Paid</span>
                        <span className="detail-value">{formatCurrency(item.paidPrice)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Avg Sold</span>
                        <span className="detail-value">{item.avgSoldPrice ? formatCurrency(item.avgSoldPrice) : "—"}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">List Price</span>
                        <span className="detail-value">{item.listPrice ? formatCurrency(item.listPrice) : "—"}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Sold For</span>
                        <span className="detail-value">{item.soldPrice ? formatCurrency(item.soldPrice) : "—"}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Shipping</span>
                        <span className="detail-value">{item.shippingCost ? formatCurrency(item.shippingCost) : "—"}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">ROI</span>
                        <span className="detail-value">{profitData.roi}%</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Platform</span>
                        <span className="detail-value">{item.listedOn || "—"}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Source</span>
                        <span className="detail-value">{item.sourceLocation || "—"}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Condition</span>
                        <span className="detail-value">{item.condition || "—"}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Location</span>
                        <span className="detail-value">{item.physicalLocation || "—"}</span>
                      </div>
                    </div>

                    {item.haulTag && (
                      <div className="detail-haul">🏷️ {item.haulTag}</div>
                    )}

                    {item.notes && (
                      <div className="detail-notes">{item.notes}</div>
                    )}

                    <div className="detail-status-row">
                      <span className="detail-label">Change Status:</span>
                      <div className="status-buttons">
                        {STATUSES.map(s => (
                          <button
                            key={s}
                            className={`status-btn ${item.status === s ? "active" : ""}`}
                            onClick={() => onStatusChange(item.id, s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="detail-actions">
                      <button className="btn-edit" onClick={() => onEdit(item)}>✏️ Edit</button>
                      <button className="btn-delete" onClick={() => {
                        if (confirm(`Delete "${item.name}"?`)) onDelete(item.id);
                      }}>🗑️ Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
