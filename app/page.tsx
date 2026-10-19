"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { DashboardView } from "@/components/views/dashboard-view";
import { AdminView } from "@/components/views/admin-view";
import { PortfolioView } from "@/components/views/portfolio-view";
import { VerifyView } from "@/components/views/verify-view";
import type { ViewKey } from "@/lib/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ViewKey>("dashboard");

  return (
    <div className="min-h-screen bg-background">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === "dashboard" && <DashboardView />}
        {activeTab === "admin" && <AdminView />}
        {activeTab === "portfolio" && <PortfolioView />}
        {activeTab === "verify" && <VerifyView />}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <span>LandChain — Land Registry</span>
          <span>Blockchain-backed land records &middot; Demo environment</span>
        </div>
      </footer>
    </div>
  );
}
