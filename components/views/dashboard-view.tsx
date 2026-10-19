"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Search, X, FileText, TrendingUp, CheckCircle2, Building2, ArrowRightLeft, Database } from "lucide-react";
import { toast } from "sonner";
import { useLandStore } from "@/lib/land-store";
import { useWallet } from "@/lib/wallet-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  PageHeader, SectionHeader, StatCard, StatusBadge, EmptyState, LoadingState, ErrorState,
  shortenAddress, formatCurrency, formatDate, formatDateTime,
} from "@/components/shared";
import type { Land, TransferRecord } from "@/lib/types";

const LandMap = dynamic(() => import("@/components/land-map").then((m) => m.LandMap), { ssr: false });

export function DashboardView() {
  const { lands, history, loaded, error, isUsingFallback, refresh, getHistory } = useLandStore();
  const { address } = useWallet();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Land | null>(null);
  const [searchHistory, setSearchHistory] = useState<TransferRecord[]>([]);
  const [searched, setSearched] = useState(false);

  const activeTransfers = useMemo(() => lands.filter((l) => l.isForSale).length, [lands]);
  const totalValue = useMemo(() => lands.reduce((sum, l) => sum + l.marketValue, 0), [lands]);
  const recentTransfers = useMemo(() => {
    return Object.values(history)
      .flat()
      .filter((r) => r.from !== "0x0000000000000000000000000000000000000000")
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [history]);

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;
    const id = parseInt(query, 10);
    const land = lands.find((l) => l.id === id || l.surveyNumber.toLowerCase() === query.toLowerCase());
    if (land) {
      setSearchResult(land);
      setSearchHistory(getHistory(land.id));
    } else {
      setSearchResult(null);
      setSearchHistory([]);
    }
    setSearched(true);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResult(null);
    setSearchHistory([]);
    setSearched(false);
  };

  if (!loaded) return <LoadingState message="Loading land records…" />;
  if (error) {
    return (
      <ErrorState
        message={error}
        action={
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Land Registry Dashboard"
        subtitle="Overview of registered land records and ownership activity."
      />

      {isUsingFallback && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <Database className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-emerald-300">
              Offline / Demo Storage Active
            </p>
            <p className="text-xs text-emerald-300/80 leading-relaxed">
              Remote Supabase database is unreachable or unconfigured. Running in local browser storage mode — all features (parcels, lookup, registration, transfers, interactive map) are completely functional and will persist in your browser!
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Land Parcels" value={lands.length.toString()} icon={FileText} />
        <StatCard label="Registered Value" value={formatCurrency(totalValue)} icon={TrendingUp} />
        <StatCard label="Properties For Sale" value={activeTransfers.toString()} icon={CheckCircle2} />
        <StatCard
          label="Your Properties"
          value={address ? lands.filter((l) => l.currentOwner === address).length.toString() : "—"}
          icon={Building2}
        />
      </div>

      {/* Search */}
      <div className="card-base p-5">
        <SectionHeader title="Land Lookup" description="Search by Land ID or Survey Number to view ownership history." />
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter Land ID or Survey Number…"
              className="pl-10"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-1.5" /> Search
          </Button>
        </div>

        {/* Search Result */}
        {searched && !searchResult && (
          <div className="mt-4">
            <EmptyState icon={X} title="No Land Found" description={`No record matches "${searchQuery}". Try a different Land ID or Survey Number.`} />
          </div>
        )}

        {searchResult && (
          <div className="mt-5 space-y-4 animate-slide-up">
            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Land #{searchResult.id}</h3>
                  <p className="text-xs text-muted-foreground">{searchResult.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={searchResult.isForSale ? "for-sale" : "not-listed"} />
                  <StatusBadge status="verified" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
                {[
                  { label: "Survey Number", value: searchResult.surveyNumber },
                  { label: "Area", value: `${searchResult.areaSquareMeters} m²` },
                  { label: "Market Value", value: formatCurrency(searchResult.marketValue) },
                  { label: "Current Owner", value: shortenAddress(searchResult.currentOwner), mono: true },
                  { label: "Registered On", value: formatDate(searchResult.registeredAt) },
                  ...(searchResult.latitude !== null && searchResult.longitude !== null
                    ? [{ label: "GPS", value: `${searchResult.latitude.toFixed(4)}, ${searchResult.longitude.toFixed(4)}`, mono: true }]
                    : []),
                ].map((f) => (
                  <div key={f.label} className="bg-card p-4">
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className={`mt-0.5 text-sm font-medium text-foreground ${f.mono ? "font-mono" : ""}`}>{f.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ownership history */}
            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Ownership History</h3>
                <span className="text-xs text-muted-foreground">{searchHistory.length} records</span>
              </div>
              <div className="space-y-3">
                {searchHistory.map((record, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 ${idx === 0 ? "border-primary bg-primary/10" : "border-border bg-muted"}`}>
                      {idx === 0 ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{idx === 0 ? "Initial Registration" : "Ownership Transferred"}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(record.timestamp)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span className="font-mono text-muted-foreground">{shortenAddress(record.from)}</span>
                        <span className="text-primary">→</span>
                        <span className="font-mono text-foreground">{shortenAddress(record.to)}</span>
                      </div>
                      {record.note && <p className="mt-1 text-xs text-muted-foreground">{record.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Land Records Table */}
      <div>
        <SectionHeader title="Recent Land Records" description="Latest parcels registered on the ledger." />
        {lands.length === 0 ? (
          <EmptyState title="No land records yet" description="Registered parcels will appear here." />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-lg border border-border md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Land ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Survey Number</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lands.slice().reverse().slice(0, 10).map((land) => (
                    <TableRow key={land.id} className="cursor-pointer" onClick={() => { setSearchQuery(land.surveyNumber); setSearchResult(land); setSearchHistory(getHistory(land.id)); setSearched(true); }}>
                      <TableCell className="font-medium">#{land.id}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{land.location}</TableCell>
                      <TableCell className="font-mono text-xs">{land.surveyNumber}</TableCell>
                      <TableCell className="font-mono text-xs">{shortenAddress(land.currentOwner)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(land.marketValue)}</TableCell>
                      <TableCell><StatusBadge status={land.isForSale ? "for-sale" : "not-listed"} /></TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(land.registeredAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {lands.slice().reverse().slice(0, 10).map((land) => (
                <div key={land.id} className="card-base p-4" onClick={() => { setSearchQuery(land.surveyNumber); setSearchResult(land); setSearchHistory(getHistory(land.id)); setSearched(true); }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Land #{land.id}</span>
                    <StatusBadge status={land.isForSale ? "for-sale" : "not-listed"} />
                  </div>
                  <p className="mt-1 text-sm text-foreground">{land.location}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{land.surveyNumber}</span>
                    <span className="tabular-nums">{formatCurrency(land.marketValue)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{shortenAddress(land.currentOwner)}</span>
                    <span>{formatDate(land.registeredAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Recent Ownership Activity */}
      {recentTransfers.length > 0 && (
        <div>
          <SectionHeader title="Recent Ownership Activity" description="Latest transfers recorded on the ledger." />
          <div className="space-y-2">
            {recentTransfers.map((record, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-muted-foreground">{shortenAddress(record.from)}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono text-foreground">{shortenAddress(record.to)}</span>
                  </div>
                  {record.note && <p className="text-xs text-muted-foreground">{record.note}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(record.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Land Locations Map */}
      <div>
        <SectionHeader title="Land Locations" description="Geographic distribution of registered parcels." />
        <div className="card-base overflow-hidden">
          <LandMap
            lands={lands}
            selectedId={searchResult?.id}
            onSelect={(land: Land) => {
              setSearchQuery(land.surveyNumber);
              setSearchResult(land);
              setSearchHistory(getHistory(land.id));
              setSearched(true);
            }}
            className="h-[360px]"
          />
        </div>
      </div>
    </div>
  );
}
