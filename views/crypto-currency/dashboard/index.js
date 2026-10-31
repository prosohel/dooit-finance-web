"use client";

import { useState } from "react";
import { CryptoList } from "./CryptoList";
import { PortfolioCard } from "./PortfolioCard";
import { PriceChart } from "./PriceChart";
import { TransactionsTable } from "./TransactionTable";

export default function CryptoCurrencyDashboard(){
    const [activeTab, setActiveTab] = useState("dashboard")
    const [selectedCrypto, setSelectedCrypto] = useState()
  
    const handleSend = (symbol) => {
      if (symbol) {
        const symbolMap = {
          BTC: "btc",
          ETH: "eth",
          SOL: "sol",
          ADA: "ada",
          XRP: "xrp",
        }
        setSelectedCrypto(symbolMap[symbol] || "btc")
      }
      setActiveTab("send")
    }
  
    const handleTrade = (symbol) => {
      handleSend(symbol)
    }
    return (
        <>
         <div className="space-y-6">
            {/* Portfolio Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <PortfolioCard
                title="Total Balance"
                value="$203,509.65"
                change={2.34}
                changeValue="$4,656.24"
              />
              <PortfolioCard
                title="24h Change"
                value="$4,656.24"
                change={2.34}
                changeValue="2.34%"
              />
              <PortfolioCard
                title="Total Profit/Loss"
                value="+$45,230.18"
                change={28.65}
                changeValue="28.65%"
              />
              <PortfolioCard
                title="Active Trades"
                value="12"
                change={-8.33}
                changeValue="1"
              />
            </div>

            {/* Charts and Assets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PriceChart />
              </div>
              <div>
                <CryptoList onSend={handleSend} />
              </div>
            </div>

            {/* Recent Transactions */}
            <TransactionsTable limit={5} showFilters={false} />
          </div></>
    )
}