import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteMemberRequest {
  organization_id: string;
  email: string;
  role: 'admin' | 'recruiter' | 'viewer';
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] invite-member: Request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: InviteMemberRequest = await req.json();

    if (!body.organization_id || !body.email || !body.role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organization_id, email, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    if (!['admin', 'recruiter', 'viewer'].includes(body.role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be admin, recruiter, or viewer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if inviter is admin/owner of the organization
    const { data: inviterMembership } = await serviceClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', body.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!inviterMembership || !['owner', 'admin'].includes(inviterMembership.role)) {
      return new Response(
        JSON.stringify({ error: 'Only owners and admins can invite members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Inviter ${user.id} is ${inviterMembership.role}`);

    // Find user by email using auth admin API
    const { data: authUsers } = await serviceClient.auth.admin.listUsers();
    const invitedUser = authUsers.users.find(u => u.email === body.email.toLowerCase());

    if (!invitedUser) {
      // User doesn't exist yet - could implement invite email here
      // For now, return error
      return new Response(
        JSON.stringify({ 
          error: 'User not found. They must create an account first.',
          invite_pending: true 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await serviceClient
      .from('organization_members')
      .select('id')
      .eq('organization_id', body.organization_id)
      .eq('user_id', invitedUser.id)
      .single();

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: 'User is already a member of this organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add member
    const { data: newMember, error: memberError } = await serviceClient
      .from('organization_members')
      .insert({
        organization_id: body.organization_id,
        user_id: invitedUser.id,
        role: body.role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (memberError) {
      console.error(`[${requestId}] Error adding member:`, memberError);
      return new Response(
        JSON.stringify({ error: 'Failed to add member' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Member added: ${invitedUser.id} as ${body.role}`);

    return new Response(
      JSON.stringify({
        success: true,
        member: {
          id: newMember.id,
          user_id: invitedUser.id,
          email: body.email,
          role: body.role,
        },
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
