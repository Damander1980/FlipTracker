import { useState } from "react";
import { CATEGORIES, PLATFORMS } from "../utils/constants";

export default function Settings({ settings, onSave, onSignOut, userEmail }) {
  const [form, setForm] = useState({ ...settings });
  const [activeTab, setTab] = useState("general");

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const setFee = (platform, value) => setForm(prev => ({
    ...prev,
    platformFees: { ...prev.platformFees, [platform]: parseFloat(value) || 0 }
  }));

  const toggleCategory = (id) => {
    const active = form.activeCategories || [];
    if (active.includes(id)) {
      set("activeCategories", active.filter(c => c !== id));
    } else {
      set("activeCategories", [...active, id]);
    }
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {});

  const handleSave = () => onSave(form);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="page-sub">Customize FlipTracker for your business</p>
      </div>

      <div className="settings-tabs">
        {["general", "fees", "categories"].map(tab => (
          <button
            key={tab}
            className={`settings-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="settings-section">
          <div className="form-group">
            <label>Minimum Profit Threshold</label>
            <p className="field-hint">Items below this profit will show as "Not Worth It"</p>
            <div className="slider-container">
              <div className="slider-header">
                <span>Current: <strong>${form.minProfit}</strong></span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={form.minProfit}
                onChange={e => set("minProfit", parseFloat(e.target.value))}
                className="profit-slider"
              />
              <div className="slider-labels">
                <span>$0 — Any profit</span>
                <span>$50</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Default Packaging Cost</label>
            <p className="field-hint">Average cost of bubble mailers, boxes, tape per item</p>
            <div className="input-prefix">
              <span>$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.packagingCost}
                onChange={e => set("packagingCost", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "fees" && (
        <div className="settings-section">
          <p className="section-sub">Set the fee percentage for each platform. These auto-calculate in profit math.</p>
          {PLATFORMS.map(p => (
            <div key={p} className="fee-row">
              <label>{p}</label>
              <div className="fee-input">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.platformFees?.[p] ?? 0}
                  onChange={e => setFee(p, e.target.value)}
                />
                <span>%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "categories" && (
        <div className="settings-section">
          <p className="section-sub">Toggle the categories you deal in. Hidden categories won't appear in dropdowns.</p>
          <div className="category-toggle-actions">
            <button className="btn-sm" onClick={() => set("activeCategories", CATEGORIES.map(c => c.id))}>Enable All</button>
            <button className="btn-sm" onClick={() => set("activeCategories", [])}>Disable All</button>
          </div>
          {Object.entries(grouped).map(([group, cats]) => (
            <div key={group} className="category-group">
              <div className="category-group-label">{group}</div>
              <div className="category-toggles">
                {cats.map(cat => (
                  <button
                    key={cat.id}
                    className={`category-toggle-btn ${form.activeCategories?.includes(cat.id) ? "active" : ""}`}
                    onClick={() => toggleCategory(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="settings-save">
        <button className="btn-primary" onClick={handleSave}>Save Settings</button>
      </div>

      <div className="settings-account">
        <div className="account-info">
          <span className="account-label">Signed in as</span>
          <span className="account-email">{userEmail}</span>
        </div>
        <button className="btn-signout" onClick={onSignOut}>Sign Out</button>
      </div>
    </div>
  );
}
