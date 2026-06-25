/* ─── eBay Live Price Panel ─────────────────────────────── */
.ebay-panel {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 12px;
  padding: 12px 14px;
  margin: 12px 0;
}

.ebay-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ebay-panel-title {
  font-size: 13px;
  font-weight: 700;
  color: #0369a1;
}

.ebay-loading {
  font-size: 12px;
  color: #0369a1;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.ebay-toggle-btn {
  background: none;
  border: none;
  font-size: 12px;
  color: #0369a1;
  cursor: pointer;
  font-weight: 600;
}

.ebay-stats {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.ebay-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 6px 10px;
  flex: 1;
  min-width: 60px;
}

.ebay-stat-label {
  font-size: 10px;
  color: #888;
  margin-bottom: 2px;
}

.ebay-stat-value {
  font-size: 16px;
  font-weight: 800;
  color: #333;
}

.ebay-stat-value.low { color: #22c55e; }
.ebay-stat-value.median { color: #3b82f6; }
.ebay-stat-value.high { color: #ef4444; }

.ebay-use-median-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.ebay-error {
  font-size: 12px;
  color: #ef4444;
  margin-bottom: 8px;
}

.ebay-listings {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.ebay-listing-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border-radius: 8px;
  padding: 8px 10px;
  text-decoration: none;
  color: inherit;
}

.ebay-listing-img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.ebay-listing-info {
  flex: 1;
  min-width: 0;
}

.ebay-listing-title {
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ebay-listing-condition {
  font-size: 11px;
  color: #888;
}

.ebay-listing-price {
  font-size: 15px;
  font-weight: 800;
  color: #22c55e;
  flex-shrink: 0;
}
/* ─────────────────────────────────────────────────────────── */
