"use client";

import { useState, useRef, useEffect } from "react";
import { Wallet, ChevronDown, Copy, Check, LogOut, Zap, Shield, Menu, X } from "lucide-react";
import { useWallet, DEMO_ADDRESSES } from "@/lib/wallet-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ViewKey } from "@/lib/types";

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const NAV_ITEMS: { key: ViewKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "portfolio", label: "My Properties" },
  { key: "verify", label: "Verify Record" },
  { key: "admin", label: "Admin" },
];

export function Navbar({
  activeTab,
  onTabChange,
}: {
  activeTab: ViewKey;
  onTabChange: (tab: ViewKey) => void;
}) {
  const { mode, address, isRegistrar, connect, disconnect } = useWallet();
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowWalletMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleConnect = async (selectedMode: "demo" | "metamask", demoAddress?: string) => {
    try {
      await connect(selectedMode, demoAddress);
      setShowConnectDialog(false);
      toast.success("Wallet connected");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to connect wallet");
    }
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNavClick = (tab: ViewKey) => {
    onTabChange(tab);
    setShowMobileMenu(false);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur transition-shadow ${
          scrolled ? "shadow-sm" : ""
        }`}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo + Desktop Nav */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleNavClick("dashboard")}
              className="flex items-center gap-2.5"
              aria-label="LandChain home"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" />
                </svg>
              </div>
              <div className="hidden flex-col leading-none sm:flex">
                <span className="text-sm font-semibold text-foreground">Land Registry</span>
                <span className="text-[10px] text-muted-foreground">Blockchain Records</span>
              </div>
            </button>

            {/* Desktop Nav */}
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavClick(item.key)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right side: Network + Wallet */}
          <div className="flex items-center gap-3">
            {/* Network status */}
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span>{mode === "disconnected" ? "Read-only" : "Connected"}</span>
            </div>

            {/* Wallet */}
            {mode === "disconnected" ? (
              <Button
                onClick={() => setShowConnectDialog(true)}
                size="sm"
                variant="outline"
                className="border-border"
              >
                <Wallet className="h-4 w-4 mr-1.5" />
                Connect Wallet
              </Button>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
                  aria-label="Wallet menu"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    {isRegistrar ? (
                      <Shield className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Wallet className="h-3.5 w-3.5 text-primary" />
                    )}
                  </span>
                  <span className="hidden font-mono text-xs text-foreground sm:inline">
                    {address && shortenAddress(address)}
                  </span>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", showWalletMenu && "rotate-180")} />
                </button>

                {showWalletMenu && (
                  <div className="absolute right-0 mt-1.5 w-56 rounded-md border border-border bg-popover shadow-lg animate-slide-up">
                    <div className="border-b border-border p-3">
                      <p className="text-xs text-muted-foreground">Connected wallet</p>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="font-mono text-xs text-foreground">{address && shortenAddress(address)}</p>
                        <button onClick={handleCopy} className="p-1 rounded hover:bg-muted" aria-label="Copy address">
                          {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                      </div>
                      {isRegistrar && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-primary">
                          <Shield className="h-3 w-3" /> Registrar
                        </div>
                      )}
                      {mode === "demo" && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-warning">
                          <Zap className="h-3 w-3" /> Demo mode
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { disconnect(); setShowWalletMenu(false); toast.info("Wallet disconnected"); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5"
                    >
                      <LogOut className="h-4 w-4" /> Disconnect
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden"
              aria-label="Toggle menu"
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {showMobileMenu && (
          <nav className="border-t border-border bg-background md:hidden" aria-label="Mobile navigation">
            <div className="space-y-1 px-4 py-2">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavClick(item.key)}
                    className={cn(
                      "block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="border-border">
          <DialogHeader>
            <DialogTitle>Connect Your Wallet</DialogTitle>
            <DialogDescription>Choose a connection method to interact with the land registry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <button
              onClick={() => handleConnect("metamask")}
              className="group flex w-full items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Wallet className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">MetaMask</p>
                <p className="text-xs text-muted-foreground">Connect via browser extension</p>
              </div>
            </button>

            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Zap className="h-3.5 w-3.5 text-warning" />
                <span className="text-xs font-medium text-muted-foreground">Demo Mode — No wallet needed</span>
              </div>
              {DEMO_ADDRESSES.map((demo) => (
                <button
                  key={demo.address}
                  onClick={() => handleConnect("demo", demo.address)}
                  className="group flex w-full items-center gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                >
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", demo.isRegistrar ? "bg-primary/10 border-primary/20" : "bg-accent/10 border-accent/20")}>
                    {demo.isRegistrar ? <Shield className="h-4 w-4 text-primary" /> : <Wallet className="h-4 w-4 text-accent" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{demo.label}</p>
                    <p className="text-xs font-mono text-muted-foreground">{shortenAddress(demo.address)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
