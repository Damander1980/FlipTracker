import { formatCurrency, formatPercent, calcProfit } from "../utils/profit";
import { CATEGORIES } from "../utils/constants";

export default function Dashboard({ items, settings, onNavigate }) {
  const now = new Date();
  const thisMonth = items.filter(i => {
    const d = new Date(i.dateSold || i.dateAdded);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const soldItems = items.filter(i => i.status === "Sold");
  const activeItems = items.filter(i => i.status === "Unlisted" || i.status === "Listed");
  const soldThisMonth = soldItems.filter(i => {
    const d = new Date(i.dateSold || i.dateAdded);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalInvested = activeItems.reduce((sum, i) => sum + (parseFloat(i.paidPrice) || 0), 0);
  const totalPotentialValue = activeItems.reduce((sum, i) => sum + (parseFloat(i.avgSoldPrice) || parseFloat(i.listPrice) || 0), 0);

  const totalProfitThisMonth = soldThisMonth.reduce((sum, i) => {
    const fee = settings.platformFees?.[i.listedOn] ?? 13.25;
    const { netProfit } = calcProfit({
      paidPrice: i.paidPrice,
      soldPrice: i.soldPrice,
      shippingCost: i.shippingCost,
      platformFee: fee,
      packagingCost: settings.packagingCost,
    });
    return sum + netProfit;
  }, 0);

  const allTimeProfit = soldItems.reduce((sum, i) => {
    const fee = settings.platformFees?.[i.listedOn] ?? 13.25;
    const { netProfit } = calcProfit({
      paidPrice: i.paidPrice,
      soldPrice: i.soldPrice,
      shippingCost: i.shippingCost,
      platformFee: fee,
      packagingCost: settings.packagingCost,
    });
    return sum + netProfit;
  }, 0);

  const bestROI = soldItems.reduce((best, i) => {
    const fee = settings.platformFees?.[i.listedOn] ?? 13.25;
    const { roi } = calcProfit({
      paidPrice: i.paidPrice,
      soldPrice: i.soldPrice,
      shippingCost: i.shippingCost,
      platformFee: fee,
      packagingCost: settings.packagingCost,
    });
    return roi > (best?.roi || 0) ? { ...i, roi } : best;
  }, null);

  const staleItems = activeItems
    .filter(i => {
      const days = (Date.now() - new Date(i.dateAdded)) / (1000 * 60 * 60 * 24);
      return days > 30;
    })
    .sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded))
    .slice(0, 5);

  const categoryBreakdown = CATEGORIES
    .map(cat => ({
      ...cat,
      count: soldItems.filter(i => i.category === cat.id).length,
      profit: soldItems.filter(i => i.category === cat.id).reduce((sum, i) => {
        const fee = settings.platformFees?.[i.listedOn] ?? 13.25;
        const { netProfit } = calcProfit({ paidPrice: i.paidPrice, soldPrice: i.soldPrice, shippingCost: i.shippingCost, platformFee: fee, packagingCost: settings.packagingCost });
        return sum + netProfit;
      }, 0),
    }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  const daysSince = (date) => Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-sub">Your flip business at a glance</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-label">Profit This Month</div>
          <div className="stat-value">{formatCurrency(totalProfitThisMonth)}</div>
          <div className="stat-sub">{soldThisMonth.length} items sold</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">All-Time Profit</div>
          <div className="stat-value">{formatCurrency(allTimeProfit)}</div>
          <div className="stat-sub">{soldItems.length} total sold</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Active Inventory</div>
          <div className="stat-value">{activeItems.length}</div>
          <div className="stat-sub">items in stock</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Total Invested</div>
          <div className="stat-value">{formatCurrency(totalInvested)}</div>
          <div className="stat-sub">potential: {formatCurrency(totalPotentialValue)}</div>
        </div>
      </div>

      {bestROI && (
        <div className="dashboard-section">
          <h2>🏆 Best ROI Item</h2>
          <div className="best-roi-card">
            <div className="best-roi-info">
              <div className="best-roi-name">{bestROI.name}</div>
              <div className="best-roi-details">
                Paid {formatCurrency(bestROI.paidPrice)} → Sold {formatCurrency(bestROI.soldPrice)}
              </div>
            </div>
            <div className="best-roi-badge">{formatPercent(bestROI.roi)} ROI</div>
          </div>
        </div>
      )}

      {staleItems.length > 0 && (
        <div className="dashboard-section">
          <h2>⏰ Sitting Too Long</h2>
          <p className="section-sub">Consider dropping prices on these</p>
          <div className="stale-list">
            {staleItems.map(item => (
              <div key={item.id} className="stale-item">
                <div className="stale-name">{item.name}</div>
                <div className="stale-days">{daysSince(item.dateAdded)} days</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {categoryBreakdown.length > 0 && (
        <div className="dashboard-section">
          <h2>📈 Top Categories by Profit</h2>
          <div className="category-list">
            {categoryBreakdown.map(cat => (
              <div key={cat.id} className="category-row">
                <div className="category-name">{cat.label}</div>
                <div className="category-stats">
                  <span className="category-count">{cat.count} sold</span>
                  <span className="category-profit">{formatCurrency(cat.profit)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏷️</div>
          <h2>No items yet</h2>
          <p>Start by adding your first item or using Scout mode to check prices in the field.</p>
          <div className="empty-actions">
            <button className="btn-primary" onClick={() => onNavigate("add")}>Add First Item</button>
            <button className="btn-secondary" onClick={() => onNavigate("scout")}>Open Scout</button>
          </div>
        </div>
      )}
    </div>
  );
}
