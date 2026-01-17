import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateOrgRequest {
  name: string;
  slug?: string;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] create-organization: Request received`);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log(`[${requestId}] No authorization header`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.log(`[${requestId}] Auth error:`, authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.id}`);

    // Parse request body
    const body: CreateOrgRequest = await req.json();
    
    if (!body.name || body.name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Organization name must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate slug from name if not provided
    const slug = body.slug || body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);

    console.log(`[${requestId}] Creating organization: ${body.name} (${slug})`);

    // Use service role client for the transaction
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if slug already exists
    const { data: existingOrg } = await serviceClient
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingOrg) {
      return new Response(
        JSON.stringify({ error: 'Organization slug already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create organization
    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .insert({
        name: body.name.trim(),
        slug,
      })
      .select()
      .single();

    if (orgError) {
      console.error(`[${requestId}] Error creating organization:`, orgError);
      return new Response(
        JSON.stringify({ error: 'Failed to create organization' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Organization created: ${org.id}`);

    // Add user as owner
    const { error: memberError } = await serviceClient
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberError) {
      console.error(`[${requestId}] Error adding owner:`, memberError);
      // Rollback organization creation
      await serviceClient.from('organizations').delete().eq('id', org.id);
      return new Response(
        JSON.stringify({ error: 'Failed to add owner to organization' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize usage tracking
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    await serviceClient
      .from('organization_usage')
      .insert({
        organization_id: org.id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      });

    console.log(`[${requestId}] Organization setup complete`);

    return new Response(
      JSON.stringify({
        success: true,
        organization: org,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
