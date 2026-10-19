"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
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

const seedLands: Omit<Land, "id">[] = [
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

async function seedRegistry(): Promise<{ lands: Land[]; history: Record<number, TransferRecord[]> }> {
  const { data: inserted, error: insertError } = await supabase
    .from("land_registry_lands")
    .insert(
      seedLands.map((land) => ({
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

type RegistryData = { lands: Land[]; history: Record<number, TransferRecord[]> };

let registryLoadInFlight: Promise<RegistryData> | null = null;

async function loadRegistryData(): Promise<RegistryData> {
  const [{ data: landRows, error: landError }, { data: transferRows, error: transferError }] = await Promise.all([
    supabase.from("land_registry_lands").select("*").order("id", { ascending: true }),
    supabase.from("land_registry_transfers").select("*").order("transferred_at", { ascending: true }),
  ]);

  if (landError) throw landError;
  if (transferError) throw transferError;

  if (!landRows || landRows.length === 0) {
    return seedRegistry();
  }

  return {
    lands: (landRows as LandRow[]).map(toLand),
    history: (transferRows as TransferRow[]).reduce<Record<number, TransferRecord[]>>((result, row) => {
      result[row.land_id] = [...(result[row.land_id] || []), toTransfer(row)];
      return result;
    }, {}),
  };
}

function loadRegistry(): Promise<RegistryData> {
  if (!registryLoadInFlight) {
    registryLoadInFlight = loadRegistryData().finally(() => {
      registryLoadInFlight = null;
    });
  }
  return registryLoadInFlight;
}

function getLoadErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.length > 0
  ) {
    return error.message;
  }
  return "Unable to load land records";
}

export function useLandStore() {
  const [lands, setLands] = useState<Land[]>([]);
  const [history, setHistory] = useState<Record<number, TransferRecord[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await loadRegistry();
      setLands(data.lands);
      setHistory(data.history);
    } catch (loadError) {
      setError(getLoadErrorMessage(loadError));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel("land-registry-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "land_registry_lands" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "land_registry_transfers" }, () => void refresh())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const registerLand = useCallback(async (land: Omit<Land, "id" | "registeredAt" | "isForSale">) => {
    const registeredAt = new Date().toISOString();
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

    if (insertError || !data) throw insertError ?? new Error("Land registration failed");

    const newLand = toLand(data as LandRow);
    const { error: historyError } = await supabase.from("land_registry_transfers").insert({
      land_id: newLand.id,
      from_owner: ZERO_ADDRESS,
      to_owner: newLand.currentOwner,
      transferred_at: registeredAt,
      note: "Initial registration by Govt. Registrar",
    });

    if (historyError) throw historyError;
    setLands((current) => [...current, newLand].sort((a, b) => a.id - b.id));
    setHistory((current) => ({
      ...current,
      [newLand.id]: [{ landId: newLand.id, from: ZERO_ADDRESS, to: newLand.currentOwner, timestamp: newLand.registeredAt, note: "Initial registration by Govt. Registrar" }],
    }));
    return newLand;
  }, []);

  const updateLandStatus = useCallback(async (id: number, isForSale: boolean) => {
    const { data, error: updateError } = await supabase
      .from("land_registry_lands")
      .update({ is_for_sale: isForSale })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (updateError || !data) throw updateError ?? new Error("Land status update failed");
    const updatedLand = toLand(data as LandRow);
    setLands((current) => current.map((land) => (land.id === id ? updatedLand : land)));
  }, []);

  const transferOwnership = useCallback(async (id: number, newOwner: string, note: string) => {
    const currentLand = lands.find((land) => land.id === id);
    if (!currentLand) throw new Error("Land record not found");
    const transferredAt = new Date().toISOString();
    const { data, error: updateError } = await supabase
      .from("land_registry_lands")
      .update({ current_owner: newOwner, is_for_sale: false })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (updateError || !data) throw updateError ?? new Error("Ownership transfer failed");

    const { error: historyError } = await supabase.from("land_registry_transfers").insert({
      land_id: id,
      from_owner: currentLand.currentOwner,
      to_owner: newOwner,
      transferred_at: transferredAt,
      note,
    });
    if (historyError) throw historyError;

    const updatedLand = toLand(data as LandRow);
    const record: TransferRecord = { landId: id, from: currentLand.currentOwner, to: newOwner, timestamp: Date.now(), note };
    setLands((current) => current.map((land) => (land.id === id ? updatedLand : land)));
    setHistory((current) => ({ ...current, [id]: [...(current[id] || []), record] }));
  }, [lands]);

  const getHistory = useCallback((id: number): TransferRecord[] => history[id] || [], [history]);

  return { lands, history, loaded, error, refresh, registerLand, updateLandStatus, transferOwnership, getHistory };
}
