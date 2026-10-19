"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BrowserProvider } from "ethers";
import { REGISTRAR_ADDRESS } from "./contract";
import type { WalletState, WalletMode } from "./types";

interface WalletContextValue extends WalletState {
  connect: (mode: WalletMode, demoAddress?: string) => Promise<void>;
  disconnect: () => void;
  provider: BrowserProvider | null;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function safelyGetMethod<T extends (...args: any[]) => unknown>(target: unknown, methodName: string): T | undefined {
  if (!target || (typeof target !== "object" && typeof target !== "function")) {
    return undefined;
  }
  try {
    const value = Reflect.get(target, methodName);
    return typeof value === "function" ? (value as T) : undefined;
  } catch {
    return undefined;
  }
}

// Demo addresses users can pick from when MetaMask isn't available.
const DEMO_ADDRESSES: { label: string; address: string; isRegistrar: boolean }[] = [
  { label: "Govt. Registrar", address: REGISTRAR_ADDRESS, isRegistrar: true },
  { label: "Alice (Citizen)", address: "0xA11cE0000000000000000000000000000000A11ce", isRegistrar: false },
  { label: "Bob (Citizen)", address: "0xB0B0000000000000000000000000000000000B0b", isRegistrar: false },
];

export { DEMO_ADDRESSES };

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<WalletMode>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [isRegistrar, setIsRegistrar] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  const connect = useCallback(async (selectedMode: WalletMode, demoAddress?: string) => {
    if (selectedMode === "demo") {
      const target = demoAddress
        ? DEMO_ADDRESSES.find((d) => d.address === demoAddress)
        : DEMO_ADDRESSES[0];
      if (!target) throw new Error("Invalid demo address");
      setMode("demo");
      setAddress(target.address);
      setIsRegistrar(target.isRegistrar);
      setProvider(null);
      return;
    }

    if (selectedMode === "metamask") {
      const eth = (window as any).ethereum;
      if (!eth) {
        throw new Error("MetaMask is not installed in this browser.");
      }
      try {
        const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
        const browserProvider = new BrowserProvider(eth);
        const signer = await browserProvider.getSigner();
        const signerAddress = await signer.getAddress();
        const finalAddress = accounts[0] || signerAddress;
        setMode("metamask");
        setAddress(finalAddress);
        setIsRegistrar(finalAddress.toLowerCase() === REGISTRAR_ADDRESS.toLowerCase());
        setProvider(browserProvider);
      } catch (err: any) {
        throw new Error(err?.message ?? "Failed to connect MetaMask.");
      }
      return;
    }

    setMode("disconnected");
    setAddress(null);
    setIsRegistrar(false);
    setProvider(null);
  }, []);

  const disconnect = useCallback(() => {
    setMode("disconnected");
    setAddress(null);
    setIsRegistrar(false);
    setProvider(null);
  }, []);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;

    const handler = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (mode === "metamask") {
        setAddress(accounts[0]);
        setIsRegistrar(accounts[0].toLowerCase() === REGISTRAR_ADDRESS.toLowerCase());
      }
    };

    type EventMethod = (eventName: string, listener: (...args: any[]) => void) => void;
    const on = safelyGetMethod<EventMethod>(eth, "on");
    const removeListener = safelyGetMethod<EventMethod>(eth, "removeListener");

    if (!on || !removeListener) return;

    try {
      on.call(eth, "accountsChanged", handler);
    } catch {
      return;
    }

    return () => {
      try {
        removeListener.call(eth, "accountsChanged", handler);
      } catch {
        // Ignore provider listener cleanup failures caused by malformed wallet proxies.
      }
    };
  }, [mode, disconnect]);

  return (
    <WalletContext.Provider value={{ mode, address, isRegistrar, connect, disconnect, provider }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
