import { supabase } from "./supabase";

// ===== ITEMS =====
export const dbLoadItems = async (userId) => {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", userId)
    .order("date_added", { ascending: false });
  if (error) throw error;
  return data.map(dbToItem);
};

export const dbSaveItem = async (item, userId) => {
  const row = itemToDb(item, userId);
  const { data, error } = await supabase
    .from("items")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return dbToItem(data);
};

export const dbDeleteItem = async (id) => {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
};

export const dbUpdateItemStatus = async (id, status, soldData = {}) => {
  const { error } = await supabase
    .from("items")
    .update({
      status,
      sold_price: soldData.soldPrice || 0,
      shipping_cost: soldData.shippingCost || 0,
      date_sold: soldData.dateSold || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
};

// ===== PASSES =====
export const dbLoadPasses = async (userId) => {
  const { data, error } = await supabase
    .from("passes")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data.map(dbToPass);
};

export const dbSavePass = async (pass, userId) => {
  const { error } = await supabase.from("passes").insert({
    user_id: userId,
    identified: pass.identified,
    photo_data_url: pass.photoDataUrl,
    asking_price: parseFloat(pass.askingPrice) || 0,
    avg_sold: parseFloat(pass.avgSold) || 0,
    profit_data: pass.profitData,
    pass_reason: pass.passReason,
    pass_note: pass.passNote,
    location: pass.location,
    date: pass.date || new Date().toISOString(),
  });
  if (error) throw error;
};

// ===== SETTINGS =====
export const dbLoadSettings = async (userId) => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("settings")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data?.settings || null;
};

export const dbSaveSettings = async (settings, userId) => {
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, settings, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
};

// ===== CONVERTERS =====
const itemToDb = (item, userId) => ({
  id: item.id,
  user_id: userId,
  name: item.name || "",
  description: item.description || "",
  category: item.category || "",
  source_location: item.sourceLocation || "",
  date_purchased: item.datePurchased || "",
  paid_price: parseFloat(item.paidPrice) || 0,
  condition: item.condition || "",
  avg_sold_price: parseFloat(item.avgSoldPrice) || 0,
  value_low: parseFloat(item.valueLow) || 0,
  value_high: parseFloat(item.valueHigh) || 0,
  list_price: parseFloat(item.listPrice) || 0,
  quick_flip: item.quickFlip || false,
  listed_on: item.listedOn || "eBay",
  sold_price: parseFloat(item.soldPrice) || 0,
  shipping_cost: parseFloat(item.shippingCost) || 0,
  packaging_cost: parseFloat(item.packagingCost) || 0.75,
  status: item.status || "Unlisted",
  notes: item.notes || "",
  physical_location: item.physicalLocation || "",
  haul_tag: item.haulTag || "",
  date_sold: item.dateSold || null,
  photo_data_url: item.photoDataUrl || null,
  location: item.location || null,
  date_added: item.dateAdded || new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const dbToItem = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  category: row.category,
  sourceLocation: row.source_location,
  datePurchased: row.date_purchased,
  paidPrice: row.paid_price,
  condition: row.condition,
  avgSoldPrice: row.avg_sold_price,
  valueLow: row.value_low,
  valueHigh: row.value_high,
  listPrice: row.list_price,
  quickFlip: row.quick_flip,
  listedOn: row.listed_on,
  soldPrice: row.sold_price,
  shippingCost: row.shipping_cost,
  packagingCost: row.packaging_cost,
  status: row.status,
  notes: row.notes,
  physicalLocation: row.physical_location,
  haulTag: row.haul_tag,
  dateSold: row.date_sold,
  photoDataUrl: row.photo_data_url,
  location: row.location,
  dateAdded: row.date_added,
});

const dbToPass = (row) => ({
  id: row.id,
  identified: row.identified,
  photoDataUrl: row.photo_data_url,
  askingPrice: row.asking_price,
  avgSold: row.avg_sold,
  profitData: row.profit_data,
  passReason: row.pass_reason,
  passNote: row.pass_note,
  location: row.location,
  date: row.date,
});
