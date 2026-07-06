import { z } from 'zod';
import {
  panSchema,
  tanSchema,
  cinSchema,
  pincodeSchema,
  gstinSchema,
  isGstin,
} from './india';

/**
 * Validation schema for creating a company (matches `NewCompanyInput` /
 * the relevant slice of `Company` in src/types/company.ts).
 */

/* -------------------------------------------------------------------------- */
/*  Enums                                                                     */
/* -------------------------------------------------------------------------- */

export const entityTypeEnum = z.enum([
  'sole_proprietorship',
  'individual',
  'partnership',
  'llp',
  'opc',
  'pvt_ltd',
  'public_ltd',
  'huf',
  'trust',
  'society',
  'section8',
  'aop_boi',
  'cooperative',
]);

export const gstStatusEnum = z.enum(['unregistered', 'regular', 'composition']);
export const accountingMethodEnum = z.enum(['mercantile', 'cash']);
export const valuationMethodEnum = z.enum([
  'fifo',
  'weighted_average',
  'specific_identification',
]);

/* -------------------------------------------------------------------------- */
/*  ISO date (YYYY-MM-DD) helper                                              */
/* -------------------------------------------------------------------------- */

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

const isoDateSchema = z
  .string()
  .trim()
  .refine(isValidIsoDate, 'Invalid date — expected format YYYY-MM-DD');

/* -------------------------------------------------------------------------- */
/*  Nested schemas                                                            */
/* -------------------------------------------------------------------------- */

/** Only the format-checked fields are constrained; everything else passes through. */
const entityDetailsSchema = z
  .object({
    pan: panSchema.optional(),
    tan: tanSchema.optional(),
    cin: cinSchema.optional(),
    email: z.string().trim().email('Invalid email address').optional(),
    phone: z.string().optional(),
    pincode: pincodeSchema.optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
  })
  .passthrough();

const gstDetailsSchema = z
  .object({
    gstin: gstinSchema.optional(),
  })
  .passthrough();

const inventoryConfigSchema = z.object({
  valuationMethod: valuationMethodEnum,
  pettyCashThreshold: z.number(),
});

/* -------------------------------------------------------------------------- */
/*  Company create schema                                                     */
/* -------------------------------------------------------------------------- */

export const companyCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Company name must be at least 2 characters'),
    entity_type: entityTypeEnum,
    entity_details: entityDetailsSchema,
    business_nature: z.array(z.string()),
    inventory_enabled: z.boolean(),
    inventory_config: inventoryConfigSchema,
    gst_status: gstStatusEnum,
    gst_details: gstDetailsSchema,
    tds_applicable: z.boolean(),
    tcs_applicable: z.boolean(),
    accounting_method: accountingMethodEnum,
    financial_year_start: isoDateSchema,
  })
  .superRefine((data, ctx) => {
    // When GST-registered, a valid GSTIN is mandatory.
    if (data.gst_status !== 'unregistered') {
      const gstin = data.gst_details?.gstin;
      if (!gstin) {
        ctx.addIssue({
          code: 'custom',
          path: ['gst_details', 'gstin'],
          message: 'GSTIN is required when the company is GST-registered',
        });
      } else if (!isGstin(gstin)) {
        ctx.addIssue({
          code: 'custom',
          path: ['gst_details', 'gstin'],
          message:
            'Invalid GSTIN — format 22AAAAA0000A1Z5 (with valid checksum)',
        });
      }
    }
  });

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;
