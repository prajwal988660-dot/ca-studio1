export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          created_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          entity_type: string;
          entity_details: Json;
          business_nature: string[];
          inventory_enabled: boolean;
          inventory_config: Json;
          gst_status: string;
          gst_details: Json;
          tds_applicable: boolean;
          tcs_applicable: boolean;
          tax_audit_applicable: boolean;
          financial_year_start: string;
          accounting_standard: string;
          accounting_method: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          entity_type: string;
          entity_details?: Json;
          business_nature?: string[];
          inventory_enabled?: boolean;
          inventory_config?: Json;
          gst_status?: string;
          gst_details?: Json;
          tds_applicable?: boolean;
          tcs_applicable?: boolean;
          tax_audit_applicable?: boolean;
          financial_year_start?: string;
          accounting_standard?: string;
          accounting_method?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          entity_type?: string;
          entity_details?: Json;
          business_nature?: string[];
          inventory_enabled?: boolean;
          inventory_config?: Json;
          gst_status?: string;
          gst_details?: Json;
          tds_applicable?: boolean;
          tcs_applicable?: boolean;
          tax_audit_applicable?: boolean;
          financial_year_start?: string;
          accounting_standard?: string;
          accounting_method?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      journal_entries: {
        Row: {
          id: string;
          company_id: string;
          entry_code: string;
          entry_date: string;
          voucher_type: string;
          voucher_number: string | null;
          lines: Json;
          narration: string;
          book_period: string;
          is_opening: boolean;
          is_closing: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          entry_code: string;
          entry_date: string;
          voucher_type: string;
          voucher_number?: string | null;
          lines: Json;
          narration: string;
          book_period: string;
          is_opening?: boolean;
          is_closing?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          entry_code?: string;
          entry_date?: string;
          voucher_type?: string;
          voucher_number?: string | null;
          lines?: Json;
          narration?: string;
          book_period?: string;
          is_opening?: boolean;
          is_closing?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      account_groups: {
        Row: {
          id: string;
          company_id: string;
          account_name: string;
          parent_group: string;
          nature: string;
          account_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          account_name: string;
          parent_group: string;
          nature: string;
          account_type?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          account_name?: string;
          parent_group?: string;
          nature?: string;
          account_type?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      inventory_items: {
        Row: {
          id: string;
          company_id: string;
          item_name: string;
          item_code: string | null;
          unit: string | null;
          hsn_code: string | null;
          gst_rate: number | null;
          opening_qty: number;
          opening_rate: number;
          reorder_level: number | null;
          valuation_method: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          item_name: string;
          item_code?: string | null;
          unit?: string | null;
          hsn_code?: string | null;
          gst_rate?: number | null;
          opening_qty?: number;
          opening_rate?: number;
          reorder_level?: number | null;
          valuation_method?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          item_name?: string;
          item_code?: string | null;
          unit?: string | null;
          hsn_code?: string | null;
          gst_rate?: number | null;
          opening_qty?: number;
          opening_rate?: number;
          reorder_level?: number | null;
          valuation_method?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      book_periods: {
        Row: {
          id: string;
          company_id: string;
          period_start: string;
          period_end: string;
          period_label: string;
          reason: string | null;
          status: string;
          created_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          period_start: string;
          period_end: string;
          period_label: string;
          reason?: string | null;
          status?: string;
          created_at?: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          period_start?: string;
          period_end?: string;
          period_label?: string;
          reason?: string | null;
          status?: string;
          created_at?: string;
          closed_at?: string | null;
        };
      };
    };
    Functions: {
      generate_entry_code: {
        Args: { p_company_id: string };
        Returns: string;
      };
    };
  };
}
