import { useState, useEffect } from "react";
import { CATEGORIES, CONDITIONS, PLATFORMS, SOURCE_LOCATIONS, STATUSES } from "../utils/constants";
import { calcProfit, estimateProfit, formatCurrency } from "../utils/profit";

export default function AddItem({ settings, editingItem, onSave, onCancel }) {
  const activeCategories = CATEGORIES.filter(c => settings.activeCategories?.includes(c.id));
  const grouped = activeCategories.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {});

  const blank = {
    name: "",
    description: "",
    category: "",
    sourceLocation: "",
    datePurchased: new Date().toISOString().split("T")[0],
    paidPrice: "",
    condition: "Good",
    avgSoldPrice: "",
    valueLow: "",
    valueHigh: "",
    listPrice: "",
    quickFlip: false,
    listedOn: "eBay",
    listPrice2: "",
    soldPrice: "",
    shippingCost: "",
    packagingCost: settings.packagingCost || 0.75,
    status: "Unlisted",
    notes: "",
    physicalLocation: "",
    haulTag: "",
    dateSold: "",
  };

  const [form, setForm] = useState(blank);
  const [showProfit, setShowProfit] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setForm({ ...blank, ...editingItem });
    } else {
      setForm({ ...blank, packagingCost: settings.packagingCost || 0.75 });
    }
  }, [editingItem]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const platformFee = settings.platformFees?.[form.listedOn] ?? 13.25;

  const estProfit = estimateProfit({
    paidPrice: form.paidPrice,
    avgSoldPrice: form.avgSoldPrice || form.listPrice,
    shippingCost: form.shippingCost,
    platformFee,
    packagingCost: form.packagingCost,
  });

  const actualProfit = form.soldPrice ? calcProfit({
    paidPrice: form.paidPrice,
    soldPrice: form.soldPrice,
    shippingCost: form.shippingCost,
    platformFee,
    packagingCost: form.packagingCost,
  }) : null;

  const profitDisplay = actualProfit || estProfit;
  const isGood = profitDisplay.netProfit >= (settings.minProfit || 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("Item name is required.");
    onSave(form);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>{editingItem ? "Edit Item" : "Add Item"}</h1>
        <p className="page-sub">{editingItem ? "Update item details" : "Log a new find"}</p>
      </div>

      <form onSubmit={handleSubmit} className="item-form">

        {/* BASICS */}
        <div className="form-section">
          <h3>The Find</h3>
          <div className="form-group">
            <label>Item Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. Elton John vinyl LP 1973"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Notes about the item, edition, markings..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}>
              <option value="">Select category...</option>
              {Object.entries(grouped).map(([group, cats]) => (
                <optgroup key={group} label={group}>
                  {cats.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Condition</label>
              <select value={form.condition} onChange={e => set("condition", e.target.value)}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Quick Flip?</label>
              <div className="toggle-row">
                <button
                  type="button"
                  className={`toggle-btn ${form.quickFlip ? "active" : ""}`}
                  onClick={() => set("quickFlip", !form.quickFlip)}
                >
                  {form.quickFlip ? "⚡ Quick Flip" : "⏳ Hold"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SOURCING */}
        <div className="form-section">
          <h3>Where & When</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Source Location</label>
              <select value={form.sourceLocation} onChange={e => set("sourceLocation", e.target.value)}>
                <option value="">Select...</option>
                {SOURCE_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Date Found</label>
              <input type="date" value={form.datePurchased} onChange={e => set("datePurchased", e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Haul / Trip Tag</label>
              <input type="text" value={form.haulTag} onChange={e => set("haulTag", e.target.value)} placeholder="e.g. Allen Estate Sale June 2026" />
            </div>
            <div className="form-group">
              <label>Physical Location</label>
              <input type="text" value={form.physicalLocation} onChange={e => set("physicalLocation", e.target.value)} placeholder="e.g. Bin 3, Shelf A" />
            </div>
          </div>
        </div>

        {/* COST */}
        <div className="form-section">
          <h3>What You Paid</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Amount Paid *</label>
              <div className="input-prefix">
                <span>$</span>
                <input type="number" step="0.01" min="0" value={form.paidPrice} onChange={e => set("paidPrice", e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="form-group">
              <label>Packaging Cost</label>
              <div className="input-prefix">
                <span>$</span>
                <input type="number" step="0.01" min="0" value={form.packagingCost} onChange={e => set("packagingCost", e.target.value)} placeholder="0.75" />
              </div>
            </div>
          </div>
        </div>

        {/* PRICING */}
        <div className="form-section">
          <h3>Market Value</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Avg eBay Sold Price</label>
              <div className="input-prefix">
                <span>$</span>
                <input type="number" step="0.01" min="0" value={form.avgSoldPrice} onChange={e => set("avgSoldPrice", e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="form-group">
              <label>Your List Price</label>
              <div className="input-prefix">
                <span>$</span>
                <input type="number" step="0.01" min="0" value={form.listPrice} onChange={e => set("listPrice", e.target.value)} placeholder="0.00" />
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Value Low</label>
              <div className="input-prefix">
                <span>$</span>
                <input type="number" step="0.01" min="0" value={form.valueLow} onChange={e => set("valueLow", e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="form-group">
              <label>Value High</label>
              <div className="input-prefix">
                <span>$</span>
                <input type="number" step="0.01" min="0" value={form.valueHigh} onChange={e => set("valueHigh", e.target.value)} placeholder="0.00" />
              </div>
            </div>
          </div>
        </div>

        {/* LISTING */}
        <div className="form-section">
          <h3>Listing & Sale</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Platform</label>
              <select value={form.listedOn} onChange={e => set("listedOn", e.target.value)}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p} ({settings.platformFees?.[p] ?? 0}%)</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {(form.status === "Sold") && (
            <div className="form-row">
              <div className="form-group">
                <label>Sold For</label>
                <div className="input-prefix">
                  <span>$</span>
                  <input type="number" step="0.01" min="0" value={form.soldPrice} onChange={e => set("soldPrice", e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="form-group">
                <label>Shipping Paid</label>
                <div className="input-prefix">
                  <span>$</span>
                  <input type="number" step="0.01" min="0" value={form.shippingCost} onChange={e => set("shippingCost", e.target.value)} placeholder="0.00" />
                </div>
              </div>
            </div>
          )}

          {form.status === "Sold" && (
            <div className="form-group">
              <label>Date Sold</label>
              <input type="date" value={form.dateSold} onChange={e => set("dateSold", e.target.value)} />
            </div>
          )}
        </div>

        {/* PROFIT PREVIEW */}
        {(form.paidPrice && (form.avgSoldPrice || form.listPrice || form.soldPrice)) && (
          <div className={`profit-preview ${isGood ? "good" : "bad"}`}>
            <div className="profit-preview-label">
              {form.soldPrice ? "Actual Net Profit" : "Estimated Net Profit"}
            </div>
            <div className="profit-preview-value">
              {formatCurrency(profitDisplay.netProfit)}
            </div>
            <div className="profit-preview-details">
              ROI: {profitDisplay.roi}% · Fees: {formatCurrency(profitDisplay.feeAmount)}
            </div>
            <div className={`profit-verdict ${isGood ? "good" : "bad"}`}>
              {isGood ? "✅ Worth it" : `❌ Below $${settings.minProfit} minimum`}
            </div>
          </div>
        )}

        {/* NOTES */}
        <div className="form-section">
          <h3>Notes</h3>
          <div className="form-group">
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Anything else worth noting..."
              rows={3}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">
            {editingItem ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
