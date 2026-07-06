'use client';

import { useMemo, useRef } from 'react';
import type { JournalEntry } from '@/lib/accounting/computeEngine';
import { computeAllBalances } from '@/lib/accounting/computeEngine';
import { computeTrialBalance } from '@/lib/accounting/trialBalanceCompute';
import { computeTradingAccount } from '@/lib/accounting/tradingAccountCompute';
import { computeProfitLoss } from '@/lib/accounting/profitLossCompute';
import {
  computeBalanceSheet,
  computeScheduleIIIBalanceSheet,
} from '@/lib/accounting/balanceSheetCompute';
import { computeCashFlow } from '@/lib/accounting/cashFlowCompute';
import { computeFundsFlow } from '@/lib/accounting/fundsFlowCompute';
import { computeCashBook } from '@/lib/accounting/cashBookCompute';
import {
  computeGSTR1,
  computeGSTR3B,
  computeITCRegister,
} from '@/lib/accounting/gstCompute';
import { computeTDSRegister } from '@/lib/accounting/tdsCompute';
import { computeLedger, computeLedgerTFormat } from '@/lib/accounting/ledgerCompute';
import {
  computeDebtorAgeing,
  computeCreditorAgeing,
} from '@/lib/accounting/ageingCompute';
import { computeDepreciation } from '@/lib/accounting/depreciationCompute';
import { computeInventorySummary } from '@/lib/accounting/inventoryCompute';
import { computePartnersCapital } from '@/lib/accounting/partnersCapitalCompute';
import { computePLAppropriation } from '@/lib/accounting/plAppropriationCompute';

export function useComputedData(entries: JournalEntry[], previousEntries?: JournalEntry[]) {
  const balances = useMemo(() => computeAllBalances(entries), [entries]);

  // Cache for lazy getters — prevents recomputation on repeated access within same render cycle
  const cacheRef = useRef<Record<string, any>>({});
  const entriesRef = useRef(entries);
  const prevRef = useRef(previousEntries);

  // Invalidate cache when entries change
  if (entriesRef.current !== entries || prevRef.current !== previousEntries) {
    cacheRef.current = {};
    entriesRef.current = entries;
    prevRef.current = previousEntries;
  }

  const cache = cacheRef.current;

  return {
    balances,

    get trialBalance() {
      if (!cache.trialBalance) {
        cache.trialBalance = computeTrialBalance(entries);
      }
      return cache.trialBalance;
    },

    get tradingAccount() {
      if (!cache.tradingAccount) {
        cache.tradingAccount = computeTradingAccount(entries);
      }
      return cache.tradingAccount;
    },

    get profitLoss() {
      if (!cache.profitLoss) {
        // Reuse cached tradingAccount if available
        const ta = cache.tradingAccount || computeTradingAccount(entries);
        if (!cache.tradingAccount) cache.tradingAccount = ta;
        cache.profitLoss = computeProfitLoss(entries, ta.grossProfit);
      }
      return cache.profitLoss;
    },

    get balanceSheet() {
      if (!cache.balanceSheet) {
        const pl = this.profitLoss;
        cache.balanceSheet = computeBalanceSheet(entries, pl.netProfit, 'traditional');
      }
      return cache.balanceSheet;
    },

    get scheduleIIIBalanceSheet() {
      if (!cache.scheduleIIIBalanceSheet) {
        const pl = this.profitLoss;
        cache.scheduleIIIBalanceSheet = computeScheduleIIIBalanceSheet(
          entries,
          pl.netProfit,
          previousEntries,
        );
      }
      return cache.scheduleIIIBalanceSheet;
    },

    get cashFlow() {
      if (!cache.cashFlow) {
        const pl = this.profitLoss;
        cache.cashFlow = computeCashFlow(entries, pl.netProfit, previousEntries);
      }
      return cache.cashFlow;
    },

    get fundsFlow() {
      if (!previousEntries) return null;
      if (!cache.fundsFlow) {
        const pl = this.profitLoss;
        cache.fundsFlow = computeFundsFlow(entries, previousEntries, pl.netProfit);
      }
      return cache.fundsFlow;
    },

    get gstr1() {
      if (!cache.gstr1) {
        cache.gstr1 = computeGSTR1(entries);
      }
      return cache.gstr1;
    },

    get gstr3b() {
      if (!cache.gstr3b) {
        cache.gstr3b = computeGSTR3B(entries);
      }
      return cache.gstr3b;
    },

    get itcRegister() {
      if (!cache.itcRegister) {
        cache.itcRegister = computeITCRegister(entries);
      }
      return cache.itcRegister;
    },

    get tdsRegister() {
      if (!cache.tdsRegister) {
        cache.tdsRegister = computeTDSRegister(entries);
      }
      return cache.tdsRegister;
    },

    // Functions that need params — cached by key
    getLedger: (accountName: string) => {
      const key = `ledger_${accountName}`;
      if (!cache[key]) {
        cache[key] = computeLedger(entries, accountName);
      }
      return cache[key];
    },
    getLedgerTFormat: (accountName: string) => {
      const key = `ledgerT_${accountName}`;
      if (!cache[key]) {
        cache[key] = computeLedgerTFormat(entries, accountName);
      }
      return cache[key];
    },
    getCashBook: (type: 'single' | 'double' | 'triple') => {
      const key = `cashBook_${type}`;
      if (!cache[key]) {
        cache[key] = computeCashBook(entries, type);
      }
      return cache[key];
    },
    getDebtorAgeing: (asAtDate: string) => {
      const key = `debtorAgeing_${asAtDate}`;
      if (!cache[key]) {
        cache[key] = computeDebtorAgeing(entries, asAtDate);
      }
      return cache[key];
    },
    getCreditorAgeing: (asAtDate: string) => {
      const key = `creditorAgeing_${asAtDate}`;
      if (!cache[key]) {
        cache[key] = computeCreditorAgeing(entries, asAtDate);
      }
      return cache[key];
    },
    getDepreciation: (method: 'SLM' | 'WDV', rates?: Record<string, number>) => {
      const key = `depreciation_${method}`;
      if (!cache[key]) {
        cache[key] = computeDepreciation(entries, method, rates);
      }
      return cache[key];
    },
    getInventory: (method: 'fifo' | 'weighted_average') => {
      const key = `inventory_${method}`;
      if (!cache[key]) {
        cache[key] = computeInventorySummary(entries, method);
      }
      return cache[key];
    },
    getPartnersCapital: (partners: any, method: 'fixed' | 'fluctuating') => {
      const key = `partnersCapital_${method}`;
      if (!cache[key]) {
        const pl = cache.profitLoss || (() => {
          const ta = cache.tradingAccount || computeTradingAccount(entries);
          if (!cache.tradingAccount) cache.tradingAccount = ta;
          const p = computeProfitLoss(entries, ta.grossProfit);
          cache.profitLoss = p;
          return p;
        })();
        cache[key] = computePartnersCapital(entries, partners, method, pl.netProfit);
      }
      return cache[key];
    },
    getPLAppropriation: (partners: any, reservePercent?: number, drawingsMap?: Record<string, number>) => {
      const key = 'plAppropriation';
      if (!cache[key]) {
        const pl = cache.profitLoss || (() => {
          const ta = cache.tradingAccount || computeTradingAccount(entries);
          if (!cache.tradingAccount) cache.tradingAccount = ta;
          const p = computeProfitLoss(entries, ta.grossProfit);
          cache.profitLoss = p;
          return p;
        })();
        cache[key] = computePLAppropriation(pl.netProfit, partners, reservePercent, drawingsMap);
      }
      return cache[key];
    },
  };
}
