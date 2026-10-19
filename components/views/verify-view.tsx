"use client";

import { useState } from "react";
import { Search, FileText, CheckCircle2, XCircle, Fingerprint, MapPin, Calendar, User, Ruler, DollarSign, Shield, Copy } from "lucide-react";
import { useLandStore } from "@/lib/land-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  PageHeader, SectionHeader, StatusBadge, EmptyState, LoadingState,
  shortenAddress, formatCurrency, formatDate,
} from "@/components/shared";
import type { Land } from "@/lib/types";

function generateBlockchainHash(land: Land): string {
  const data = `${land.id}-${land.surveyNumber}-${land.currentOwner}-${land.registeredAt}`;
  let hash = "0x";
  const chars = "0123456789abcdef";
  for (let i = 0; i < 64; i++) {
    hash += chars[(data.charCodeAt(i % data.length) + i * 7) % 16];
  }
  return hash;
}

export function VerifyView() {
  const { lands, loaded } = useLandStore();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Land | null>(null);
  const [searched, setSearched] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null);

  const handleVerify = async () => {
    const q = query.trim();
    if (!q) return;
    setVerifying(true);
    setSearched(false);
    await new Promise((r) => setTimeout(r, 600));
    const id = parseInt(q, 10);
    const land = lands.find((l) => l.id === id || l.surveyNumber.toLowerCase() === q.toLowerCase());
    setResult(land || null);
    setSearched(true);
    setVerifying(false);
    setVerifiedAt(land ? Date.now() : null);
    if (land) toast.success("Land record verified");
    else toast.error("No matching land record found");
  };

  const blockchainHash = result ? generateBlockchainHash(result) : null;

  if (!loaded) return <LoadingState message="Loading land records…" />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Verify Land Record" subtitle="Verify the authenticity and ownership history of a registered land record." />

      {/* Search */}
      <div className="card-base p-5">
        <SectionHeader title="Record Lookup" description="Enter a Land ID or Survey Number to verify." />
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              placeholder="Land ID or Survey Number…"
              className="pl-10"
            />
          </div>
          <Button onClick={handleVerify} disabled={verifying}>
            {verifying ? (
              <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />Verifying…</>
            ) : (
              <><Fingerprint className="h-4 w-4 mr-2" />Verify Record</>
            )}
          </Button>
        </div>
      </div>

      {/* Not found */}
      {searched && !result && (
        <div className="mt-6">
          <EmptyState
            icon={XCircle}
            title="Record Not Found"
            description={`No land record found for "${query}". Check the Land ID or Survey Number and try again.`}
          />
        </div>
      )}

      {/* Verified result */}
      {result && blockchainHash && (
        <div className="mt-6 space-y-6 animate-slide-up">
          {/* Verification status */}
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-accent" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Record Verified</h3>
                <p className="text-sm text-muted-foreground">This land record was found in the registry database.</p>
              </div>
            </div>
          </div>

          {/* Land details */}
          <div>
            <SectionHeader title="Land Details" />
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
                {[
                  { icon: FileText, label: "Land ID", value: `#${result.id}` },
                  { icon: FileText, label: "Survey Number", value: result.surveyNumber, mono: true },
                  { icon: MapPin, label: "Location", value: result.location },
                  { icon: Ruler, label: "Area", value: `${result.areaSquareMeters} m²` },
                  { icon: DollarSign, label: "Market Value", value: formatCurrency(result.marketValue) },
                  { icon: User, label: "Current Owner", value: shortenAddress(result.currentOwner), mono: true },
                  { icon: Calendar, label: "Registered On", value: formatDate(result.registeredAt) },
                  ...(result.latitude !== null && result.longitude !== null
                    ? [{ icon: MapPin, label: "GPS Coordinates", value: `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`, mono: true }]
                    : []),
                  { icon: Shield, label: "Status", value: result.isForSale ? "Listed for Sale" : "Not Listed" },
                ].map((f) => (
                  <div key={f.label} className="bg-card p-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <f.icon className="h-3.5 w-3.5" />
                      <p className="text-xs">{f.label}</p>
                    </div>
                    <p className={`mt-1 text-sm font-medium text-foreground ${f.mono ? "font-mono" : ""}`}>{f.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Blockchain verification */}
          <div>
            <SectionHeader title="Blockchain Verification" description="Cryptographic reference data for this record." />
            <div className="card-base p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Transaction Hash (simulated)</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="flex-1 break-all font-mono text-xs text-foreground">{blockchainHash}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { navigator.clipboard.writeText(blockchainHash); toast.success("Hash copied"); }}
                    className="flex-shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">IPFS Document Hash</p>
                <p className="mt-1 break-all font-mono text-xs text-foreground">{result.documentIpfsHash}</p>
              </div>
              {verifiedAt && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Verification Timestamp</p>
                  <p className="mt-1 font-mono text-xs text-foreground">{new Date(verifiedAt).toLocaleString("en-US")}</p>
                </div>
              )}
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                Note: Transaction hash is simulated for demonstration. Connect a blockchain network for on-chain verification.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
