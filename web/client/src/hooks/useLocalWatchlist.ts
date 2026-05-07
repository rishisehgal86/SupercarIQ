/**
 * useLocalWatchlist — localStorage-based watchlist, no auth required.
 * Stores an array of { carId, carModel, askingPriceAtAdd, addedAt } in localStorage.
 * carId accepts both number (812/F8) and string (458/488/CalT/Portofino/Roma) IDs.
 */
import { useState, useEffect, useCallback } from "react";

export interface WatchlistEntry {
  carId: number | string;
  carModel: string;
  askingPriceAtAdd: number;
  addedAt: number; // UTC timestamp ms
}

const STORAGE_KEY = "supercariq_watchlist";

function readStorage(): WatchlistEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WatchlistEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(entries: WatchlistEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function useLocalWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>(() => readStorage());

  // Keep state in sync if another tab changes localStorage
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEntries(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isWatched = useCallback(
    (carId: number | string, carModel: string) =>
      entries.some((e) => String(e.carId) === String(carId) && e.carModel === carModel),
    [entries]
  );

  const add = useCallback((carId: number | string, carModel: string, askingPriceAtAdd: number) => {
    setEntries((prev) => {
      if (prev.some((e) => String(e.carId) === String(carId) && e.carModel === carModel)) return prev;
      const next = [...prev, { carId, carModel, askingPriceAtAdd, addedAt: Date.now() }];
      writeStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((carId: number | string, carModel: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => !(String(e.carId) === String(carId) && e.carModel === carModel));
      writeStorage(next);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (carId: number | string, carModel: string, askingPriceAtAdd: number) => {
      if (isWatched(carId, carModel)) {
        remove(carId, carModel);
        return false;
      } else {
        add(carId, carModel, askingPriceAtAdd);
        return true;
      }
    },
    [isWatched, add, remove]
  );

  return { entries, isWatched, add, remove, toggle };
}
