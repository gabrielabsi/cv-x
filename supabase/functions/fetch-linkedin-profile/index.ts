import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user and their LinkedIn provider token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("User error:", userError);
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[LINKEDIN] Fetching profile for user:", user.id);
    
    // Check if user has LinkedIn identity
    const linkedInIdentity = user.identities?.find(
      (identity) => identity.provider === "linkedin_oidc"
    );

    if (!linkedInIdentity) {
      return new Response(
        JSON.stringify({ error: "LinkedIn not connected", needsConnection: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the session to access the provider token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error("Session error:", sessionError);
      return new Response(
        JSON.stringify({ error: "Could not get session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const providerToken = session.provider_token;
    
    if (!providerToken) {
      console.log("[LINKEDIN] No provider token, using user metadata");
      // Fall back to user metadata from OAuth
      const metadata = user.user_metadata;
      const identityData = linkedInIdentity.identity_data;
      
      const profileData = {
        name: metadata?.full_name || metadata?.name || identityData?.name || "Profissional",
        headline: identityData?.headline || metadata?.headline || "",
        profileUrl: `https://linkedin.com/in/${identityData?.vanity_name || ""}`,
        pictureUrl: metadata?.avatar_url || metadata?.picture || identityData?.picture,
        email: user.email,
        // Generate resume text from available data
        resumeText: generateResumeTextFromMetadata(metadata, identityData)
      };
      
      console.log("[LINKEDIN] Profile from metadata:", profileData.name);
      
      return new Response(
        JSON.stringify(profileData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch profile from LinkedIn API using provider token
    console.log("[LINKEDIN] Fetching from LinkedIn API with provider token");
    
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    });

    if (!profileResponse.ok) {
      console.error("[LINKEDIN] API error:", profileResponse.status);
      // Fall back to metadata
      const metadata = user.user_metadata;
      const identityData = linkedInIdentity.identity_data;
      
      return new Response(
        JSON.stringify({
          name: metadata?.full_name || metadata?.name || "Profissional",
          headline: identityData?.headline || "",
          profileUrl: `https://linkedin.com/in/${identityData?.vanity_name || ""}`,
          pictureUrl: metadata?.avatar_url || metadata?.picture,
          email: user.email,
          resumeText: generateResumeTextFromMetadata(metadata, identityData)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const linkedInProfile = await profileResponse.json();
    console.log("[LINKEDIN] Got profile from API:", linkedInProfile.name);

    const profileData = {
      name: linkedInProfile.name || linkedInProfile.given_name + " " + linkedInProfile.family_name,
      headline: linkedInProfile.headline || "",
      profileUrl: linkedInProfile.profile_url || `https://linkedin.com/in/${linkedInProfile.sub}`,
      pictureUrl: linkedInProfile.picture,
      email: linkedInProfile.email || user.email,
      resumeText: generateResumeTextFromLinkedIn(linkedInProfile)
    };

    return new Response(
      JSON.stringify(profileData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[LINKEDIN] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateResumeTextFromMetadata(metadata: any, identityData: any): string {
  const parts = [];
  
  const name = metadata?.full_name || metadata?.name || identityData?.name;
  if (name) parts.push(`Nome: ${name}`);
  
  const headline = identityData?.headline || metadata?.headline;
  if (headline) parts.push(`Título: ${headline}`);
  
  const email = metadata?.email || identityData?.email;
  if (email) parts.push(`Email: ${email}`);
  
  if (identityData?.vanity_name) {
    parts.push(`LinkedIn: https://linkedin.com/in/${identityData.vanity_name}`);
  }
  
  // Add locale if available
  const locale = identityData?.locale?.language;
  if (locale) parts.push(`Idioma principal: ${locale === 'pt' ? 'Português' : locale}`);
  
  if (parts.length === 0) {
    return "Perfil do LinkedIn conectado - informações básicas disponíveis.";
  }
  
  return `PERFIL LINKEDIN\n\n${parts.join("\n")}\n\nNOTA: Este perfil foi obtido via conexão OAuth. Para uma análise mais detalhada com experiências profissionais e habilidades, recomendamos exportar o PDF completo do LinkedIn.`;
}

function generateResumeTextFromLinkedIn(profile: any): string {
  const parts = [];
  
  if (profile.name) parts.push(`Nome: ${profile.name}`);
  if (profile.given_name && profile.family_name) {
    parts.push(`Nome completo: ${profile.given_name} ${profile.family_name}`);
  }
  if (profile.headline) parts.push(`Título profissional: ${profile.headline}`);
  if (profile.email) parts.push(`Email: ${profile.email}`);
  if (profile.locale) parts.push(`Localização: ${profile.locale}`);
  
  return `PERFIL LINKEDIN\n\n${parts.join("\n")}\n\nNOTA: Este perfil foi obtido via conexão OAuth. Para uma análise mais detalhada com experiências profissionais e habilidades, recomendamos exportar o PDF completo do LinkedIn.`;
}
