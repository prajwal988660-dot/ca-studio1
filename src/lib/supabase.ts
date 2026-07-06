// Supabase Configuration
export const SUPABASE_URL = 'https://bxtxbeybbgavanvepowc.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4dHhiZXliYmdhdmFudmVwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzU3MTYsImV4cCI6MjA5NzAxMTcxNn0.zd6CkBxL9EQpfDN5uBhB0NoKCsfkOn4U5M5rvEb8JWA';
export const SUPABASE_TABLE = 'ca_profiles'; // Target table name

export interface CaProfileRow {
  name: string;
  phone: string;
  email: string;
  state: string;
  city: string;
  profession: string;
  expertise: string[];
}

export async function storeProfileInSupabase(profile: CaProfileRow): Promise<boolean> {
  // If the placeholder has not been replaced, skip API call
  if (
    !SUPABASE_URL ||
    !SUPABASE_KEY ||
    SUPABASE_URL.includes('YOUR_SUPABASE_PROJECT_REF') ||
    SUPABASE_KEY.includes('YOUR_SUPABASE_ANON_KEY')
  ) {
    console.warn('Supabase is not configured. Storing in local storage only.');
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        state: profile.state,
        city: profile.city,
        profession: profile.profession,
        expertise: profile.expertise,
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to store profile in Supabase:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error contacting Supabase:', error);
    return false;
  }
}
