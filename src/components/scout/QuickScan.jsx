import { useState, useEffect, useRef } from "react";
import { supabase } from "../../utils/supabase";

// Single beep/vibrate on scan confirmation
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 1200;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.12);
  } catch (e) {
    if (navigator.vibrate) navigator.vibrate(80);
  }
}

const DEFAULT_THRESHOLDS = {
  minMedianPrice: 10,    // Minimum eBay median price to buy
  minProfit: 5,          // Minimum profit after fees
  platformFee: 13.25,    // eBay fee %
  shippingCost: 4.00,    // Estimated shipping
};

export default function QuickScan({ onClose, settings }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [thresholds, setThresholds] = useState({
    ...DEFAULT_THRESHOLDS,
    minProfit: settings?.minProfit || DEFAULT_THRESHOLDS.minProfit,
    platformFee: settings?.platformFees?.eBay || DEFAULT_THRESHOLDS.platformFee,
  });
  const [lastScanned, setLastScanned] = useState(null);

  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const scanningRef = useRef(true);
  const activeRef = useRef(true);

  useEffect(() => {
    startScanner();
    return () => {
      activeRef.current = false;
      scanningRef.current = false;
      if (readerRef.current) readerRef.current.reset();
    };
  }, []);

  const startScanner = async () => {
    try {
      const { BrowserMultiFormatReader, NotFoundException } = await import("@zxing/library");
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const devices = await reader.listVideoInputDevices();
      if (!devices.length) { setError("No camera found"); return; }

      const back = devices.find(d =>
        d.label.toLowerCase().includes("back") ||
        d.label.toLowerCase().includes("rear") ||
        d.label.toLowerCase().includes("environment")
      );
      const deviceId = back?.deviceId || devices[0].deviceId;

      await reader.decodeFromVideoDevice(deviceId, videoRef.current, async (res, err) => {
        if (!activeRef.current || !scanningRef.current) return;
        if (res) {
          const code = res.getText();
          // Debounce - don't scan same code twice in a row
          if (code === lastScanned) return;
          setLastScanned(code);
          scanningRef.current = false;
          playBeep();
          if (navigator.vibrate) navigator.vibrate(80);
          await handleBarcode(code);
          // Resume scanning after 2.5 seconds
          setTimeout(() => {
            if (activeRef.current) {
              scanningRef.current = true;
              setLastScanned(null);
            }
          }, 2500);
        }
      });
    } catch (err) {
      setError("Camera error: " + err.message);
    }
  };

  const calcVerdict = (medianPrice, askingPrice = 0) => {
    if (!medianPrice) return { verdict: "unknown", profit: null };
    const median = parseFloat(medianPrice);
    const fees = median * (thresholds.platformFee / 100);
    const profit = median - fees - thresholds.shippingCost - askingPrice;
    if (median >= thresholds.minMedianPrice && profit >= thresholds.minProfit) {
      return { verdict: "buy", profit: profit.toFixed(2) };
    }
    return { verdict: "pass", profit: profit.toFixed(2) };
  };

  const handleBarcode = async (code) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Run UPC/ISBN lookup and eBay lookup simultaneously
      const [upcResponse, ebayResponse] = await Promise.all([
        supabase.functions.invoke("upc-lookup", { body: { upc: code } }),
        supabase.functions.invoke("ebay-lookup", { body: { upc: code, limit: 10 } }),
      ]);

      const upcData = upcResponse.data;
      const ebayData = ebayResponse.data;

      // If eBay has no results but we have a name, try searching by name
      let finalEbayData = ebayData;
      if ((!ebayData?.stats) && upcData?.found && upcData?.searchQuery) {
        const { data: nameSearch } = await supabase.functions.invoke("ebay-lookup", {
          body: { query: upcData.searchQuery, limit: 10 },
        });
        finalEbayData = nameSearch;
      }

      const { verdict, profit } = calcVerdict(finalEbayData?.stats?.median);

      const newResult = {
        barcode: code,
        name: upcData?.found ? upcData.name : `Barcode: ${code}`,
        image: upcData?.image || null,
        isBook: upcData?.isBook || false,
        publisher: upcData?.publisher || null,
        publishYear: upcData?.publishYear || null,
        found: upcData?.found || false,
        stats: finalEbayData?.stats || null,
        verdict,
        profit,
        timestamp: new Date(),
      };

      setResult(newResult);
      setHistory(prev => [newResult, ...prev.slice(0, 29)]);

    } catch (err) {
      setError("Lookup failed");
      playBeep();
    } finally {
      setLoading(false);
    }
  };

  const verdictColor = (v) => v === "buy" ? "#22c55e" : v === "pass" ? "#ef4444" : "#6c63ff";
  const verdictBg = (v) => v === "buy" ? "rgba(34,197,94,0.15)" : v === "pass" ? "rgba(239,68,68,0.15)" : "rgba(108,99,255,0.15)";
  const verdictLabel = (v) => v === "buy" ? "BUY" : v === "pass" ? "PASS" : "CHECK";

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <button onClick={onClose} style={s.exitBtn}>✕ Exit</button>
        <span style={s.title}>⚡ Quick Scan</span>
        <button onClick={() => setShowSettings(v => !v)} style={s.settingsBtn}>⚙️</button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div style={s.settingsPanel}>
          <div style={s.settingRow}>
            <span style={s.settingLabel}>Min eBay Median</span>
            <div style={s.settingInput}>
              <span style={s.settingPrefix}>$</span>
              <input
                type="number"
                value={thresholds.minMedianPrice}
                onChange={e => setThresholds(t => ({ ...t, minMedianPrice: parseFloat(e.target.value) || 0 }))}
                style={s.input}
              />
            </div>
          </div>
          <div style={s.settingRow}>
            <span style={s.settingLabel}>Min Profit</span>
            <div style={s.settingInput}>
              <span style={s.settingPrefix}>$</span>
              <input
                type="number"
                value={thresholds.minProfit}
                onChange={e => setThresholds(t => ({ ...t, minProfit: parseFloat(e.target.value) || 0 }))}
                style={s.input}
              />
            </div>
          </div>
          <div style={s.settingRow}>
            <span style={s.settingLabel}>eBay Fee %</span>
            <div style={s.settingInput}>
              <input
                type="number"
                value={thresholds.platformFee}
                onChange={e => setThresholds(t => ({ ...t, platformFee: parseFloat(e.target.value) || 0 }))}
                style={s.input}
              />
              <span style={s.settingPrefix}>%</span>
            </div>
          </div>
          <div style={s.settingRow}>
            <span style={s.settingLabel}>Est. Shipping</span>
            <div style={s.settingInput}>
              <span style={s.settingPrefix}>$</span>
              <input
                type="number"
                value={thresholds.shippingCost}
                onChange={e => setThresholds(t => ({ ...t, shippingCost: parseFloat(e.target.value) || 0 }))}
                style={s.input}
              />
            </div>
          </div>
        </div>
      )}

      {/* Camera viewport */}
      <div style={s.viewport}>
        <video ref={videoRef} style={s.video} playsInline muted autoPlay />
        <div style={s.scanFrame} />
        {!loading && !result && !error && (
          <p style={s.hint}>Point camera at barcode or ISBN</p>
        )}
        {loading && (
          <div style={s.loadingOverlay}>
            <div style={s.spinner} />
            <span style={{ color: "white", fontSize: 13, marginTop: 8 }}>Looking up...</span>
          </div>
        )}
      </div>

      {/* Result card */}
      {result && !loading && (
        <div style={{
          ...s.resultCard,
          borderTop: `3px solid ${verdictColor(result.verdict)}`,
          background: result.verdict === "buy" ? "#071a0a" : result.verdict === "pass" ? "#1a0707" : "#0d0f1a",
        }}>
          <div style={s.resultTop}>
            {result.image && (
              <img src={result.image} alt="" style={s.resultImg} />
            )}
            <div style={s.resultInfo}>
              <div style={s.resultName}>{result.name}</div>
              {result.isBook && result.publisher && (
                <div style={s.resultMeta}>{result.publisher}{result.publishYear ? ` · ${result.publishYear}` : ""}</div>
              )}
              {result.stats ? (
                <div style={s.priceRow}>
                  <span style={{ color: "#22c55e" }}>↓${result.stats.low}</span>
                  <span style={{ color: "#3b82f6", fontWeight: 700 }}>~${result.stats.median}</span>
                  <span style={{ color: "#ef4444" }}>↑${result.stats.high}</span>
                  <span style={{ color: "#7b82b0" }}>({result.stats.count} listings)</span>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#7b82b0" }}>No eBay listings found</div>
              )}
            </div>
            <div style={{
              ...s.verdictBadge,
              background: verdictBg(result.verdict),
              color: verdictColor(result.verdict),
              border: `1px solid ${verdictColor(result.verdict)}`,
            }}>
              <div style={s.verdictLabel}>{verdictLabel(result.verdict)}</div>
              {result.profit && (
                <div style={s.verdictProfit}>~${result.profit}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={s.errorCard}>{error}</div>
      )}

      {/* Session count */}
      <div style={s.sessionBar}>
        <span style={{ color: "#7b82b0", fontSize: 12 }}>
          {history.length} scanned this session
        </span>
        <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>
          {history.filter(h => h.verdict === "buy").length} buys
        </span>
        <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>
          {history.filter(h => h.verdict === "pass").length} passes
        </span>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={s.history}>
          {history.slice(0, 8).map((item, i) => (
            <div key={i} style={s.historyRow}>
              <span style={{ fontSize: 11, color: verdictColor(item.verdict), fontWeight: 800, width: 40, flexShrink: 0 }}>
                {verdictLabel(item.verdict)}
              </span>
              <span style={s.historyName}>{item.name}</span>
              {item.stats?.median && (
                <span style={{ fontSize: 12, color: "#3b82f6", flexShrink: 0 }}>${item.stats.median}</span>
              )}
              {item.profit && (
                <span style={{ fontSize: 11, color: item.verdict === "buy" ? "#22c55e" : "#ef4444", flexShrink: 0 }}>
                  ~${item.profit}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  container: {
    position: "fixed",
    inset: 0,
    background: "#08090f",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
    color: "white",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderBottom: "1px solid #1a1d27",
    flexShrink: 0,
  },
  exitBtn: {
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#f87171",
    padding: "6px 12px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
  },
  settingsBtn: {
    background: "rgba(108,99,255,0.15)",
    border: "1px solid rgba(108,99,255,0.3)",
    color: "#8b85ff",
    padding: "6px 12px",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
  },
  settingsPanel: {
    background: "#0f1117",
    borderBottom: "1px solid #1a1d27",
    padding: "12px 14px",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    flexShrink: 0,
  },
  settingRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: "1 1 140px",
  },
  settingLabel: {
    fontSize: 11,
    color: "#7b82b0",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  settingInput: {
    display: "flex",
    alignItems: "center",
    background: "#1a1d27",
    border: "1px solid #2e3250",
    borderRadius: 6,
    overflow: "hidden",
  },
  settingPrefix: {
    fontSize: 12,
    color: "#7b82b0",
    padding: "0 6px",
  },
  input: {
    background: "transparent",
    border: "none",
    color: "white",
    fontSize: 13,
    width: 50,
    padding: "4px 4px",
    outline: "none",
  },
  viewport: {
    position: "relative",
    width: "100%",
    height: 300,
    background: "black",
    overflow: "hidden",
    flexShrink: 0,
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  scanFrame: {
    position: "absolute",
    width: 280,
    height: 140,
    border: "2px solid #6c63ff",
    borderRadius: 8,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    boxShadow: "0 0 0 2000px rgba(0,0,0,0.45)",
  },
  hint: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    margin: 0,
  },
  loadingOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: 28,
    height: 28,
    border: "2px solid rgba(108,99,255,0.3)",
    borderTop: "2px solid #6c63ff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  resultCard: {
    padding: "12px 14px",
    flexShrink: 0,
  },
  resultTop: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  resultImg: {
    width: 44,
    height: 44,
    objectFit: "cover",
    borderRadius: 6,
    flexShrink: 0,
  },
  resultInfo: {
    flex: 1,
    minWidth: 0,
  },
  resultName: {
    fontSize: 13,
    fontWeight: 700,
    color: "white",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    marginBottom: 3,
  },
  resultMeta: {
    fontSize: 11,
    color: "#7b82b0",
    marginBottom: 3,
  },
  priceRow: {
    display: "flex",
    gap: 8,
    fontSize: 12,
    flexWrap: "wrap",
  },
  verdictBadge: {
    padding: "6px 10px",
    borderRadius: 8,
    textAlign: "center",
    flexShrink: 0,
    minWidth: 52,
  },
  verdictLabel: {
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: 0.5,
  },
  verdictProfit: {
    fontSize: 10,
    fontWeight: 600,
    marginTop: 2,
    opacity: 0.8,
  },
  errorCard: {
    padding: "10px 14px",
    background: "rgba(239,68,68,0.1)",
    color: "#f87171",
    fontSize: 13,
    flexShrink: 0,
  },
  sessionBar: {
    display: "flex",
    gap: 16,
    padding: "8px 14px",
    borderTop: "1px solid #1a1d27",
    borderBottom: "1px solid #1a1d27",
    flexShrink: 0,
  },
  history: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 14px",
  },
  historyRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 0",
    borderBottom: "1px solid #1a1d27",
  },
  historyName: {
    flex: 1,
    fontSize: 12,
    color: "#c8cae6",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
