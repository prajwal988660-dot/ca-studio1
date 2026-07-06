// ============================================================================
// User profile (onboarding contact + professional details).
//
// Replaces the old hardcoded-project src/lib/supabase.ts. Writes through the
// shared, env-based Supabase client to the RLS-protected `user_profiles` table,
// keyed by the signed-in user's id. When Supabase isn't configured, or nobody
// is signed in, this is a no-op that returns false — the SignUpForm still keeps
// the data in localStorage, so onboarding works fully offline exactly as before.
// ============================================================================

import { supabase } from '@/lib/supabaseClient';

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  state: string;
  city: string;
  profession: string;
  expertise: string[];
}

/**
 * Upsert the signed-in user's profile to Supabase. Best-effort: never throws.
 * Returns true only when the row was written to the cloud.
 */
export async function saveUserProfile(profile: UserProfile): Promise<boolean> {
  if (!supabase) return false; // Supabase not configured → offline-only
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return false; // not signed in → stays local-only

    const { error } = await supabase.from('user_profiles').upsert(
      {
        user_id: user.id,
        name: profile.name,
        phone: profile.phone,
        email: profile.email || user.email || '',
        state: profile.state,
        city: profile.city,
        profession: profile.profession,
        expertise: profile.expertise,
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[profile] cloud save failed:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[profile] cloud save error:', e);
    return false;
  }
}
