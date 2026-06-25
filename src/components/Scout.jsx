import { useState, useEffect, useRef } from "react";
import ScoutCamera from "./scout/ScoutCamera";
import ItemAnalysis from "./scout/ItemAnalysis";
import BarcodeScanner from "./scout/BarcodeScanner";
import PassLog from "./scout/PassLog";
import { identifyFromPhoto, identifyFromText } from "../utils/identify";
import { lookupBarcode } from "../utils/barcode";
import { formatCurrency } from "../utils/profit";
import { CATEGORIES } from "../utils/constants";
import { supabase } from "../utils/supabase";

const SCOUT_VIEWS = {
  HOME: "home",
  IDENTIFYING: "identifying",
  ANALYSIS: "analysis",
  BARCODE: "barcode",
  MANUAL: "manual",
  PASS_LOG: "pass_log",
  QUICK_SCAN: "quick_scan",
};

export default function Scout({ settings, onAddItem, passes = [], onPassLogged, todaysPurchases = [] }) {
  const [view, setView] = useState(SCOUT_VIEWS.HOME);
  const [photo, setPhoto] = useState(null);
  const [identified, setIdentified] = useState(null);
  const [idError, setIdError] = useState(null);
  const [manualQuery, setManualQuery] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  // Quick scan state
  const [quickResult, setQuickResult] = useState(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState(null);
  const [quickHistory, setQuickHistory] = useState([]); // items scanned this session
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const scanningRef = useRef(false);

  const todayTotal = todaysPurchases.reduce((sum, p) => sum + (parseFloat(p.askingPrice) || 0), 0);
  const todayProfit = todaysPurchases.reduce((sum, p) => sum + (p.profitData?.netProfit || 0), 0);

  // Start quick scan camera
  useEffect(() => {
    if (view !== SCOUT_VIEWS.QUICK_SCAN) return;
    let active = true;
    scanningRef.current = true;

    async function startQuickScan() {
      try {
        const { BrowserMultiFormatReader, NotFoundException } = await import("@zxing/library");
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const devices = await reader.listVideoInputDevices();
        if (!devices.length) { setQuickError("No camera found"); return; }

        const back = devices.find(d =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
        );
        const deviceId = back?.deviceId || devices[0].deviceId;

        await reader.decodeFromVideoDevice(deviceId, videoRef.current, async (result, err) => {
          if (!active || !scanningRef.current) return;
          if (result) {
            const code = result.getText();
            if (navigator.vibrate) navigator.vibrate(100);
            scanningRef.current = false; // pause scanning while looking up
            await handleQuickBarcode(code);
            // auto-resume after 2 seconds
            setTimeout(() => {
              if (active) scanningRef.current = true;
            }, 2000);
          }
        });
      } catch (err) {
        if (active) setQuickError("Camera error: " + err.message);
      }
    }

    startQuickScan();

    return () => {
      active = false;
      scanningRef.current = false;
      if (readerRef.current) readerRef.current.reset();
    };
  }, [view]);

  const handleQuickBarcode = async (code) => {
    setQuickLoading(true);
    setQuickError(null);
    setQuickResult(null);

    try {
      // Look up UPC
      const { data: upcData } = await supabase.functions.invoke("upc-lookup", {
        body: { upc: code },
      });

      // Look up eBay prices
      const { data: ebayData } = await supabase.functions.invoke("ebay-lookup", {
        body: {
          query: upcData?.found ? upcData.name : null,
          upc: code,
          limit: 10,
        },
      });

      const result = {
        barcode: code,
        name: upcData?.found ? upcData.name : `UPC: ${code}`,
        image: upcData?.image || null,
        found: upcData?.found || false,
        stats: ebayData?.stats || null,
        verdict: ebayData?.stats?.median
          ? parseFloat(ebayData.stats.median) >= 10 ? "buy" : "pass"
          : "unknown",
      };

      setQuickResult(result);
      setQuickHistory(prev => [result, ...prev.slice(0, 19)]); // keep last 20
    } catch (err) {
      setQuickError("Lookup failed. Try again.");
    } finally {
      setQuickLoading(false);
    }
  };

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
    setQuickResult(null);
    setQuickError(null);
  };

  // IDENTIFYING SCREEN
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
            <button className="back-btn" onClick={handleBack}>Back</button>
            <div>
              <h1>Manual Search</h1>
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
              placeholder="e.g. Gremlins 1984 read-along book and record set..."
              rows={4}
              className="manual-textarea"
              autoFocus
            />
          </div>
          {idError && <div className="id-error">{idError}</div>}
          <button type="submit" className="btn-primary" disabled={manualLoading || !manualQuery.trim()}>
            {manualLoading ? "Identifying..." : "Identify Item"}
          </button>
        </form>
      </div>
    );
  }

  // QUICK SCAN MODE
  if (view === SCOUT_VIEWS.QUICK_SCAN) {
    return (
      <div style={qs.container}>
        {/* Header */}
        <div style={qs.header}>
          <button onClick={handleBack} style={qs.exitBtn}>Exit</button>
          <span style={qs.headerTitle}>Quick Scan</span>
          <span style={qs.headerCount}>{quickHistory.length} scanned</span>
        </div>

        {/* Camera */}
        <div style={qs.viewport}>
          <video ref={videoRef} style={qs.video} playsInline muted autoPlay />
          <div style={qs.scanFrame} />
          {!quickLoading && !quickResult && (
            <p style={qs.hint}>Point at barcode</p>
          )}
        </div>

        {/* Result card */}
        {quickLoading && (
          <div style={qs.resultCard}>
            <div style={qs.spinner} />
            <span style={{ color: "white", fontSize: 14 }}>Looking up...</span>
          </div>
        )}

        {quickError && (
          <div style={{ ...qs.resultCard, background: "#1a0a0a" }}>
            <span style={{ color: "#f87171", fontSize: 14 }}>{quickError}</span>
          </div>
        )}

        {quickResult && !quickLoading && (
          <div style={{
            ...qs.resultCard,
            background: quickResult.verdict === "buy" ? "#0a1a0a" : quickResult.verdict === "pass" ? "#1a0a0a" : "#1a1d27",
            borderTop: `3px solid ${quickResult.verdict === "buy" ? "#22c55e" : quickResult.verdict === "pass" ? "#ef4444" : "#6c63ff"}`,
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              {quickResult.image && (
                <img src={quickResult.image} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {quickResult.name}
                </div>
                {quickResult.stats ? (
                  <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                    <span style={{ color: "#22c55e" }}>Low: ${quickResult.stats.low}</span>
                    <span style={{ color: "#3b82f6" }}>Med: ${quickResult.stats.median}</span>
                    <span style={{ color: "#ef4444" }}>High: ${quickResult.stats.high}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#7b82b0" }}>No eBay data found</div>
                )}
              </div>
              <div style={{
                fontSize: 13,
                fontWeight: 800,
                padding: "4px 10px",
                borderRadius: 6,
                background: quickResult.verdict === "buy" ? "rgba(34,197,94,0.2)" : quickResult.verdict === "pass" ? "rgba(239,68,68,0.2)" : "rgba(108,99,255,0.2)",
                color: quickResult.verdict === "buy" ? "#22c55e" : quickResult.verdict === "pass" ? "#ef4444" : "#8b85ff",
                flexShrink: 0,
              }}>
                {quickResult.verdict === "buy" ? "BUY" : quickResult.verdict === "pass" ? "PASS" : "CHECK"}
              </div>
            </div>
          </div>
        )}

        {/* Session history */}
        {quickHistory.length > 1 && (
          <div style={qs.history}>
            <div style={{ fontSize: 11, color: "#7b82b0", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              This session
            </div>
            {quickHistory.slice(1, 6).map((item, i) => (
              <div key={i} style={qs.historyRow}>
                <span style={{ fontSize: 13, color: "#e8eaf6", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.name}
                </span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: item.verdict === "buy" ? "#22c55e" : item.verdict === "pass" ? "#ef4444" : "#8b85ff",
                }}>
                  {item.verdict === "buy" ? "BUY" : item.verdict === "pass" ? "PASS" : "?"}
                </span>
                {item.stats?.median && (
                  <span style={{ fontSize: 12, color: "#3b82f6", marginLeft: 8 }}>${item.stats.median}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // HOME / CAMERA VIEW
  return (
    <div className="page scout-home">
      {/* Header with Quick Scan button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Scout</h1>
          {todaysPurchases.length > 0 && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0 0" }}>
              {todaysPurchases.length} items today
            </p>
          )}
        </div>
        {/* QUICK SCAN BUTTON - top right */}
        <button
          onClick={() => {
            setQuickResult(null);
            setQuickError(null);
            setQuickHistory([]);
            setView(SCOUT_VIEWS.QUICK_SCAN);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            background: "linear-gradient(135deg, #6c63ff, #a855f7)",
            border: "none",
            borderRadius: 10,
            color: "white",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 12px rgba(108,99,255,0.4)",
          }}
        >
          <span style={{ fontSize: 16 }}>⚡</span>
          Quick Scan
        </button>
      </div>

      {/* Today's Score */}
      {todaysPurchases.length > 0 && (
        <div className="todays-score">
          <div className="score-label">Today's Haul</div>
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

      {idError && (
        <div className="id-error" style={{ marginBottom: 16 }}>{idError}</div>
      )}

      <ScoutCamera
        onPhotoTaken={handlePhotoTaken}
        onBarcodeClick={() => setView(SCOUT_VIEWS.BARCODE)}
        onManualClick={() => setView(SCOUT_VIEWS.MANUAL)}
      />

      <button
        className="pass-log-link"
        onClick={() => setView(SCOUT_VIEWS.PASS_LOG)}
      >
        Pass Log ({passes.length} items)
      </button>
    </div>
  );
}

// Quick scan styles
const qs = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#0a0b12",
    color: "white",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid #1a1d27",
  },
  exitBtn: {
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#f87171",
    padding: "6px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "white",
  },
  headerCount: {
    fontSize: 13,
    color: "#6c63ff",
    fontWeight: 700,
  },
  viewport: {
    position: "relative",
    width: "100%",
    height: 280,
    background: "black",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  scanFrame: {
    position: "absolute",
    width: 260,
    height: 120,
    border: "2px solid #6c63ff",
    borderRadius: 8,
    boxShadow: "0 0 0 2000px rgba(0,0,0,0.4)",
  },
  hint: {
    position: "absolute",
    bottom: 12,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    margin: 0,
  },
  resultCard: {
    padding: "14px 16px",
    background: "#1a1d27",
    display: "flex",
    alignItems: "center",
    gap: 12,
    minHeight: 72,
  },
  spinner: {
    width: 24,
    height: 24,
    border: "2px solid rgba(108,99,255,0.3)",
    borderTop: "2px solid #6c63ff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  history: {
    padding: "12px 16px",
    flex: 1,
    overflowY: "auto",
  },
  historyRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 0",
    borderBottom: "1px solid #1a1d27",
  },
};
