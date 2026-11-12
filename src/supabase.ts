import { createClient } from '@supabase/supabase-js'

// These are public client settings. Row-level security protects user data.
// Never place an OpenAI key, service-role key, or Supabase secret key here.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://vmrcjfbyvmrstlgpihfz.supabase.co'
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || 'sb_publishable_Nea1EmlJGZitWD6Nwirylg_spsFM52s'

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null
