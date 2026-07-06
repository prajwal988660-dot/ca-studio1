'use client';

import { formatIndianCurrency } from '@/lib/utils/currencyFormat';
import type { CashBookRow } from '@/lib/accounting/cashBookCompute';

interface CashBookFormatProps {
  type: 'single' | 'double' | 'triple';
  companyName: string;
  period: string;
  fromDate: string;
  toDate: string;
  receipts: CashBookRow[];
  payments: CashBookRow[];
  openingCash: number;
  openingBank: number;
  closingCash: number;
  closingBank: number;
  totalDiscountAllowed?: number;
  totalDiscountReceived?: number;
}

export function CashBookFormat({
  type,
  companyName,
  period,
  fromDate,
  toDate,
  receipts,
  payments,
  openingCash,
  openingBank,
  closingCash,
  closingBank,
  totalDiscountAllowed,
  totalDiscountReceived,
}: CashBookFormatProps) {
  // colType retains the full union type so the column-width ternaries can compare
  // against 'single' even inside JSX blocks that only render for 'double' | 'triple'
  // (where TypeScript would otherwise narrow `type` and reject the comparison).
  const colType: 'single' | 'double' | 'triple' = type;
  const typeLabel = colType === 'single' ? 'Single Column' : type === 'double' ? 'Double Column' : 'Triple Column';

  const toMonthKey = (isoDate: string) => isoDate.slice(0, 7); // YYYY-MM

  const listMonthsInRange = (startIso: string, endIso: string): string[] => {
    const start = new Date(`${startIso}T00:00:00`);
    const end = new Date(`${endIso}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      // fallback to observed months in data
      const set = new Set<string>();
      receipts.forEach((r) => set.add(toMonthKey(r.date)));
      payments.forEach((p) => set.add(toMonthKey(p.date)));
      return [...set].sort();
    }
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    const out: string[] = [];
    while (cur <= endMonth) {
      const ym = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      out.push(ym);
      cur.setMonth(cur.getMonth() + 1);
    }
    return out;
  };

  const months = listMonthsInRange(fromDate, toDate);

  const renderSide = (
    label: string,
    rows: CashBookRow[],
    openingBalance: { cash: number; bank: number },
    closingBalance?: { cash: number; bank: number },
    discountTotal?: number,
    options?: {
      openingDate?: string;
      closingDate?: string;
      padRows?: number;
      forceClosingRow?: boolean;
      showTitle?: boolean;
    }
  ) => {
    const rowsCashTotal = rows.reduce((sum, r) => sum + (r.cashAmount || 0), 0);
    const rowsBankTotal = rows.reduce((sum, r) => sum + (r.bankAmount || 0), 0);
    // Receipts side total includes opening; Payments side total includes closing
    const cashTotal =
      (openingBalance.cash || 0) +
      rowsCashTotal +
      (closingBalance?.cash || 0);
    const bankTotal =
      (openingBalance.bank || 0) +
      rowsBankTotal +
      (closingBalance?.bank || 0);

    // Amount columns must support at least 9 digits + 2 paise cleanly.
    // Keep widths mode-specific so double column gets larger amount slots.
    const dateWidth = type === 'triple' ? 'w-[72px]' : 'w-[78px]';
    const lfWidth = type === 'triple' ? 'w-[34px]' : 'w-[36px]';
    // Triple column: discount is relatively smaller; free space goes to Cash/Bank.
    const discountWidth = type === 'triple' ? 'w-[64px]' : '';
    // Give Particulars more breathing room by slimming/redistributing amount columns.
    const particularsWidth =
      type === 'triple'
        ? 'min-w-[220px]'
        : type === 'double'
        ? 'min-w-[220px]'
        : 'min-w-[220px]';
    const amountWidth =
      type === 'double'
        ? 'w-[106px]'
        : type === 'triple'
        ? 'w-[96px]'
        : 'w-[132px]';

    return (
    <div className="flex-1">
      {options?.showTitle && (
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
          {label}
        </div>
      )}
      <table
        className={`w-full table-fixed ${
          colType === 'single' ? 'text-[13px]' : 'text-[11px]'
        } [&_th]:border-r [&_th]:border-gray-200 [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-gray-200 [&_td:last-child]:border-r-0`}
      >
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className={`text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider ${dateWidth} ${colType === 'single' ? 'px-2 py-1.5 text-xs' : 'px-1 py-1 text-[10px]'}`}>Date</th>
            <th className={`text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider ${particularsWidth} ${colType === 'single' ? 'px-2 py-1.5 text-xs' : 'px-1 py-1 text-[10px]'}`}>Particulars</th>
            <th className={`text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider ${lfWidth} ${colType === 'single' ? 'px-2 py-1.5 text-xs' : 'px-1 py-1 text-[10px]'}`}>LF</th>
            {type === 'triple' && (
              <th className={`text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider ${discountWidth} px-1 py-1 text-[10px]`}>Disc.</th>
            )}
            <th
              className={`text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider ${amountWidth} ${
                colType === 'single'
                  ? 'px-2 py-1.5 text-xs'
                  : type === 'triple'
                  ? 'px-1 py-1 text-[10px]'
                  : 'px-1 py-1 text-[11px]'
              }`}
            >
              Cash
            </th>
            {(type === 'double' || type === 'triple') && (
              <th
                className={`text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider ${amountWidth} ${
                  colType === 'single'
                    ? 'px-2 py-1.5 text-xs'
                    : type === 'triple'
                    ? 'px-1 py-1 text-[10px]'
                    : 'px-1 py-1 text-[11px]'
                }`}
              >
                Bank
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {/* Opening Balance (only on receipts side) */}
          {label === 'Receipts (Dr)' && (
            <tr className="border-b border-gray-100 bg-blue-50/30">
              <td className={`${dateWidth} ${type === 'triple' ? 'px-1 py-1 text-[10px]' : 'px-2 py-1.5 text-xs'} text-gray-500 whitespace-nowrap`}>
                {options?.openingDate ?? ''}
              </td>
              <td className={`${particularsWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'} font-medium align-top break-words`}>To Balance b/d</td>
              <td className={`${lfWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}></td>
              {type === 'triple' && <td className={`${discountWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}></td>}
              <td
                className={`${amountWidth} ${
                  type === 'triple' ? 'px-1 py-1 text-[10px]' : colType === 'single' ? 'px-2 py-1.5' : 'px-2 py-1.5 text-[11px]'
                } text-right font-mono tabular-nums whitespace-nowrap`}
              >
                {openingBalance.cash !== 0 ? formatIndianCurrency(Math.abs(openingBalance.cash)) : ''}
              </td>
              {(type === 'double' || type === 'triple') && (
                <td
                  className={`${amountWidth} ${
                    type === 'triple' ? 'px-1 py-1 text-[10px]' : colType === 'single' ? 'px-2 py-1.5' : 'px-2 py-1.5 text-[11px]'
                  } text-right font-mono tabular-nums whitespace-nowrap`}
                >
                  {openingBalance.bank !== 0 ? formatIndianCurrency(Math.abs(openingBalance.bank)) : ''}
                </td>
              )}
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td
                className={`${dateWidth} ${type === 'triple' ? 'px-1 py-1 text-[10px]' : 'px-2 py-1.5 text-xs'} text-gray-500 whitespace-nowrap align-top`}
              >
                <div>{row.date}</div>
                <div className="mt-1 text-[10px] font-mono font-semibold text-blue-600">{row.entry_code}</div>
              </td>
              <td
                className={`${particularsWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'} align-top break-words`}
                title={row.particulars}
              >
                {row.particulars}
              </td>
              <td className={`${lfWidth} ${type === 'triple' ? 'px-1 py-1 text-[10px]' : 'px-2 py-1.5 text-xs'} text-center text-gray-400`}>{row.lf || ''}</td>
              {type === 'triple' && (
                <td className={`${discountWidth} ${type === 'triple' ? 'px-1 py-1 text-[10px]' : 'px-2 py-1.5 text-xs'} text-right font-mono tabular-nums whitespace-nowrap`}>
                  {row.discountAmount ? formatIndianCurrency(row.discountAmount) : ''}
                </td>
              )}
              <td
                className={`${amountWidth} ${
                  type === 'triple' ? 'px-1 py-1 text-[10px]' : colType === 'single' ? 'px-2 py-1.5' : 'px-2 py-1.5 text-[11px]'
                } text-right font-mono tabular-nums whitespace-nowrap`}
              >
                {row.cashAmount > 0 ? formatIndianCurrency(row.cashAmount) : ''}
              </td>
              {(type === 'double' || type === 'triple') && (
                <td
                  className={`${amountWidth} ${
                    type === 'triple' ? 'px-1 py-1 text-[10px]' : colType === 'single' ? 'px-2 py-1.5' : 'px-2 py-1.5 text-[11px]'
                  } text-right font-mono tabular-nums whitespace-nowrap`}
                >
                  {row.bankAmount > 0 ? formatIndianCurrency(row.bankAmount) : ''}
                </td>
              )}
            </tr>
          ))}
          {/* Padding rows so that both sides align and totals sit on same horizontal line */}
          {Array.from({ length: options?.padRows ?? 0 }).map((_, i) => (
            <tr key={`pad-${i}`} className="border-b border-gray-100">
              <td className={`${dateWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}>&nbsp;</td>
              <td className={`${particularsWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}>&nbsp;</td>
              <td className={`${lfWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}>&nbsp;</td>
              {type === 'triple' && <td className={`${discountWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}>&nbsp;</td>}
              <td className={`${amountWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}>&nbsp;</td>
              {(type === 'double' || type === 'triple') && <td className={`${amountWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}>&nbsp;</td>}
            </tr>
          ))}
          {/* Closing Balance (only on payments side) */}
          {closingBalance && (
            <tr className="border-b border-gray-100 bg-blue-50/30">
              <td className={`${dateWidth} ${type === 'triple' ? 'px-1 py-1 text-[10px]' : 'px-2 py-1.5 text-xs'} text-gray-500 whitespace-nowrap`}>
                {options?.closingDate ?? ''}
              </td>
              <td className={`${particularsWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'} font-medium align-top break-words`}>By Balance c/d</td>
              <td className={`${lfWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}></td>
              {type === 'triple' && <td className={`${discountWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}></td>}
              <td
                className={`${amountWidth} ${
                  type === 'triple' ? 'px-1 py-1 text-[10px]' : colType === 'single' ? 'px-2 py-1.5' : 'px-2 py-1.5 text-[11px]'
                } text-right font-mono tabular-nums whitespace-nowrap`}
              >
                {closingBalance.cash !== 0 ? formatIndianCurrency(Math.abs(closingBalance.cash)) : ''}
              </td>
              {(type === 'double' || type === 'triple') && (
                <td
                  className={`${amountWidth} ${
                    type === 'triple' ? 'px-1 py-1 text-[10px]' : colType === 'single' ? 'px-2 py-1.5' : 'px-2 py-1.5 text-[11px]'
                  } text-right font-mono tabular-nums whitespace-nowrap`}
                >
                  {closingBalance.bank !== 0 ? formatIndianCurrency(Math.abs(closingBalance.bank)) : ''}
                </td>
              )}
            </tr>
          )}
          {!closingBalance && options?.forceClosingRow && (
            <tr className="border-b border-gray-100 bg-blue-50/30">
              <td className={`${dateWidth} ${type === 'triple' ? 'px-1 py-1 text-[10px]' : 'px-2 py-1.5 text-xs'}`}></td>
              <td className={`${particularsWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}>&nbsp;</td>
              <td className={`${lfWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}></td>
              {type === 'triple' && <td className={`${discountWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}></td>}
              <td className={`${amountWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}></td>
              {(type === 'double' || type === 'triple') && <td className={`${amountWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}></td>}
            </tr>
          )}
          {/* Totals row */}
          <tr className="bg-gray-100 font-semibold border-t border-gray-300">
            <td className={`${dateWidth} ${type === 'triple' ? 'px-1 py-1 text-[10px]' : 'px-2 py-1.5 text-xs'}`}></td>
            <td className={`${particularsWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'} align-top`}>Total</td>
            <td className={`${lfWidth} ${type === 'triple' ? 'px-1 py-1' : 'px-2 py-1.5'}`}></td>
            {type === 'triple' && (
              <td className={`${discountWidth} ${type === 'triple' ? 'px-1 py-1 text-[10px]' : 'px-2 py-1.5 text-xs'} text-right font-mono tabular-nums whitespace-nowrap`}>
                {discountTotal != null ? formatIndianCurrency(discountTotal) : ''}
              </td>
            )}
            <td
              className={`${amountWidth} ${
                type === 'triple' ? 'px-1 py-1 text-[10px]' : colType === 'single' ? 'px-2 py-1.5' : 'px-2 py-1.5 text-[11px]'
              } text-right font-mono tabular-nums whitespace-nowrap`}
            >
              {cashTotal !== 0 ? formatIndianCurrency(Math.abs(cashTotal)) : ''}
            </td>
            {(type === 'double' || type === 'triple') && (
              <td
                className={`${amountWidth} ${
                  type === 'triple' ? 'px-1 py-1 text-[10px]' : colType === 'single' ? 'px-2 py-1.5' : 'px-2 py-1.5 text-[11px]'
                } text-right font-mono tabular-nums whitespace-nowrap`}
              >
                {bankTotal !== 0 ? formatIndianCurrency(Math.abs(bankTotal)) : ''}
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="text-center py-3 border-b border-gray-200">
        <p className="text-xs text-gray-500">{companyName}</p>
        <h3 className="text-lg font-bold text-gray-900">Cash Book ({typeLabel})</h3>
        <p className="text-sm text-gray-500">{period}</p>
      </div>

      {/* Monthly divisions are mandatory (Month/Quarter/Year all show monthly splits) */}
      <div className="overflow-x-auto">
        <div className="divide-y divide-[#E5E7EB] min-w-[1000px]">
          {(() => {
          let monthOpeningCash = openingCash;
          let monthOpeningBank = openingBank;

          const isSingleMonthRange = months.length === 1;

          return months.map((ym, monthIndex) => {
            const [yy, mm] = ym.split('-').map((x) => parseInt(x, 10));
            const openingDate = `${ym}-01`;
            const lastDay =
              yy && mm ? new Date(yy, mm, 0).getDate() : 28;
            const closingDate = `${ym}-${String(lastDay).padStart(2, '0')}`;

            const monthReceipts = receipts.filter((r) => toMonthKey(r.date) === ym);
            const monthPayments = payments.filter((p) => toMonthKey(p.date) === ym);

            const receiptsCash = monthReceipts.reduce((s, r) => s + (r.cashAmount || 0), 0);
            const receiptsBank = monthReceipts.reduce((s, r) => s + (r.bankAmount || 0), 0);
            const paymentsCash = monthPayments.reduce((s, r) => s + (r.cashAmount || 0), 0);
            const paymentsBank = monthPayments.reduce((s, r) => s + (r.bankAmount || 0), 0);

            const monthClosingCash = monthOpeningCash + receiptsCash - paymentsCash;
            const monthClosingBank = monthOpeningBank + receiptsBank - paymentsBank;

            // Skip visually empty months (no receipts/payments and unchanged opening/closing)
            // when viewing a multi-month range. For a single-month filter, still show the
            // month with b/d and c/d.
            const hasActivity =
              receiptsCash !== 0 ||
              receiptsBank !== 0 ||
              paymentsCash !== 0 ||
              paymentsBank !== 0;
            if (
              !isSingleMonthRange &&
              !hasActivity &&
              monthOpeningCash === monthClosingCash &&
              monthOpeningBank === monthClosingBank
            ) {
              // Carry forward balances but do not render this month.
              monthOpeningCash = monthClosingCash;
              monthOpeningBank = monthClosingBank;
              return null;
            }

            const monthDiscountReceived =
              type === 'triple'
                ? monthReceipts.reduce((s, r) => s + (r.discountAmount || 0), 0)
                : undefined;
            const monthDiscountAllowed =
              type === 'triple'
                ? monthPayments.reduce((s, r) => s + (r.discountAmount || 0), 0)
                : undefined;

            // Keep both sides aligned so month-end total is always in the same row.
            const receiptsCount = 1 + monthReceipts.length; // opening b/d + entries
            const paymentsCount = monthPayments.length; // entries (closing handled separately on both sides)
            const maxBodyRows = Math.max(receiptsCount, paymentsCount);
            const receiptsPad = maxBodyRows - receiptsCount;
            const paymentsPad = maxBodyRows - paymentsCount;

            const block = (
              <div key={ym}>
                <div className="grid grid-cols-2 divide-x divide-[#E5E7EB]">
                  {renderSide(
                    'Receipts (Dr)',
                    monthReceipts,
                    { cash: monthOpeningCash, bank: monthOpeningBank },
                    undefined,
                    monthDiscountReceived,
                    { openingDate, padRows: receiptsPad, forceClosingRow: true, showTitle: monthIndex === 0 }
                  )}
                  {renderSide(
                    'Payments (Cr)',
                    monthPayments,
                    { cash: 0, bank: 0 },
                    { cash: monthClosingCash, bank: monthClosingBank },
                    monthDiscountAllowed,
                    { closingDate, padRows: paymentsPad, forceClosingRow: true, showTitle: monthIndex === 0 }
                  )}
                </div>
              </div>
            );

            // carry forward
            monthOpeningCash = monthClosingCash;
            monthOpeningBank = monthClosingBank;

            return block;
          });
        })()}
        </div>
      </div>
    </div>
  );
}
