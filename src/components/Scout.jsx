import { useState } from "react";
import ScoutCamera from "./scout/ScoutCamera";
import ItemAnalysis from "./scout/ItemAnalysis";
import BarcodeScanner from "./scout/BarcodeScanner";
import PassLog from "./scout/PassLog";
import { identifyFromPhoto, identifyFromText } from "../utils/identify";
import { lookupBarcode } from "../utils/barcode";
import { formatCurrency } from "../utils/profit";
import { CATEGORIES } from "../utils/constants";

const SCOUT_VIEWS = {
  HOME: "home",
  IDENTIFYING: "identifying",
  ANALYSIS: "analysis",
  BARCODE: "barcode",
  MANUAL: "manual",
  PASS_LOG: "pass_log",
};

export default function Scout({ settings, onAddItem, passes = [], onPassLogged, todaysPurchases = [] }) {
  const [view, setView] = useState(SCOUT_VIEWS.HOME);
  const [photo, setPhoto] = useState(null);
  const [identified, setIdentified] = useState(null);
  const [idError, setIdError] = useState(null);
  const [manualQuery, setManualQuery] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const todayTotal = todaysPurchases.reduce((sum, p) => sum + (parseFloat(p.askingPrice) || 0), 0);
  const todayProfit = todaysPurchases.reduce((sum, p) => sum + (p.profitData?.netProfit || 0), 0);

  const handlePhotoTaken = async ({ dataUrl, base64, mime }) => {
    setPhoto({ dataUrl, base64, mime });
    setView(SCOUT_VIEWS.IDENTIFYING);
    setIdError(null);

    try {
      const result = await identifyFromPhoto(base64, mime);
      setIdentified(result);
      setView(SCOUT_VIEWS.ANALYSIS);
    } catch (err) {
      setIdError(err.message || "Could not identify. Try a clearer photo.");
      setView(SCOUT_VIEWS.HOME);
    }
  };

  const handleBarcodeDetected = async (barcode) => {
    setView(SCOUT_VIEWS.IDENTIFYING);
    setIdError(null);

    try {
      const result = await lookupBarcode(barcode);
      if (result.found) {
        setIdentified(result);
        setPhoto(result.thumbnail ? { dataUrl: result.thumbnail } : null);
        setView(SCOUT_VIEWS.ANALYSIS);
      } else {
        // Barcode not found - ask Claude
        const aiResult = await identifyFromText(`Barcode/UPC: ${barcode}`);
        setIdentified(aiResult);
        setPhoto(null);
        setView(SCOUT_VIEWS.ANALYSIS);
      }
    } catch (err) {
      setIdError("Could not look up barcode. Try typing the item manually.");
      setView(SCOUT_VIEWS.HOME);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    setManualLoading(true);
    setIdError(null);

    try {
      const result = await identifyFromText(manualQuery);
      setIdentified(result);
      setPhoto(null);
      setView(SCOUT_VIEWS.ANALYSIS);
    } catch (err) {
      setIdError("Could not identify. Try being more specific.");
    } finally {
      setManualLoading(false);
    }
  };

  const handlePurchased = (data) => {
    onAddItem({
      name: data.identified?.name || "Unknown item",
      description: data.identified?.description || "",
      category: data.identified?.category || "",
      paidPrice: data.askingPrice,
      avgSoldPrice: data.avgSold,
      listedOn: data.platform,
      shippingCost: data.shippingCost,
      status: "Unlisted",
      notes: data.identified?.redFlags ? `⚠️ ${data.identified.redFlags}` : "",
      photoDataUrl: data.photoDataUrl,
      location: data.location,
      sourceLocation: data.location ? "GPS Tagged" : "",
      datePurchased: new Date().toISOString().split("T")[0],
    }, data);
    setView(SCOUT_VIEWS.HOME);
    setPhoto(null);
    setIdentified(null);
  };

  const handlePass = (data) => {
    onPassLogged(data);
    setView(SCOUT_VIEWS.HOME);
    setPhoto(null);
    setIdentified(null);
  };

  const handleBack = () => {
    setView(SCOUT_VIEWS.HOME);
    setPhoto(null);
    setIdentified(null);
    setIdError(null);
  };

  // IDENTIFYING / LOADING SCREEN
  if (view === SCOUT_VIEWS.IDENTIFYING) {
    return (
      <div className="page identifying-screen">
        <div className="identifying-content">
          {photo?.dataUrl && (
            <img src={photo.dataUrl} alt="Item" className="identifying-photo" />
          )}
          <div className="identifying-spinner large">
            <div className="spinner large-spinner" />
          </div>
          <div className="identifying-text">Analyzing item...</div>
          <div className="identifying-sub">This takes about 3 seconds</div>
        </div>
      </div>
    );
  }

  // BARCODE SCANNER
  if (view === SCOUT_VIEWS.BARCODE) {
    return (
      <BarcodeScanner
        onDetected={handleBarcodeDetected}
        onCancel={handleBack}
      />
    );
  }

  // ITEM ANALYSIS
  if (view === SCOUT_VIEWS.ANALYSIS && identified) {
    return (
      <ItemAnalysis
        identified={identified}
        photoDataUrl={photo?.dataUrl}
        settings={settings}
        onPurchased={handlePurchased}
        onPass={handlePass}
        onBack={handleBack}
      />
    );
  }

  // PASS LOG
  if (view === SCOUT_VIEWS.PASS_LOG) {
    return <PassLog passes={passes} onClose={handleBack} />;
  }

  // MANUAL ENTRY
  if (view === SCOUT_VIEWS.MANUAL) {
    return (
      <div className="page">
        <div className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="back-btn" onClick={handleBack}>← Back</button>
            <div>
              <h1>✏️ Manual Search</h1>
              <p className="page-sub">Describe what you found</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleManualSubmit} className="manual-form">
          <div className="form-group">
            <label>Describe the item</label>
            <textarea
              value={manualQuery}
              onChange={e => setManualQuery(e.target.value)}
              placeholder="e.g. Gremlins 1984 read-along book and record set story 1..."
              rows={4}
              className="manual-textarea"
              autoFocus
            />
          </div>
          {idError && <div className="id-error">⚠️ {idError}</div>}
          <button type="submit" className="btn-primary" disabled={manualLoading || !manualQuery.trim()}>
            {manualLoading ? "Identifying..." : "🔍 Identify Item"}
          </button>
        </form>
      </div>
    );
  }

  // HOME / CAMERA VIEW
  return (
    <div className="page scout-home">
      {/* Today's Score */}
      {todaysPurchases.length > 0 && (
        <div className="todays-score">
          <div className="score-label">🛍️ Today's Haul</div>
          <div className="score-stats">
            <div className="score-stat">
              <span className="score-num">{todaysPurchases.length}</span>
              <span className="score-desc">items</span>
            </div>
            <div className="score-divider" />
            <div className="score-stat">
              <span className="score-num">{formatCurrency(todayTotal)}</span>
              <span className="score-desc">invested</span>
            </div>
            <div className="score-divider" />
            <div className="score-stat">
              <span className={`score-num ${todayProfit >= 0 ? "green" : "red"}`}>
                {formatCurrency(todayProfit)}
              </span>
              <span className="score-desc">est. profit</span>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {idError && (
        <div className="id-error" style={{ marginBottom: 16 }}>⚠️ {idError}</div>
      )}

      {/* Entry options */}
      <ScoutCamera
        onPhotoTaken={handlePhotoTaken}
        onBarcodeClick={() => setView(SCOUT_VIEWS.BARCODE)}
        onManualClick={() => setView(SCOUT_VIEWS.MANUAL)}
      />

      {/* Pass Log Link */}
      <button
        className="pass-log-link"
        onClick={() => setView(SCOUT_VIEWS.PASS_LOG)}
      >
        📋 Pass Log ({passes.length} items)
      </button>
    </div>
  );
}
