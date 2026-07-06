/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_MODEL?: string;
  readonly VITE_GEMINI_FALLBACK_MODELS?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_MCA_API_URL?: string;
  readonly VITE_MCA_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
