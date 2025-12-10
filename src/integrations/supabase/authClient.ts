// Client Supabase externo para autenticação com LinkedIn OIDC
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://sildjicmukszygecijny.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNueG14eWR0ZGJmbndoYnZnbG9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODM0MzAsImV4cCI6MjA4MDk1OTQzMH0.S65r6CoyfOkISsrroXd9mJjxrJMqk9oOAonJeOFESXc';

export const supabaseAuth = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
