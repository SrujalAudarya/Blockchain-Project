"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { Land, TransferRecord } from "./types";

type LandRow = {
  id: number;
  location: string;
  area_square_meters: number;
  survey_number: string;
  document_ipfs_hash: string;
  market_value: number;
  current_owner: string;
  is_for_sale: boolean;
  registered_at: string;
  latitude: number | null;
  longitude: number | null;
};

type TransferRow = {
  id: number;
  land_id: number;
  from_owner: string;
  to_owner: string;
  transferred_at: string;
  note: string;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const STORAGE_KEY_LANDS = "land_registry_lands_v1";
const STORAGE_KEY_HISTORY = "land_registry_history_v1";

const seedLandsRaw: Omit<Land, "id">[] = [
  {
    location: "Sector 12, Gurugram, Haryana",
    areaSquareMeters: 250,
    surveyNumber: "SVY-2024-0451",
    documentIpfsHash: "QmX7g2Kp9Rz3m1Nq8Vt5wLs4aBc6dF0hJ2nY3pQ4rS5tU",
    marketValue: 4500000,
    currentOwner: "0xA11cE0000000000000000000000000000000A11ce",
    isForSale: true,
    registeredAt: Date.now() - 86400000 * 30,
    latitude: 28.4595,
    longitude: 77.0266,
  },
  {
    location: "MG Road, Bengaluru, Karnataka",
    areaSquareMeters: 120,
    surveyNumber: "SVY-2023-1129",
    documentIpfsHash: "QmY8h3Lq0Sz4n2Or9Wu6xMt5bCd7eG1iK3oZ4qR5sT6uV",
    marketValue: 7200000,
    currentOwner: "0xB0B0000000000000000000000000000000000B0b",
    isForSale: false,
    registeredAt: Date.now() - 86400000 * 60,
    latitude: 12.9716,
    longitude: 77.5946,
  },
  {
    location: "Banjara Hills, Hyderabad, Telangana",
    areaSquareMeters: 400,
    surveyNumber: "SVY-2024-0783",
    documentIpfsHash: "QmZ9i4Mr1Ta5o3Ps0Xv7yNu6cDe8fH2jL4pA5rS6tU7vW",
    marketValue: 9800000,
    currentOwner: "0xA11cE0000000000000000000000000000000A11ce",
    isForSale: false,
    registeredAt: Date.now() - 86400000 * 15,
    latitude: 17.4239,
    longitude: 78.4738,
  },
];

function getInitialLocalData(): { lands: Land[]; history: Record<number, TransferRecord[]> } {
  const lands: Land[] = seedLandsRaw.map((item, index) => ({
    ...item,
    id: index + 1,
  }));

  const history: Record<number, TransferRecord[]> = {};
  for (const land of lands) {
    history[land.id] = [
      {
        landId: land.id,
        from: ZERO_ADDRESS,
        to: land.currentOwner,
        timestamp: land.registeredAt,
        note: "Initial registration by Govt. Registrar",
      },
    ];
  }

  return { lands, history };
}

function loadLocalRegistry(): { lands: Land[]; history: Record<number, TransferRecord[]> } {
  if (typeof window === "undefined") {
    return getInitialLocalData();
  }

  try {
    const rawLands = localStorage.getItem(STORAGE_KEY_LANDS);
    const rawHistory = localStorage.getItem(STORAGE_KEY_HISTORY);

    if (rawLands && rawHistory) {
      const parsedLands: Land[] = JSON.parse(rawLands);
      const parsedHistory: Record<number, TransferRecord[]> = JSON.parse(rawHistory);
      if (Array.isArray(parsedLands) && parsedLands.length > 0) {
        return { lands: parsedLands, history: parsedHistory };
      }
    }
  } catch {
    // If parsing fails, reinitialize
  }

  const initial = getInitialLocalData();
  saveLocalRegistry(initial.lands, initial.history);
  return initial;
}

function saveLocalRegistry(lands: Land[], history: Record<number, TransferRecord[]>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_LANDS, JSON.stringify(lands));
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  } catch {
    // Storage quota or private browsing exceptions
  }
}

function toLand(row: LandRow): Land {
  return {
    id: row.id,
    location: row.location,
    areaSquareMeters: Number(row.area_square_meters),
    surveyNumber: row.survey_number,
    documentIpfsHash: row.document_ipfs_hash,
    marketValue: Number(row.market_value),
    currentOwner: row.current_owner,
    isForSale: row.is_for_sale,
    registeredAt: new Date(row.registered_at).getTime(),
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

function toTransfer(row: TransferRow): TransferRecord {
  return {
    landId: row.land_id,
    from: row.from_owner,
    to: row.to_owner,
    timestamp: new Date(row.transferred_at).getTime(),
    note: row.note,
  };
}

async function seedRemoteRegistry(): Promise<{ lands: Land[]; history: Record<number, TransferRecord[]> }> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: inserted, error: insertError } = await supabase
    .from("land_registry_lands")
    .insert(
      seedLandsRaw.map((land) => ({
        location: land.location,
        area_square_meters: land.areaSquareMeters,
        survey_number: land.surveyNumber,
        document_ipfs_hash: land.documentIpfsHash,
        market_value: land.marketValue,
        current_owner: land.currentOwner,
        is_for_sale: land.isForSale,
        registered_at: new Date(land.registeredAt).toISOString(),
        latitude: land.latitude,
        longitude: land.longitude,
      }))
    )
    .select("*");

  if (insertError || !inserted) {
    throw insertError ?? new Error("Unable to seed registry");
  }

  const lands = (inserted as LandRow[]).map(toLand);
  const { data: transferRows, error: transferError } = await supabase
    .from("land_registry_transfers")
    .insert(
      lands.map((land) => ({
        land_id: land.id,
        from_owner: ZERO_ADDRESS,
        to_owner: land.currentOwner,
        transferred_at: new Date(land.registeredAt).toISOString(),
        note: "Initial registration by Govt. Registrar",
      }))
    )
    .select("*");

  if (transferError || !transferRows) {
    throw transferError ?? new Error("Unable to seed ownership history");
  }

  return {
    lands,
    history: (transferRows as TransferRow[]).reduce<Record<number, TransferRecord[]>>((result, row) => {
      result[row.land_id] = [...(result[row.land_id] || []), toTransfer(row)];
      return result;
    }, {}),
  };
}

type RegistryData = { lands: Land[]; history: Record<number, TransferRecord[]>; isUsingFallback: boolean };

async function loadRegistryData(): Promise<RegistryData> {
  if (!isSupabaseConfigured || !supabase) {
    const local = loadLocalRegistry();
    return { ...local, isUsingFallback: true };
  }

  try {
    // 3.5s timeout so the app never hangs if the Supabase project is paused or slow
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase query timed out")), 3500)
    );

    const queryPromise = Promise.all([
      supabase.from("land_registry_lands").select("*").order("id", { ascending: true }),
      supabase.from("land_registry_transfers").select("*").order("transferred_at", { ascending: true }),
    ]);

    const [landsRes, transfersRes] = await Promise.race([queryPromise, timeoutPromise]);

    if (landsRes.error) throw landsRes.error;
    if (transfersRes.error) throw transfersRes.error;

    if (!landsRes.data || landsRes.data.length === 0) {
      const seeded = await seedRemoteRegistry();
      saveLocalRegistry(seeded.lands, seeded.history);
      return { ...seeded, isUsingFallback: false };
    }

    const lands = (landsRes.data as LandRow[]).map(toLand);
    const history = (transfersRes.data as TransferRow[]).reduce<Record<number, TransferRecord[]>>((result, row) => {
      result[row.land_id] = [...(result[row.land_id] || []), toTransfer(row)];
      return result;
    }, {});

    saveLocalRegistry(lands, history);
    return { lands, history, isUsingFallback: false };
  } catch (err) {
    console.warn("Could not reach Supabase database (it may be inactive or paused). Using local demo storage instead.", err);
    const local = loadLocalRegistry();
    return { ...local, isUsingFallback: true };
  }
}

export function useLandStore() {
  const [lands, setLands] = useState<Land[]>([]);
  const [history, setHistory] = useState<Record<number, TransferRecord[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const isFallbackRef = useRef(false);
  isFallbackRef.current = isUsingFallback;

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await loadRegistryData();
      setLands(data.lands);
      setHistory(data.history);
      setIsUsingFallback(data.isUsingFallback);
    } catch {
      // Fallback guarantees data even if an unexpected exception occurs
      const local = loadLocalRegistry();
      setLands(local.lands);
      setHistory(local.history);
      setIsUsingFallback(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();

    if (!isSupabaseConfigured || !supabase) return;

    const client = supabase;
    try {
      const channel = client
        .channel("land-registry-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "land_registry_lands" }, () => void refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "land_registry_transfers" }, () => void refresh())
        .subscribe();

      return () => {
        void client.removeChannel(channel);
      };
    } catch {
      // Ignore channel errors if remote is unreachable
    }
  }, [refresh]);

  const registerLand = useCallback(
    async (land: Omit<Land, "id" | "registeredAt" | "isForSale">): Promise<Land> => {
      const registeredAt = new Date().toISOString();
      const registeredAtMs = new Date(registeredAt).getTime();

      if (!isFallbackRef.current && isSupabaseConfigured && supabase) {
        try {
          const { data, error: insertError } = await supabase
            .from("land_registry_lands")
            .insert({
              location: land.location,
              area_square_meters: land.areaSquareMeters,
              survey_number: land.surveyNumber,
              document_ipfs_hash: land.documentIpfsHash,
              market_value: land.marketValue,
              current_owner: land.currentOwner,
              is_for_sale: false,
              registered_at: registeredAt,
              latitude: land.latitude,
              longitude: land.longitude,
            })
            .select("*")
            .maybeSingle();

          if (insertError || !data) throw insertError ?? new Error("Remote registration failed");

          const newLand = toLand(data as LandRow);
          await supabase.from("land_registry_transfers").insert({
            land_id: newLand.id,
            from_owner: ZERO_ADDRESS,
            to_owner: newLand.currentOwner,
            transferred_at: registeredAt,
            note: "Initial registration by Govt. Registrar",
          });

          setLands((current) => [...current, newLand].sort((a, b) => a.id - b.id));
          setHistory((current) => ({
            ...current,
            [newLand.id]: [
              {
                landId: newLand.id,
                from: ZERO_ADDRESS,
                to: newLand.currentOwner,
                timestamp: newLand.registeredAt,
                note: "Initial registration by Govt. Registrar",
              },
            ],
          }));
          return newLand;
        } catch (err) {
          console.warn("Supabase insert failed, persisting land locally instead:", err);
          setIsUsingFallback(true);
        }
      }

      // Local persistence fallback
      const currentLands = lands.length > 0 ? lands : loadLocalRegistry().lands;
      const nextId = currentLands.reduce((max, l) => Math.max(max, l.id), 0) + 1;
      const newLand: Land = {
        ...land,
        id: nextId,
        isForSale: false,
        registeredAt: registeredAtMs,
      };

      const updatedLands = [...currentLands, newLand].sort((a, b) => a.id - b.id);
      const newTransfer: TransferRecord = {
        landId: newLand.id,
        from: ZERO_ADDRESS,
        to: newLand.currentOwner,
        timestamp: registeredAtMs,
        note: "Initial registration by Govt. Registrar",
      };

      const updatedHistory = {
        ...history,
        [newLand.id]: [newTransfer],
      };

      setLands(updatedLands);
      setHistory(updatedHistory);
      saveLocalRegistry(updatedLands, updatedHistory);
      return newLand;
    },
    [lands, history]
  );

  const updateLandStatus = useCallback(
    async (id: number, isForSale: boolean) => {
      if (!isFallbackRef.current && isSupabaseConfigured && supabase) {
        try {
          const { data, error: updateError } = await supabase
            .from("land_registry_lands")
            .update({ is_for_sale: isForSale })
            .eq("id", id)
            .select("*")
            .maybeSingle();

          if (updateError || !data) throw updateError ?? new Error("Remote update failed");
          const updatedLand = toLand(data as LandRow);
          setLands((current) => current.map((land) => (land.id === id ? updatedLand : land)));
          return;
        } catch (err) {
          console.warn("Supabase update failed, updating land status locally:", err);
          setIsUsingFallback(true);
        }
      }

      // Local update fallback
      setLands((current) => {
        const next = current.map((land) => (land.id === id ? { ...land, isForSale } : land));
        saveLocalRegistry(next, history);
        return next;
      });
    },
    [history]
  );

  const transferOwnership = useCallback(
    async (id: number, newOwner: string, note: string) => {
      const currentLand = lands.find((land) => land.id === id);
      if (!currentLand) throw new Error("Land record not found");
      const transferredAt = new Date().toISOString();
      const transferredAtMs = new Date(transferredAt).getTime();

      if (!isFallbackRef.current && isSupabaseConfigured && supabase) {
        try {
          const { data, error: updateError } = await supabase
            .from("land_registry_lands")
            .update({ current_owner: newOwner, is_for_sale: false })
            .eq("id", id)
            .select("*")
            .maybeSingle();

          if (updateError || !data) throw updateError ?? new Error("Remote transfer failed");

          const { error: historyError } = await supabase.from("land_registry_transfers").insert({
            land_id: id,
            from_owner: currentLand.currentOwner,
            to_owner: newOwner,
            transferred_at: transferredAt,
            note,
          });

          if (historyError) throw historyError;

          const updatedLand = toLand(data as LandRow);
          const record: TransferRecord = {
            landId: id,
            from: currentLand.currentOwner,
            to: newOwner,
            timestamp: transferredAtMs,
            note,
          };

          setLands((current) => current.map((land) => (land.id === id ? updatedLand : land)));
          setHistory((current) => ({ ...current, [id]: [...(current[id] || []), record] }));
          return;
        } catch (err) {
          console.warn("Supabase transfer failed, applying transfer locally:", err);
          setIsUsingFallback(true);
        }
      }

      // Local transfer fallback
      const updatedLand: Land = {
        ...currentLand,
        currentOwner: newOwner,
        isForSale: false,
      };

      const record: TransferRecord = {
        landId: id,
        from: currentLand.currentOwner,
        to: newOwner,
        timestamp: transferredAtMs,
        note,
      };

      const updatedLands = lands.map((land) => (land.id === id ? updatedLand : land));
      const updatedHistory = {
        ...history,
        [id]: [...(history[id] || []), record],
      };

      setLands(updatedLands);
      setHistory(updatedHistory);
      saveLocalRegistry(updatedLands, updatedHistory);
    },
    [lands, history]
  );

  const getHistory = useCallback((id: number): TransferRecord[] => history[id] || [], [history]);

  return {
    lands,
    history,
    loaded,
    error,
    isUsingFallback,
    refresh,
    registerLand,
    updateLandStatus,
    transferOwnership,
    getHistory,
  };
}
