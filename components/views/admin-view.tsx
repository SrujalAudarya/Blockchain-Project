"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Shield, Plus, Loader2, CheckCircle2, Lock } from "lucide-react";
import { useLandStore } from "@/lib/land-store";
import { useWallet } from "@/lib/wallet-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  PageHeader, SectionHeader, FieldLabel, FieldHint, EmptyState,
  shortenAddress, formatDate,
} from "@/components/shared";

const LandMapPicker = dynamic(() => import("@/components/land-map").then((m) => m.LandMapPicker), { ssr: false });

export function AdminView() {
  const { registerLand, lands } = useLandStore();
  const { isRegistrar, mode, address } = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: number; owner: string; date: number } | null>(null);

  const [form, setForm] = useState({
    location: "",
    areaSquareMeters: "",
    surveyNumber: "",
    documentIpfsHash: "",
    marketValue: "",
    ownerAddress: "",
    latitude: "",
    longitude: "",
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMapPick = (lat: number, lng: number) => {
    setForm((prev) => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields: Array<[string, string]> = [
      ["Location", form.location],
      ["Area", form.areaSquareMeters],
      ["Survey Number", form.surveyNumber],
      ["Market Value", form.marketValue],
      ["Owner Wallet Address", form.ownerAddress],
      ["Map location", form.latitude && form.longitude ? "selected" : ""],
    ];
    const missingField = requiredFields.find(([, value]) => !value.trim());

    if (missingField) {
      toast.error(`Please complete the required field: ${missingField[0]}`);
      return;
    }

    if (!form.ownerAddress.startsWith("0x") || form.ownerAddress.length < 6) {
      toast.error("Please enter a valid wallet address");
      return;
    }

    const area = Number(form.areaSquareMeters);
    const marketValue = Number(form.marketValue);
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (!Number.isFinite(area) || area <= 0) {
      toast.error("Area must be greater than zero");
      return;
    }
    if (!Number.isFinite(marketValue) || marketValue < 0) {
      toast.error("Market value must be zero or greater");
      return;
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      toast.error("Please select a valid location on the map");
      return;
    }

    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));

      const newLand = await registerLand({
        location: form.location,
        areaSquareMeters: area,
        surveyNumber: form.surveyNumber,
        documentIpfsHash: form.documentIpfsHash || "Qm" + Math.random().toString(36).slice(2, 48),
        marketValue,
        currentOwner: form.ownerAddress,
        latitude,
        longitude,
      });

      setSuccess({ id: newLand.id, owner: form.ownerAddress, date: newLand.registeredAt });
      toast.success(`Land #${newLand.id} registered on the ledger`);

      setForm({ location: "", areaSquareMeters: "", surveyNumber: "", documentIpfsHash: "", marketValue: "", ownerAddress: "", latitude: "", longitude: "" });
      setTimeout(() => setSuccess(null), 8000);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to register land");
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "disconnected") {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Register Land Parcel" subtitle="Create a verified land record and register it on the ledger." />
        <EmptyState icon={Lock} title="Wallet Not Connected" description="Connect your wallet to access the Admin Portal." />
      </div>
    );
  }

  if (!isRegistrar) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Register Land Parcel" subtitle="Create a verified land record and register it on the ledger." />
        <EmptyState icon={Lock} title="Access Restricted" description="Only the authorized Government Registrar wallet can register new lands." />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Register Land Parcel" subtitle="Create a verified land record and register it on the ledger." />

      {/* Success confirmation */}
      {success && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent/5 p-4 animate-slide-up">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-accent" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Land Record Registered</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Land ID</p>
                  <p className="font-medium">#{success.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Owner</p>
                  <p className="font-mono text-xs">{shortenAddress(success.owner)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Registration Date</p>
                  <p className="text-sm">{formatDate(success.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm text-accent">Confirmed</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">This record is now stored in the registry database. Connect a blockchain network to write on-chain.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section: Land Information */}
            <div className="card-base p-5">
              <SectionHeader title="Land Information" />
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <FieldLabel required>Location</FieldLabel>
                  <Input
                    value={form.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="e.g. Sector 12, Gurugram, Haryana"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <FieldLabel required>Survey Number</FieldLabel>
                    <Input
                      value={form.surveyNumber}
                      onChange={(e) => handleChange("surveyNumber", e.target.value)}
                      placeholder="e.g. SVY-2024-0451"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel required>Area (m²)</FieldLabel>
                    <Input
                      type="number"
                      min="0.01"
                      value={form.areaSquareMeters}
                      onChange={(e) => handleChange("areaSquareMeters", e.target.value)}
                      placeholder="e.g. 250"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel required>GPS Coordinates</FieldLabel>
                  <LandMapPicker
                    latitude={form.latitude ? Number(form.latitude) : null}
                    longitude={form.longitude ? Number(form.longitude) : null}
                    onPick={handleMapPick}
                    className="h-[280px] rounded-lg border border-border"
                  />
                  <FieldHint>Click on the map to set the parcel location.</FieldHint>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <FieldLabel required>Latitude</FieldLabel>
                      <Input type="number" step="any" min="-90" max="90" required value={form.latitude} onChange={(e) => handleChange("latitude", e.target.value)} placeholder="e.g. 28.4595" />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel required>Longitude</FieldLabel>
                      <Input type="number" step="any" min="-180" max="180" required value={form.longitude} onChange={(e) => handleChange("longitude", e.target.value)} placeholder="e.g. 77.0266" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Ownership & Valuation */}
            <div className="card-base p-5">
              <SectionHeader title="Ownership & Valuation" />
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <FieldLabel required>Owner Wallet Address</FieldLabel>
                  <Input
                    value={form.ownerAddress}
                    onChange={(e) => handleChange("ownerAddress", e.target.value)}
                    placeholder="0x…"
                    className="font-mono text-sm"
                    required
                  />
                  <FieldHint>The wallet address that will own this land parcel on the ledger.</FieldHint>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel required>Market Value (INR)</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    value={form.marketValue}
                    onChange={(e) => handleChange("marketValue", e.target.value)}
                    placeholder="e.g. 4500000"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section: Supporting Document */}
            <div className="card-base p-5">
              <SectionHeader title="Supporting Document" />
              <div className="space-y-1.5">
                <FieldLabel>IPFS Document Hash</FieldLabel>
                <Input
                  value={form.documentIpfsHash}
                  onChange={(e) => handleChange("documentIpfsHash", e.target.value)}
                  placeholder="Auto-generated if left blank"
                  className="font-mono text-sm"
                />
                <FieldHint>IPFS hash of the supporting legal document for this parcel.</FieldHint>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting} className="min-w-[180px]">
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registering…</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" />Register Land Record</>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar: Recent registrations */}
        <div className="space-y-4">
          <div className="card-base p-4">
            <SectionHeader title="Recent Registrations" />
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {lands.slice().reverse().slice(0, 8).map((land) => (
                <div key={land.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Land #{land.id}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(land.registeredAt)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">{land.location}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{shortenAddress(land.currentOwner)}</p>
                </div>
              ))}
              {lands.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No lands registered yet</p>}
            </div>
          </div>

          <div className="card-base p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Contract Info</h3>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Contract</span><span className="font-mono">LandRegistry</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Network</span><span>Testnet / Demo</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Registrar</span><span className="font-mono">{address && shortenAddress(address)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
