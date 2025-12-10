// Client Supabase externo para autenticação com LinkedIn OIDC
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://sildjicmukszygecijny.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpbGRqaWNtdWtzenlnZWNpam55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTU2MzksImV4cCI6MjA4MDM5MTYzOX0.VQ98GiAdOIS48-iT2GfhQ0v7M4XHYhNSgy8CSRb2a1w';

export const supabaseAuth = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
