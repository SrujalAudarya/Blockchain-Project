"use client";

import { useState, useMemo } from "react";
import { Wallet, DollarSign, Send, Store, ArrowRightLeft, Loader2, Building2 } from "lucide-react";
import { useLandStore } from "@/lib/land-store";
import { useWallet } from "@/lib/wallet-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  PageHeader, SectionHeader, StatCard, StatusBadge, EmptyState, LoadingState,
  shortenAddress, formatCurrency, formatDate,
} from "@/components/shared";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import type { Land } from "@/lib/types";

export function PortfolioView() {
  const { lands, updateLandStatus, transferOwnership, getHistory, loaded } = useLandStore();
  const { address, mode } = useWallet();

  const [transferLand, setTransferLand] = useState<Land | null>(null);
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [toggleSaleLand, setToggleSaleLand] = useState<Land | null>(null);

  const myLands = useMemo(() => (address ? lands.filter((l) => l.currentOwner === address) : []), [lands, address]);
  const totalValue = useMemo(() => myLands.reduce((sum, l) => sum + l.marketValue, 0), [myLands]);
  const forSaleCount = useMemo(() => myLands.filter((l) => l.isForSale).length, [myLands]);

  const handleTransfer = async () => {
    if (!transferLand) return;
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      await transferOwnership(transferLand.id, newOwnerAddress, transferNote || "Ownership transfer");
      toast.success(`Land #${transferLand.id} ownership transferred`);
      setTransferLand(null);
      setConfirmTransfer(false);
      setNewOwnerAddress("");
      setTransferNote("");
    } catch (err: any) {
      toast.error(err?.message ?? "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSale = async () => {
    if (!toggleSaleLand) return;
    try {
      await updateLandStatus(toggleSaleLand.id, !toggleSaleLand.isForSale);
      toast.success(toggleSaleLand.isForSale ? `Land #${toggleSaleLand.id} removed from marketplace` : `Land #${toggleSaleLand.id} listed on marketplace`);
    } catch {
      toast.error("Failed to update land status");
    } finally {
      setToggleSaleLand(null);
    }
  };

  if (mode === "disconnected") {
    return (
      <div className="animate-fade-in">
        <PageHeader title="My Properties" subtitle="Manage land parcels owned by your wallet." />
        <EmptyState icon={Wallet} title="Connect Your Wallet" description="Connect your wallet to view and manage your land properties on the ledger." />
      </div>
    );
  }

  if (!loaded) return <LoadingState message="Loading your properties…" />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="My Properties" subtitle="Manage land parcels owned by your wallet." />

      {myLands.length === 0 ? (
        <EmptyState icon={Building2} title="No Properties Yet" description="You don't own any land parcels on the ledger yet. Lands registered to your wallet will appear here." />
      ) : (
        <>
          {/* Stats */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <StatCard label="Total Properties" value={myLands.length.toString()} icon={Building2} />
            <StatCard label="Total Value" value={formatCurrency(totalValue)} icon={DollarSign} />
            <StatCard label="Listed for Sale" value={forSaleCount.toString()} icon={Store} />
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Land ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Survey #</TableHead>
                  <TableHead className="text-right">Area</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myLands.map((land) => (
                  <TableRow key={land.id}>
                    <TableCell className="font-medium">#{land.id}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{land.location}</TableCell>
                    <TableCell className="font-mono text-xs">{land.surveyNumber}</TableCell>
                    <TableCell className="text-right tabular-nums">{land.areaSquareMeters} m²</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(land.marketValue)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(land.registeredAt)}</TableCell>
                    <TableCell><StatusBadge status={land.isForSale ? "for-sale" : "not-listed"} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setTransferLand(land)}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Transfer
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setToggleSaleLand(land)}
                          className={land.isForSale ? "text-warning" : "text-accent"}
                        >
                          {land.isForSale ? "Unlist" : "List for Sale"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {myLands.map((land) => (
              <div key={land.id} className="card-base p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Land #{land.id}</span>
                  <StatusBadge status={land.isForSale ? "for-sale" : "not-listed"} />
                </div>
                <p className="mt-1 text-sm text-foreground">{land.location}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Survey</p>
                    <p className="font-mono">{land.surveyNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Area</p>
                    <p className="tabular-nums">{land.areaSquareMeters} m²</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Value</p>
                    <p className="tabular-nums">{formatCurrency(land.marketValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Registered</p>
                    <p>{formatDate(land.registeredAt)}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setTransferLand(land)}>
                    <Send className="h-3.5 w-3.5 mr-1" /> Transfer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setToggleSaleLand(land)}
                  >
                    {land.isForSale ? "Unlist" : "List for Sale"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Transfer Dialog */}
      <Dialog open={!!transferLand} onOpenChange={(open) => { if (!open) { setTransferLand(null); setConfirmTransfer(false); } }}>
        <DialogContent className="border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              Transfer Land #{transferLand?.id}
            </DialogTitle>
            <DialogDescription>
              Transfer ownership of this land parcel to a new wallet address. This action is irreversible.
            </DialogDescription>
          </DialogHeader>

          {transferLand && !confirmTransfer ? (
            <div className="space-y-4 py-2">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Property</p>
                <p className="mt-0.5 text-sm">{transferLand.location}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">Current owner: {shortenAddress(transferLand.currentOwner)}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">New Owner Wallet Address</Label>
                <Input
                  value={newOwnerAddress}
                  onChange={(e) => setNewOwnerAddress(e.target.value)}
                  placeholder="0x…"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Transfer Note (optional)</Label>
                <Input
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="e.g. Sale deed #12345"
                />
              </div>
            </div>
          ) : transferLand && confirmTransfer ? (
            <div className="space-y-4 py-2">
              <div className="rounded-md border border-warning/30 bg-warning/5 p-4">
                <p className="text-sm font-medium text-foreground">Confirm Transfer</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You are about to transfer ownership of Land #{transferLand.id} to <span className="font-mono text-foreground">{shortenAddress(newOwnerAddress)}</span>.
                  This action cannot be undone.
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {confirmTransfer ? (
              <>
                <Button variant="outline" onClick={() => setConfirmTransfer(false)}>Back</Button>
                <Button onClick={handleTransfer} disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Transferring…</> : <><Send className="h-4 w-4 mr-2" />Confirm Transfer</>}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setTransferLand(null)}>Cancel</Button>
                <Button onClick={() => setConfirmTransfer(true)} disabled={!newOwnerAddress || newOwnerAddress === address}>
                  Continue
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Sale Confirmation */}
      <AlertDialog open={!!toggleSaleLand} onOpenChange={(open) => { if (!open) setToggleSaleLand(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleSaleLand?.isForSale ? "Remove from Marketplace" : "List for Sale"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleSaleLand?.isForSale
                ? `Land #${toggleSaleLand?.id} will no longer be listed for sale on the marketplace.`
                : `Land #${toggleSaleLand?.id} will be listed for sale on the marketplace.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleSale}>
              {toggleSaleLand?.isForSale ? "Unlist" : "List for Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
