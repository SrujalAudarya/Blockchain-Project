export interface Land {
  id: number;
  location: string;
  areaSquareMeters: number;
  surveyNumber: string;
  documentIpfsHash: string;
  marketValue: number;
  currentOwner: string;
  isForSale: boolean;
  registeredAt: number;
  latitude: number | null;
  longitude: number | null;
}

export interface TransferRecord {
  landId: number;
  from: string;
  to: string;
  timestamp: number;
  note: string;
}

export type ViewKey = "dashboard" | "admin" | "portfolio" | "verify";

export type WalletMode = "disconnected" | "demo" | "metamask";

export interface WalletState {
  mode: WalletMode;
  address: string | null;
  isRegistrar: boolean;
}
