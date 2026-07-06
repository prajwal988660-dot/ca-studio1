/**
 * Official CBIC GSTR-3B Excel offline utility (macro-enabled).
 * Place the file at `public/gst/${GSTR3B_EXCEL_UTILITY_FILENAME}` so the in-app download link works.
 */
export const GSTR3B_EXCEL_UTILITY_FILENAME = 'GSTR3B_Excel_Utility_V5.7.xlsm' as const;

export function gstr3bUtilityPublicHref(): string {
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  return `${base}gst/${GSTR3B_EXCEL_UTILITY_FILENAME}`;
}

/** GST portal — returns / filing (user completes upload there after generating JSON in Excel). */
export const GST_PORTAL_RETURNS_URL = 'https://www.gst.gov.in/' as const;

/** CBIC help section for offline utilities / returns workflow. */
export const GST_HELP_DOWNLOADS_URL = 'https://tutorial.gst.gov.in/' as const;
