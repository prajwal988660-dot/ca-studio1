import { formatIndianCurrency } from '@/lib/utils/currencyFormat';

export interface ExportColumn {
  header: string;
  key: string;
  align?: 'left' | 'right' | 'center';
}

export async function exportToPDF(
  title: string,
  companyName: string,
  entityType: string,
  dateRange: string,
  columns: ExportColumn[],
  data: Record<string, any>[],
  options?: {
    orientation?: 'portrait' | 'landscape';
    includeSignatureBlock?: boolean;
    footerText?: string;
  }
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF(options?.orientation || 'portrait');

  // HEADER
  doc.setFontSize(14);
  doc.text(companyName, 14, 15);
  doc.setFontSize(10);
  doc.text(`Entity: ${entityType}`, 14, 22);
  doc.setFontSize(12);
  doc.text(title, 14, 32);
  doc.setFontSize(9);
  doc.text(dateRange, 14, 38);

  // TABLE - CRITICAL: JE-XXXX codes are NEVER included
  autoTable(doc, {
    startY: 42,
    head: [columns.map(c => c.header)],
    body: data.map(row => columns.map(c => {
      const val = row[c.key];
      if (typeof val === 'number') return formatIndianCurrency(val);
      return val || '';
    })),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: {
      fillColor: [249, 250, 251],
      textColor: [17, 24, 39],
      fontStyle: 'bold',
    },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [i, { halign: (c.align || 'left') as 'left' | 'right' | 'center' }])
    ),
  });

  // FOOTER
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-IN')}`,
      doc.internal.pageSize.width - 60,
      doc.internal.pageSize.height - 10
    );
  }

  // SIGNATURE BLOCK
  if (options?.includeSignatureBlock) {
    const lastPage = doc.getNumberOfPages();
    doc.setPage(lastPage);
    const y = doc.internal.pageSize.height - 30;
    doc.setFontSize(9);
    doc.text('Director', 20, y);
    doc.text('Director', doc.internal.pageSize.width / 2 - 15, y);
    doc.text('Chartered Accountant', doc.internal.pageSize.width - 60, y);
  }

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
}

export async function exportToExcel(
  title: string,
  columns: ExportColumn[],
  data: Record<string, any>[],
  sheetName?: string
) {
  const XLSX = await import('xlsx');

  const ws = XLSX.utils.json_to_sheet(
    data.map(row => {
      const obj: Record<string, any> = {};
      columns.forEach(c => { obj[c.header] = row[c.key]; });
      return obj;
    })
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
  XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}.xlsx`);
}

export function exportToCSV(
  columns: ExportColumn[],
  data: Record<string, any>[],
  filename: string
) {
  const headers = columns.map(c => c.header).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val ?? '';
    }).join(',')
  ).join('\n');
  const csv = '\uFEFF' + headers + '\n' + rows; // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Image-based PDF export for complex layouts (e.g. Cash Book T-format)
export async function exportElementAsImagePDF(options: {
  element: HTMLElement | null;
  title: string;
  orientation?: 'portrait' | 'landscape';
}) {
  const { element, title, orientation } = options;
  if (!element) return;

  // Ensure the element is in the viewport so html2canvas captures the rendered content.
  element.scrollIntoView({ block: 'start', inline: 'nearest' });
  await new Promise(resolve => setTimeout(resolve, 150));

  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 3,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF(orientation || 'landscape');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 10;
  const imgWidth = pageWidth - margin * 2;

  // Convert canvas pixels to PDF units using a constant scale factor.
  // This lets us slice the canvas into exact "page chunks" and avoids row cutting artifacts.
  const scale = imgWidth / canvas.width; // PDFUnits per canvas pixel
  const usableHeight = pageHeight - margin * 2; // PDFUnits
  const pageHeightPx = Math.max(1, Math.floor(usableHeight / scale)); // canvas px per PDF page

  let yPx = 0;
  let page = 0;
  while (yPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - yPx);

    // Create a sliced canvas and render just that portion.
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) break;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      yPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx,
    );

    const sliceData = sliceCanvas.toDataURL('image/png');

    if (page > 0) pdf.addPage();
    const sliceHeightPdf = sliceHeightPx * scale;
    pdf.addImage(sliceData, 'PNG', margin, margin, imgWidth, sliceHeightPdf);

    yPx += sliceHeightPx;
    page += 1;
  }

  pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
}
