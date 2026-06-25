import { getMapsUrl } from "../../utils/location";
import { formatCurrency } from "../../utils/profit";
import { CATEGORIES } from "../../utils/constants";

const PASS_REASON_LABELS = {
  price: "💰 Price too high",
  profit: "📉 Not enough profit",
  wear: "🔨 Too much wear",
  condition: "📦 Poor condition",
  identify: "❓ Can't verify",
  stock: "🗃️ Too much stock",
  ship: "⚖️ Hard to ship",
  other: "✏️ Other",
};

export default function PassLog({ passes, onClose }) {
  const getCategoryLabel = (id) => CATEGORIES.find(c => c.id === id)?.label || id;

  const sortedPasses = [...passes].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="back-btn" onClick={onClose}>← Back</button>
          <div>
            <h1>Pass Log</h1>
            <p className="page-sub">{passes.length} items passed</p>
          </div>
        </div>
      </div>

      {passes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👍</div>
          <h2>No passes yet</h2>
          <p>Items you pass on will appear here with photos and reasons.</p>
        </div>
      ) : (
        <div className="pass-list">
          {sortedPasses.map((pass, i) => (
            <div key={i} className="pass-card">
              <div className="pass-card-inner">
                {pass.photoDataUrl && (
                  <img src={pass.photoDataUrl} alt="Passed item" className="pass-photo" />
                )}
                <div className="pass-info">
                  <div className="pass-name">{pass.identified?.name || "Unknown item"}</div>
                  <div className="pass-category">{getCategoryLabel(pass.identified?.category)}</div>
                  <div className="pass-meta">
                    {pass.askingPrice && (
                      <span className="pass-price">Asked: {formatCurrency(pass.askingPrice)}</span>
                    )}
                    {pass.profitData?.netProfit !== undefined && (
                      <span className={`pass-profit ${pass.profitData.netProfit >= 0 ? "neutral" : "bad"}`}>
                        Est. profit: {formatCurrency(pass.profitData.netProfit)}
                      </span>
                    )}
                  </div>
                  {pass.passReason && (
                    <div className="pass-reason-tag">
                      {PASS_REASON_LABELS[pass.passReason] || pass.passReason}
                    </div>
                  )}
                  {pass.passNote && (
                    <div className="pass-note-display">{pass.passNote}</div>
                  )}
                  <div className="pass-footer">
                    <span className="pass-date">{new Date(pass.date).toLocaleDateString()}</span>
                    {pass.location && (
                      <a
                        href={getMapsUrl(pass.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pass-location"
                      >
                        📍 View location
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
