import { useState } from "react";
import { supabase } from "../lib/supabaseClient"; // adjust path if needed

export function useEbayLookup() {
  const [results, setResults] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lookup = async ({ query, upc }) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setStats(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ebay-lookup", {
        body: { query, upc, limit: 10 },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setResults(data.results);
      setStats(data.stats);
    } catch (err) {
      setError(err.message || "eBay lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setResults(null);
    setStats(null);
    setError(null);
  };

  return { lookup, results, stats, loading, error, clear };
}
