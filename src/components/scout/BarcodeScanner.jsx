import { useEffect, useRef, useState } from "react";

export default function BarcodeScanner({ onDetected, onCancel }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("starting");
  const [error, setError] = useState(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStatus("scanning");
      }
    } catch (err) {
      setError("Camera access denied. Please allow camera access and try again.");
      setStatus("error");
    }
  };

  const handleManualBarcode = (e) => {
    e.preventDefault();
    const barcode = e.target.barcode.value.trim();
    if (barcode) {
      cleanup();
      onDetected(barcode);
    }
  };

  return (
    <div className="barcode-scanner">
      <div className="scanner-header">
        <button className="back-btn" onClick={() => { cleanup(); onCancel(); }}>← Back</button>
        <h2>Scan Barcode</h2>
        <div />
      </div>

      {error ? (
        <div className="scanner-error">
          <div className="empty-icon">📷</div>
          <p>{error}</p>
        </div>
      ) : (
        <div className="scanner-viewport">
          <video ref={videoRef} className="scanner-video" playsInline muted />
          <div className="scanner-overlay">
            <div className="scanner-frame" />
          </div>
          {status === "scanning" && (
            <div className="scanner-hint">Point at barcode — or enter manually below</div>
          )}
        </div>
      )}

      <div className="scanner-manual">
        <p className="scanner-manual-label">Enter barcode manually:</p>
        <form onSubmit={handleManualBarcode} className="scanner-manual-form">
          <input
            name="barcode"
            type="text"
            placeholder="ISBN or UPC..."
            className="scanner-input"
            inputMode="numeric"
          />
          <button type="submit" className="btn-primary">Look Up</button>
        </form>
      </div>

      <div className="scanner-info">
        <p>📚 Books use ISBN (on back cover)</p>
        <p>💿 CDs/DVDs/Games use UPC (on back)</p>
      </div>
    </div>
  );
}
