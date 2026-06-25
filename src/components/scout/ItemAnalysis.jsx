import { useState, useEffect } from "react";
import { CATEGORIES, PLATFORMS } from "../../utils/constants";
import { calcProfit, formatCurrency } from "../../utils/profit";
import { getLocation, getMapsUrl } from "../../utils/location";
import CoinRain from "../CoinRain";

const PASS_REASONS = [
  { id: "price", label: "💰 Price too high" },
  { id: "profit", label: "📉 Not enough profit" },
  { id: "wear", label: "🔨 Too much wear" },
  { id: "condition", label: "📦 Poor condition" },
  { id: "identify", label: "❓ Can't verify identity" },
  { id: "stock", label: "🗃️ Already have too many" },
  { id: "ship", label: "⚖️ Hard to ship" },
  { id: "other", label: "✏️ Other" },
];

export default function ItemAnalysis({
  identified,
  photoDataUrl,
  settings,
  onPurchased,
  onPass,
  onBack,
}) {
  const [askingPrice, setAskingPrice] = useState("");
  const [avgSold, setAvgSold] = useState(
    identified?.estimatedValueLow
      ? ((identified.estimatedValueLow + identified.estimatedValueHigh) / 2).toFixed(2)
      : ""
  );
  const [platform, setPlatform] = useState("eBay");
  const [shippingCost, setShippingCost] = useState("5.00");
  const [showPassReasons, setShowPassReasons] = useState(false);
  const [selectedPassReason, setSelectedPassReason] = useState("");
  const [passNote, setPassNote] = useState("");
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [coinTrigger, setCoinTrigger] = useState(0);
  const [showFullDetails, setShowFullDetails] = useState(false);

  useEffect(() => {
    getLocation().then(loc => {
      setLocation(loc);
      setLocationLoading(false);
    });
  }, []);

  const platformFee = settings.platformFees?.[platform] ?? 13.25;

  const profitData = calcProfit({
    paidPrice: askingPrice,
    soldPrice: avgSold || 0,
    shippingCost,
    platformFee,
    packagingCost: settings.packagingCost || 0.75,
  });

  const hasData = askingPrice && avgSold;
  const isWorthIt = hasData && profitData.netProfit >= (settings.minProfit || 1);
  const isGreatFind = hasData && profitData.roi >= 20;
  const isJackpot = hasData && profitData.roi >= 50;

  const getCategoryLabel = (id) => CATEGORIES.find(c => c.id === id)?.label || id;

  const handlePurchase = () => {
    if (isGreatFind || isJackpot) {
      setCoinTrigger(t => t + 1);
      setTimeout(() => {
        onPurchased({
          identified,
          photoDataUrl,
          askingPrice,
          avgSold,
          platform,
          shippingCost,
          profitData,
          location,
        });
      }, 2000);
    } else {
      onPurchased({
        identified,
        photoDataUrl,
        askingPrice,
        avgSold,
        platform,
        shippingCost,
        profitData,
        location,
      });
    }
  };

  const handlePass = () => {
    if (!selectedPassReason) {
      setShowPassReasons(true);
      return;
    }
    onPass({
      identified,
      photoDataUrl,
      askingPrice,
      avgSold,
      profitData,
      passReason: selectedPassReason,
      passNote,
      location,
      date: new Date().toISOString(),
    });
  };

  return (
    <div className="analysis-screen">
      <CoinRain trigger={coinTrigger} roi={profitData.roi} />

      {/* Header */}
      <div className="analysis-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>Item Analysis</h2>
        <div className="analysis-header-spacer" />
      </div>

      {/* Photo */}
      {photoDataUrl && (
        <div className="analysis-photo">
          <img src={photoDataUrl} alt="Item" />
        </div>
      )}

      {/* AI Result */}
      <div className={`analysis-id confidence-${identified?.confidence}`}>
        <div className="analysis-id-top">
          <span className={`confidence-pill ${identified?.confidence}`}>
            {identified?.confidence?.toUpperCase()} CONFIDENCE
          </span>
          <span className="analysis-era">{identified?.era}</span>
        </div>

        <div className="analysis-name">{identified?.name}</div>
        <div className="analysis-category">
          📦 {getCategoryLabel(identified?.category)}
        </div>

        {/* Estimated Value */}
        {(identified?.estimatedValueLow > 0 || identified?.estimatedValueHigh > 0) && (
          <div className="analysis-value-range">
            <span className="value-label">Est. Value</span>
            <span className="value-range">
              {formatCurrency(identified.estimatedValueLow)} — {formatCurrency(identified.estimatedValueHigh)}
            </span>
          </div>
        )}

        {/* Toggle details */}
        <button className="toggle-details-btn" onClick={() => setShowFullDetails(v => !v)}>
          {showFullDetails ? "Hide details ▲" : "Show details ▼"}
        </button>

        {showFullDetails && (
          <>
            <div className="analysis-description">{identified?.description}</div>
            {identified?.redFlags && (
              <div className="analysis-redflag">⚠️ {identified.redFlags}</div>
            )}
            <div className="analysis-disclaimer">
              ⚡ {identified?.aiDisclaimer}
            </div>
          </>
        )}
      </div>

      {/* eBay Search */}
      <a
        href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(identified?.searchQuery || identified?.name || "")}&LH_Sold=1&LH_Complete=1`}
        target="_blank"
        rel="noopener noreferrer"
        className="ebay-search-btn"
      >
        🔍 Search eBay Sold Listings →
      </a>

      {/* Pricing */}
      <div className="analysis-pricing">
        <div className="pricing-row">
          <div className="form-group">
            <label>They're asking</label>
            <div className="input-prefix">
              <span>$</span>
              <input
                type="number" step="0.01" min="0"
                value={askingPrice}
                onChange={e => setAskingPrice(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>
          <div className="form-group">
            <label>Avg eBay sold</label>
            <div className="input-prefix">
              <span>$</span>
              <input
                type="number" step="0.01" min="0"
                value={avgSold}
                onChange={e => setAvgSold(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="pricing-row">
          <div className="form-group">
            <label>Est. shipping</label>
            <div className="input-prefix">
              <span>$</span>
              <input
                type="number" step="0.01" min="0"
                value={shippingCost}
                onChange={e => setShippingCost(e.target.value)}
                placeholder="5.00"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)}>
              {PLATFORMS.map(p => (
                <option key={p} value={p}>{p} ({settings.platformFees?.[p] ?? 0}%)</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Profit Display */}
      {hasData && (
        <div className={`analysis-profit ${isWorthIt ? "good" : "bad"}`}>
          <div className="profit-main">
            <div className="profit-amount">{formatCurrency(profitData.netProfit)}</div>
            <div className="profit-roi">{profitData.roi}% ROI</div>
          </div>
          <div className="profit-breakdown-mini">
            <span>Fees: {formatCurrency(profitData.feeAmount)}</span>
            <span>·</span>
            <span>Ship: {formatCurrency(shippingCost)}</span>
            <span>·</span>
            <span>{isWorthIt ? "✅ Worth it" : "❌ Pass"}</span>
          </div>
          {isJackpot && <div className="jackpot-banner">🤑 JACKPOT FIND!</div>}
          {isGreatFind && !isJackpot && <div className="great-find-banner">🪙 GREAT FIND!</div>}
        </div>
      )}

      {/* Location */}
      <div className="analysis-location">
        <span className="location-icon">📍</span>
        {locationLoading ? (
          <span className="location-text">Getting location...</span>
        ) : location ? (
          <a href={getMapsUrl(location)} target="_blank" rel="noopener noreferrer" className="location-link">
            View on map · {new Date().toLocaleDateString()}
          </a>
        ) : (
          <span className="location-text muted">Location unavailable</span>
        )}
      </div>

      {/* Pass Reasons */}
      {showPassReasons && (
        <div className="pass-reasons">
          <h3>Why are you passing?</h3>
          <div className="pass-reason-grid">
            {PASS_REASONS.map(r => (
              <button
                key={r.id}
                className={`pass-reason-btn ${selectedPassReason === r.id ? "active" : ""}`}
                onClick={() => setSelectedPassReason(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          {selectedPassReason === "other" && (
            <textarea
              className="pass-note"
              placeholder="What's the reason?"
              value={passNote}
              onChange={e => setPassNote(e.target.value)}
              rows={2}
            />
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="analysis-actions">
        <button
          className="action-btn pass-btn"
          onClick={handlePass}
        >
          ❌ PASS
        </button>
        <button
          className="action-btn purchase-btn"
          onClick={handlePurchase}
          disabled={!askingPrice}
        >
          ✅ PURCHASED
        </button>
      </div>
    </div>
  );
}
