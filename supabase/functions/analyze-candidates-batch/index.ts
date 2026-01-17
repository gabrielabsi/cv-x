import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CandidateInput {
  filename: string;
  resumeText: string;
}

interface AnalyzeBatchRequest {
  job_post_id: string;
  organization_id: string;
  candidates: CandidateInput[];
}

interface CandidateAnalysis {
  name: string;
  email: string | null;
  phone: string | null;
  fit_score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: 'strongly_recommend' | 'recommend' | 'maybe' | 'not_recommend';
  detailed_analysis: Record<string, unknown>;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] analyze-candidates-batch: Request received`);

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error(`[${requestId}] LOVABLE_API_KEY not configured`);
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const body: AnalyzeBatchRequest = await req.json();

    if (!body.job_post_id || !body.organization_id || !body.candidates?.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: job_post_id, organization_id, candidates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    if (membership.role === 'viewer') {
      return new Response(
        JSON.stringify({ error: 'Viewers cannot analyze candidates' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Processing ${body.candidates.length} candidates for job ${body.job_post_id}`);

    // Get job post details
    const { data: job, error: jobError } = await serviceClient
      .from('job_posts')
      .select('*')
      .eq('id', body.job_post_id)
      .eq('organization_id', body.organization_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job post not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check candidate limit
    const { data: org } = await serviceClient
      .from('organizations')
      .select('max_candidates_per_job')
      .eq('id', body.organization_id)
      .single();

    const { count: existingCandidates } = await serviceClient
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('job_post_id', body.job_post_id);

    const totalAfterUpload = (existingCandidates || 0) + body.candidates.length;
    if (org && totalAfterUpload > org.max_candidates_per_job) {
      return new Response(
        JSON.stringify({ 
          error: `Candidate limit exceeded. Max: ${org.max_candidates_per_job}, Current: ${existingCandidates}, Uploading: ${body.candidates.length}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare job context for AI
    const jobContext = `
Title: ${job.title}
Description: ${job.description}
Requirements: ${job.requirements?.join(', ') || 'Not specified'}
Location: ${job.location || 'Not specified'}
Work Model: ${job.work_model || 'Not specified'}
    `.trim();

    // Process candidates in parallel (batches of 5 to avoid rate limits)
    const results: Array<{
      candidate_id: string;
      analysis: CandidateAnalysis;
      filename: string;
    }> = [];

    const batchSize = 5;
    for (let i = 0; i < body.candidates.length; i += batchSize) {
      const batch = body.candidates.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (candidate) => {
        try {
          // Call AI to analyze candidate
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
                  content: `You are an expert HR analyst. Analyze how well a candidate's resume matches a job posting.
                  
Return a JSON object with these exact fields:
{
  "name": "Candidate's full name extracted from resume",
  "email": "Email if found, or null",
  "phone": "Phone if found, or null",
  "fit_score": 0-100 integer representing match percentage,
  "summary": "2-3 sentence summary of candidate fit",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendation": "strongly_recommend" | "recommend" | "maybe" | "not_recommend",
  "detailed_analysis": {
    "skills_match": { "matched": [], "missing": [] },
    "experience_relevance": "description",
    "cultural_fit_indicators": "description"
  }
}

Be objective and thorough. Score based on:
- Skills match (40%)
- Experience relevance (30%)
- Education fit (15%)
- Overall presentation (15%)`
                },
                {
                  role: 'user',
                  content: `JOB POSTING:\n${jobContext}\n\n---\n\nCANDIDATE RESUME:\n${candidate.resumeText}`
                }
              ],
              temperature: 0.3,
            }),
          });

          if (!aiResponse.ok) {
            console.error(`[${requestId}] AI error for ${candidate.filename}:`, await aiResponse.text());
            throw new Error('AI analysis failed');
          }

          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
          }

          const analysis: CandidateAnalysis = JSON.parse(jsonMatch[0]);

          // Validate required fields
          if (typeof analysis.fit_score !== 'number' || !analysis.summary) {
            throw new Error('Invalid analysis format');
          }

          // Clamp fit_score between 0-100
          analysis.fit_score = Math.max(0, Math.min(100, Math.round(analysis.fit_score)));

          return {
            filename: candidate.filename,
            resumeText: candidate.resumeText,
            analysis,
          };

        } catch (error) {
          console.error(`[${requestId}] Error analyzing ${candidate.filename}:`, error);
          // Return a default failed analysis
          return {
            filename: candidate.filename,
            resumeText: candidate.resumeText,
            analysis: {
              name: 'Unknown',
              email: null,
              phone: null,
              fit_score: 0,
              summary: 'Analysis failed - please try again',
              strengths: [],
              weaknesses: ['Could not analyze resume'],
              recommendation: 'not_recommend' as const,
              detailed_analysis: { error: 'Analysis failed' },
            },
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Save candidates and evaluations to database
      for (const result of batchResults) {
        // Insert candidate
        const { data: candidateRecord, error: candidateError } = await serviceClient
          .from('candidates')
          .insert({
            job_post_id: body.job_post_id,
            organization_id: body.organization_id,
            name: result.analysis.name,
            email: result.analysis.email,
            phone: result.analysis.phone,
            original_filename: result.filename,
            resume_text: result.resumeText,
            ai_summary: result.analysis.detailed_analysis,
            status: 'analyzed',
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (candidateError) {
          console.error(`[${requestId}] Error saving candidate:`, candidateError);
          continue;
        }

        // Insert evaluation
        const { error: evalError } = await serviceClient
          .from('candidate_evaluations')
          .insert({
            candidate_id: candidateRecord.id,
            job_post_id: body.job_post_id,
            organization_id: body.organization_id,
            fit_score: result.analysis.fit_score,
            summary: result.analysis.summary,
            strengths: result.analysis.strengths,
            weaknesses: result.analysis.weaknesses,
            recommendation: result.analysis.recommendation,
            detailed_analysis: result.analysis.detailed_analysis,
          });

        if (evalError) {
          console.error(`[${requestId}] Error saving evaluation:`, evalError);
        }

        results.push({
          candidate_id: candidateRecord.id,
          analysis: result.analysis,
          filename: result.filename,
        });
      }
    }

    // Calculate rankings based on fit_score
    const sortedResults = [...results].sort((a, b) => b.analysis.fit_score - a.analysis.fit_score);
    
    // Update ranking positions
    for (let i = 0; i < sortedResults.length; i++) {
      await serviceClient
        .from('candidate_evaluations')
        .update({ ranking_position: i + 1 })
        .eq('candidate_id', sortedResults[i].candidate_id);
    }

    // Update usage
    await serviceClient
      .from('organization_usage')
      .update({ 
        candidates_evaluated: serviceClient.rpc('increment', { x: results.length }) 
      })
      .eq('organization_id', body.organization_id)
      .gte('period_end', new Date().toISOString());

    console.log(`[${requestId}] Processed ${results.length} candidates successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results: sortedResults.map((r, i) => ({
          ...r,
          ranking_position: i + 1,
        })),
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
