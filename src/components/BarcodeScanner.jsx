import { useState, useEffect, useRef } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

/**
 * BarcodeScanner component for FlipTracker
 * 
 * INSTALL DEPENDENCY FIRST:
 * npm install @zxing/library
 * 
 * USAGE:
 * <BarcodeScanner onScan={(code) => console.log(code)} />
 * <BarcodeScanner onScan={(code) => handleUpc(code)} onClose={() => setShowScanner(false)} />
 */

export default function BarcodeScanner({ onScan, onClose }) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const videoRef = useRef(null);
  const readerRef = useRef(null);

  // Initialize reader and get available cameras
  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();

    readerRef.current.listVideoInputDevices().then((devices) => {
      setCameras(devices);
      // Default to back camera on mobile if available
      const backCamera = devices.find(
        (d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("rear")
      );
      setSelectedCamera(backCamera?.deviceId || devices[0]?.deviceId || null);
    }).catch((err) => {
      setError("Could not access cameras: " + err.message);
    });

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  const startScanning = async () => {
    if (!selectedCamera) {
      setError("No camera available");
      return;
    }

    setError(null);
    setIsScanning(true);
    setLastScan(null);

    try {
      await readerRef.current.decodeFromVideoDevice(
        selectedCamera,
        videoRef.current,
        (result, err) => {
          if (result) {
            const code = result.getText();
            setLastScan(code);
            setIsScanning(false);
            readerRef.current.reset();

            // Vibrate on mobile if supported
            if (navigator.vibrate) navigator.vibrate(100);

            // Call parent handler
            if (onScan) onScan(code);
          }
          if (err && !(err instanceof NotFoundException)) {
            console.warn("Scan error:", err);
          }
        }
      );
    } catch (err) {
      setError("Camera error: " + err.message);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
  };

  const handleScanAgain = () => {
    setLastScan(null);
    startScanning();
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Scan Barcode</h3>
        {onClose && (
          <button onClick={() => { stopScanning(); onClose(); }} style={closeButtonStyle}>
            ✕
          </button>
        )}
      </div>

      {/* Camera selector (show only if multiple cameras) */}
      {cameras.length > 1 && (
        <select
          value={selectedCamera || ""}
          onChange={(e) => setSelectedCamera(e.target.value)}
          style={selectStyle}
          disabled={isScanning}
        >
          {cameras.map((cam) => (
            <option key={cam.deviceId} value={cam.deviceId}>
              {cam.label || `Camera ${cam.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      )}

      {/* Video preview */}
      <div style={videoWrapperStyle}>
        <video
          ref={videoRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: isScanning ? "block" : "none",
            borderRadius: 8,
          }}
        />

        {/* Scanning overlay with crosshair */}
        {isScanning && (
          <div style={overlayStyle}>
            <div style={scanLineStyle} />
            <div style={crosshairStyle} />
          </div>
        )}

        {/* Placeholder when not scanning */}
        {!isScanning && (
          <div style={placeholderStyle}>
            {lastScan ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Scanned:</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>{lastScan}</div>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#999" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: 13 }}>Camera preview will appear here</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={errorStyle}>{error}</div>
      )}

      {/* Controls */}
      <div style={controlsStyle}>
        {!isScanning && !lastScan && (
          <button onClick={startScanning} style={primaryButtonStyle} disabled={!selectedCamera}>
            📷 Start Scanning
          </button>
        )}

        {isScanning && (
          <button onClick={stopScanning} style={secondaryButtonStyle}>
            ⏹ Stop
          </button>
        )}

        {lastScan && (
          <>
            <button onClick={handleScanAgain} style={secondaryButtonStyle}>
              🔄 Scan Again
            </button>
            {onScan && (
              <button onClick={() => onScan(lastScan)} style={primaryButtonStyle}>
                ✓ Use This Code
              </button>
            )}
          </>
        )}
      </div>

      {/* Manual entry fallback */}
      <ManualEntry onSubmit={(code) => { setLastScan(code); if (onScan) onScan(code); }} />
    </div>
  );
}

// Manual entry fallback component
function ManualEntry({ onSubmit }) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setValue("");
    }
  };

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 6, textAlign: "center" }}>
        — or enter manually —
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Enter UPC, ISBN, or barcode..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ddd",
            fontSize: 14,
          }}
        />
        <button onClick={handleSubmit} style={primaryButtonStyle}>
          Go
        </button>
      </div>
    </div>
  );
}

// Styles
const containerStyle = {
  background: "white",
  borderRadius: 12,
  padding: 16,
  maxWidth: 400,
  width: "100%",
  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
};

const closeButtonStyle = {
  background: "none",
  border: "none",
  fontSize: 18,
  cursor: "pointer",
  color: "#666",
  padding: 4,
};

const selectStyle = {
  width: "100%",
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #ddd",
  fontSize: 13,
  marginBottom: 10,
};

const videoWrapperStyle = {
  position: "relative",
  width: "100%",
  height: 240,
  background: "#000",
  borderRadius: 8,
  overflow: "hidden",
  marginBottom: 12,
};

const overlayStyle = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
};

const scanLineStyle = {
  position: "absolute",
  left: "10%",
  right: "10%",
  height: 2,
  background: "rgba(34, 197, 94, 0.8)",
  boxShadow: "0 0 8px rgba(34, 197, 94, 0.8)",
  animation: "scanline 2s ease-in-out infinite",
};

const crosshairStyle = {
  width: 200,
  height: 140,
  border: "2px solid rgba(255,255,255,0.6)",
  borderRadius: 8,
};

const placeholderStyle = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8f9fa",
};

const errorStyle = {
  color: "#ef4444",
  fontSize: 13,
  marginBottom: 10,
  padding: "8px 12px",
  background: "#fef2f2",
  borderRadius: 6,
};

const controlsStyle = {
  display: "flex",
  gap: 8,
  marginBottom: 4,
};

const primaryButtonStyle = {
  flex: 1,
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: "#3b82f6",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};

const secondaryButtonStyle = {
  flex: 1,
  padding: "10px 16px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "white",
  color: "#333",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};
