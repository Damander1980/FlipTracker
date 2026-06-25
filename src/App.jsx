import { useState, useEffect, useCallback } from "react";
import Dashboard from "./components/Dashboard";
import Inventory from "./components/Inventory";
import AddItem from "./components/AddItem";
import Scout from "./components/Scout";
import Settings from "./components/Settings";
import LoginScreen from "./components/LoginScreen";
import { useAuth } from "./context/AuthContext";
import { CATEGORIES } from "./utils/constants";
import {
  dbLoadItems, dbSaveItem, dbDeleteItem, dbUpdateItemStatus,
  dbLoadPasses, dbSavePass,
  dbLoadSettings, dbSaveSettings,
} from "./utils/db";

const DEFAULT_SETTINGS = {
  minProfit: 1,
  packagingCost: 0.75,
  themeMode: "auto",
  minAcceptableRoi: 20,
  platformFees: {
    eBay: 13.25,
    Facebook: 0,
    Mercari: 10,
    Poshmark: 20,
    Etsy: 6.5,
    Local: 0,
  },
  activeCategories: CATEGORIES.map(c => c.id),
};

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [view, setView] = useState("dashboard");
  const [items, setItems] = useState([]);
  const [passes, setPasses] = useState([]);
  const [todaysPurchases, setTodaysPurchases] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [editingItem, setEditingItem] = useState(null);
  const [notification, setNotification] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [systemDark, setSystemDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Apply theme
  useEffect(() => {
    const isDark =
      settings.themeMode === "dark" ||
      (settings.themeMode === "auto" && systemDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [settings.themeMode, systemDark]);

  // Load data from Supabase when user logs in
  useEffect(() => {
    if (!user) {
      setItems([]);
      setPasses([]);
      setSettings(DEFAULT_SETTINGS);
      return;
    }
    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    setDataLoading(true);
    try {
      const [loadedItems, loadedPasses, loadedSettings] = await Promise.all([
        dbLoadItems(user.id),
        dbLoadPasses(user.id),
        dbLoadSettings(user.id),
      ]);
      setItems(loadedItems);
      setPasses(loadedPasses);
      if (loadedSettings) {
        setSettings(prev => ({ ...prev, ...loadedSettings }));
      }
    } catch (err) {
      console.error("Error loading data:", err);
      showNotification("Error loading data. Please refresh.", "error");
    } finally {
      setDataLoading(false);
    }
  };

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const addItem = async (item, scoutData = null) => {
    const newItem = {
      ...item,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString(),
    };
    try {
      const saved = await dbSaveItem(newItem, user.id);
      setItems(prev => [saved, ...prev]);
      if (scoutData) {
        setTodaysPurchases(prev => [...prev, { ...scoutData, id: saved.id }]);
        showNotification("Added to inventory! 🎉");
      } else {
        showNotification("Item added!");
        setView("inventory");
      }
    } catch (err) {
      console.error("Error saving item:", err);
      showNotification("Error saving item.", "error");
    }
  };

  const updateItem = async (updated) => {
    try {
      const saved = await dbSaveItem(updated, user.id);
      setItems(prev => prev.map(i => i.id === saved.id ? saved : i));
      showNotification("Item updated!");
      setEditingItem(null);
      setView("inventory");
    } catch (err) {
      showNotification("Error updating item.", "error");
    }
  };

  const deleteItem = async (id) => {
    try {
      await dbDeleteItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      showNotification("Item deleted.", "error");
    } catch (err) {
      showNotification("Error deleting item.", "error");
    }
  };

  const updateItemStatus = async (id, status, soldData = {}) => {
    try {
      await dbUpdateItemStatus(id, status, soldData);
      setItems(prev => prev.map(i =>
        i.id === id ? {
          ...i,
          status,
          soldPrice: soldData.soldPrice || i.soldPrice,
          shippingCost: soldData.shippingCost || i.shippingCost,
          dateSold: soldData.dateSold || i.dateSold,
        } : i
      ));
    } catch (err) {
      showNotification("Error updating status.", "error");
    }
  };

  const logPass = async (passData) => {
    try {
      await dbSavePass(passData, user.id);
      setPasses(prev => [passData, ...prev]);
      showNotification("Pass logged.");
    } catch (err) {
      showNotification("Error logging pass.", "error");
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await dbSaveSettings(newSettings, user.id);
      setSettings(newSettings);
      showNotification("Settings saved!");
    } catch (err) {
      showNotification("Error saving settings.", "error");
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setView("add");
  };

  const cycleTheme = () => {
    const order = ["auto", "dark", "light"];
    const next = order[(order.indexOf(settings.themeMode) + 1) % order.length];
    const newSettings = { ...settings, themeMode: next };
    setSettings(newSettings);
    if (user) dbSaveSettings(newSettings, user.id);
  };

  const themeIcon = settings.themeMode === "dark" ? "🌙" : settings.themeMode === "light" ? "☀️" : "🌓";

  // Show auth loading
  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="spinner large-spinner" />
        <p>Loading FlipTracker...</p>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  // Show data loading
  if (dataLoading) {
    return (
      <div className="app-loading">
        <div className="spinner large-spinner" />
        <p>Loading your inventory...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.msg}
        </div>
      )}

      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🏷️</span>
            <span className="logo-text">FlipTracker</span>
          </div>
          <div className="header-right">
            <button className="theme-toggle" onClick={cycleTheme} title={`Theme: ${settings.themeMode}`}>
              <span>{themeIcon}</span>
              <span className="theme-label">{settings.themeMode}</span>
            </button>
            <button className="signout-btn" onClick={signOut} title="Sign out">
              👤 {user.email?.split("@")[0]}
            </button>
            <nav className="nav">
              {[
                { id: "dashboard", label: "Dashboard", icon: "📊" },
                { id: "inventory", label: "Inventory", icon: "📦" },
                { id: "scout", label: "Scout", icon: "🔍" },
                { id: "add", label: "Add Item", icon: "➕" },
                { id: "settings", label: "Settings", icon: "⚙️" },
              ].map(n => (
                <button
                  key={n.id}
                  className={`nav-btn ${view === n.id ? "active" : ""}`}
                  onClick={() => {
                    if (n.id !== "add") setEditingItem(null);
                    setView(n.id);
                  }}
                >
                  <span className="nav-icon">{n.icon}</span>
                  <span className="nav-label">{n.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="main">
        {view === "dashboard" && (
          <Dashboard items={items} settings={settings} onNavigate={setView} />
        )}
        {view === "inventory" && (
          <Inventory
            items={items}
            settings={settings}
            onEdit={startEdit}
            onDelete={deleteItem}
            onStatusChange={updateItemStatus}
          />
        )}
        {view === "add" && (
          <AddItem
            settings={settings}
            editingItem={editingItem}
            onSave={editingItem ? updateItem : addItem}
            onCancel={() => { setEditingItem(null); setView("inventory"); }}
          />
        )}
        {view === "scout" && (
          <Scout
            settings={settings}
            onAddItem={addItem}
            passes={passes}
            onPassLogged={logPass}
            todaysPurchases={todaysPurchases}
          />
        )}
        {view === "settings" && (
          <Settings
            settings={settings}
            onSave={saveSettings}
            onSignOut={signOut}
            userEmail={user.email}
          />
        )}
      </main>

      <nav className="bottom-nav">
        {[
          { id: "dashboard", label: "Dashboard", icon: "📊" },
          { id: "scout", label: "Scout", icon: "🔍" },
          { id: "add", label: "Add", icon: "➕" },
          { id: "inventory", label: "Inventory", icon: "📦" },
          { id: "settings", label: "Settings", icon: "⚙️" },
        ].map(n => (
          <button
            key={n.id}
            className={`bottom-nav-btn ${view === n.id ? "active" : ""}`}
            onClick={() => {
              if (n.id !== "add") setEditingItem(null);
              setView(n.id);
            }}
          >
            <span>{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
