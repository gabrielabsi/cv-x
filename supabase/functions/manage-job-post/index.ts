import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobPostRequest {
  action: 'create' | 'update' | 'delete' | 'get' | 'list';
  organization_id: string;
  job_id?: string;
  data?: {
    title?: string;
    description?: string;
    requirements?: string[];
    location?: string;
    work_model?: 'remote' | 'hybrid' | 'onsite';
    salary_range?: string;
    status?: 'draft' | 'active' | 'paused' | 'closed';
  };
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] manage-job-post: Request received`);

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

    const body: JobPostRequest = await req.json();
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is member of organization
    const { data: membership } = await serviceClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', body.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'Not a member of this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] User ${user.id} is ${membership.role} in org ${body.organization_id}`);

    switch (body.action) {
      case 'create': {
        if (membership.role === 'viewer') {
          return new Response(
            JSON.stringify({ error: 'Viewers cannot create jobs' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!body.data?.title || !body.data?.description) {
          return new Response(
            JSON.stringify({ error: 'Title and description are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check job limit
        const { data: org } = await serviceClient
          .from('organizations')
          .select('max_jobs')
          .eq('id', body.organization_id)
          .single();

        const { count: activeJobs } = await serviceClient
          .from('job_posts')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', body.organization_id)
          .in('status', ['draft', 'active', 'paused']);

        if (org && activeJobs !== null && activeJobs >= org.max_jobs) {
          return new Response(
            JSON.stringify({ error: `Job limit reached (${org.max_jobs} jobs)` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate AI summary of the job
        let aiSummary = null;
        try {
          const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
          if (lovableApiKey) {
            const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${lovableApiKey}`,
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  {
                    role: 'system',
                    content: 'Extract key information from this job posting. Return JSON with: required_skills (array), experience_level (junior/mid/senior/lead), key_responsibilities (array max 5), nice_to_have (array).'
                  },
                  {
                    role: 'user',
                    content: `Title: ${body.data.title}\n\nDescription: ${body.data.description}\n\nRequirements: ${body.data.requirements?.join(', ') || 'Not specified'}`
                  }
                ],
                temperature: 0.3,
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const content = aiData.choices?.[0]?.message?.content || '';
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                aiSummary = JSON.parse(jsonMatch[0]);
              }
            }
          }
        } catch (e) {
          console.error(`[${requestId}] AI summary error:`, e);
        }

        const { data: job, error: jobError } = await serviceClient
          .from('job_posts')
          .insert({
            organization_id: body.organization_id,
            title: body.data.title,
            description: body.data.description,
            requirements: body.data.requirements || [],
            location: body.data.location,
            work_model: body.data.work_model || 'onsite',
            salary_range: body.data.salary_range,
            status: body.data.status || 'draft',
            ai_summary: aiSummary,
            created_by: user.id,
          })
          .select()
          .single();

        if (jobError) {
          console.error(`[${requestId}] Error creating job:`, jobError);
          return new Response(
            JSON.stringify({ error: 'Failed to create job' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update usage - increment jobs_created
        try {
          const now = new Date();
          await serviceClient
            .from('organization_usage')
            .update({ jobs_created: (activeJobs || 0) + 1 })
            .eq('organization_id', body.organization_id)
            .gte('period_end', now.toISOString());
        } catch (e) {
          console.log(`[${requestId}] Usage update skipped:`, e);
        }

        return new Response(
          JSON.stringify({ success: true, job }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!body.job_id) {
          return new Response(
            JSON.stringify({ error: 'job_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (membership.role === 'viewer') {
          return new Response(
            JSON.stringify({ error: 'Viewers cannot update jobs' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateData: Record<string, unknown> = {};
        if (body.data?.title) updateData.title = body.data.title;
        if (body.data?.description) updateData.description = body.data.description;
        if (body.data?.requirements) updateData.requirements = body.data.requirements;
        if (body.data?.location !== undefined) updateData.location = body.data.location;
        if (body.data?.work_model) updateData.work_model = body.data.work_model;
        if (body.data?.salary_range !== undefined) updateData.salary_range = body.data.salary_range;
        if (body.data?.status) {
          updateData.status = body.data.status;
          if (body.data.status === 'closed') {
            updateData.closed_at = new Date().toISOString();
          }
        }

        const { data: job, error: jobError } = await serviceClient
          .from('job_posts')
          .update(updateData)
          .eq('id', body.job_id)
          .eq('organization_id', body.organization_id)
          .select()
          .single();

        if (jobError) {
          return new Response(
            JSON.stringify({ error: 'Failed to update job' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, job }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!body.job_id) {
          return new Response(
            JSON.stringify({ error: 'job_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!['owner', 'admin'].includes(membership.role)) {
          return new Response(
            JSON.stringify({ error: 'Only owners and admins can delete jobs' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: deleteError } = await serviceClient
          .from('job_posts')
          .delete()
          .eq('id', body.job_id)
          .eq('organization_id', body.organization_id);

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: 'Failed to delete job' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        if (!body.job_id) {
          return new Response(
            JSON.stringify({ error: 'job_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: job, error: jobError } = await serviceClient
          .from('job_posts')
          .select('*, candidates(count), candidate_evaluations(count)')
          .eq('id', body.job_id)
          .eq('organization_id', body.organization_id)
          .single();

        if (jobError || !job) {
          return new Response(
            JSON.stringify({ error: 'Job not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, job }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        const { data: jobs, error: jobsError } = await serviceClient
          .from('job_posts')
          .select('*, candidates(count)')
          .eq('organization_id', body.organization_id)
          .order('created_at', { ascending: false });

        if (jobsError) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch jobs' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, jobs }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
