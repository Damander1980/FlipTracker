import { useRef, useState } from "react";

export default function ScoutCamera({ onPhotoTaken, onBarcodeClick, onManualClick }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const [header, base64] = dataUrl.split(",");
      const mime = header.match(/:(.*?);/)[1];
      onPhotoTaken({ dataUrl, base64, mime });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="scout-camera">
      <div className="scout-camera-header">
        <h1>🔍 Scout</h1>
        <p>How do you want to identify this item?</p>
      </div>

      <div className="scout-entry-options">
        <button className="scout-entry-btn primary" onClick={() => cameraRef.current?.click()}>
          <span className="entry-icon">📷</span>
          <span className="entry-label">Take Photo</span>
          <span className="entry-sub">AI identifies instantly</span>
        </button>

        <button className="scout-entry-btn" onClick={() => galleryRef.current?.click()}>
          <span className="entry-icon">🖼️</span>
          <span className="entry-label">Choose Photo</span>
          <span className="entry-sub">From camera roll</span>
        </button>

        <button className="scout-entry-btn" onClick={onBarcodeClick}>
          <span className="entry-icon">📊</span>
          <span className="entry-label">Scan Barcode</span>
          <span className="entry-sub">Books, CDs, games</span>
        </button>

        <button className="scout-entry-btn" onClick={onManualClick}>
          <span className="entry-icon">✏️</span>
          <span className="entry-label">Type It In</span>
          <span className="entry-sub">Manual search</span>
        </button>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
      <input ref={galleryRef} type="file" accept="image/*"
        style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}
