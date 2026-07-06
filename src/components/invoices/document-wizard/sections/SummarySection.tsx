import type { SalesTotals, PurchaseTotals, DocumentMode } from '../types';

interface SalesSummaryProps {
  kind: 'sales';
  totals: SalesTotals;
  mode: DocumentMode;
}

interface PurchaseSummaryProps {
  kind: 'purchase';
  totals: PurchaseTotals;
  mode: DocumentMode;
}

type SummarySectionProps = SalesSummaryProps | PurchaseSummaryProps;

function inr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SummarySection(props: SummarySectionProps) {
  if (props.kind === 'sales') {
    const { totals } = props;
    return (
      <fieldset className="rounded-lg border border-gray-200 p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Summary</legend>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <span className="text-[10px] text-gray-500">Taxable</span>
            <p className="font-mono text-xs font-semibold">{inr(totals.taxable)}</p>
          </div>
          {totals.isIntra ? (
            <>
              <div>
                <span className="text-[10px] text-gray-500">CGST</span>
                <p className="font-mono text-xs font-semibold">{inr(totals.cgst)}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-500">SGST</span>
                <p className="font-mono text-xs font-semibold">{inr(totals.sgst)}</p>
              </div>
            </>
          ) : (
            <div>
              <span className="text-[10px] text-gray-500">IGST</span>
              <p className="font-mono text-xs font-semibold">{inr(totals.igst)}</p>
            </div>
          )}
          {totals.cess > 0 && (
            <div>
              <span className="text-[10px] text-gray-500">Cess</span>
              <p className="font-mono text-xs font-semibold">{inr(totals.cess)}</p>
            </div>
          )}
          <div>
            <span className="text-[10px] text-gray-500">Round-off</span>
            <p className="font-mono text-[10px]">{inr(totals.roundOff)}</p>
          </div>
          <div className="col-span-2 rounded-lg bg-blue-50 p-2 md:col-span-1">
            <span className="text-[10px] font-semibold text-blue-700">Total</span>
            <p className="font-mono text-sm font-bold text-blue-900">{inr(totals.total)}</p>
          </div>
        </div>
        {totals.amountInWords && (
          <p className="mt-2 text-[10px] italic text-gray-500">{totals.amountInWords}</p>
        )}
      </fieldset>
    );
  }

  // Purchase summary
  const { totals } = props;
  const gstTotal = totals.cgst + totals.sgst + totals.igst;
  return (
    <fieldset className="rounded-lg border border-gray-200 p-4">
      <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Summary</legend>
      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div>
          <span className="text-[10px] text-gray-500">Taxable</span>
          <p className="font-mono text-xs font-semibold">{inr(totals.taxable)}</p>
        </div>
        {totals.isIntra ? (
          <>
            <div>
              <span className="text-[10px] text-gray-500">CGST</span>
              <p className="font-mono text-xs font-semibold">{inr(totals.cgst)}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500">SGST</span>
              <p className="font-mono text-xs font-semibold">{inr(totals.sgst)}</p>
            </div>
          </>
        ) : (
          <div>
            <span className="text-[10px] text-gray-500">IGST</span>
            <p className="font-mono text-xs font-semibold">{inr(totals.igst)}</p>
          </div>
        )}
        <div className="col-span-2 rounded-lg bg-blue-50 p-2 md:col-span-1">
          <span className="text-[10px] font-semibold text-blue-700">Total</span>
          <p className="font-mono text-sm font-bold text-blue-900">{inr(totals.total)}</p>
        </div>
      </div>
    </fieldset>
  );
}
