import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CV-CHECKOUT] ${step}${detailsStr}`);
};

// Price IDs for CV Rewrite products
const PRICES = {
  pdf: "price_1Som4vJmb1TyvE3zVhfXN35r",   // R$4.99
  docx: "price_1Som5XJmb1TyvE3zwz5zkUoh",  // R$9.99
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { format, email, resumeText } = await req.json();

    if (!format || !["pdf", "docx"].includes(format)) {
      throw new Error("Formato deve ser 'pdf' ou 'docx'");
    }

    if (!resumeText) {
      throw new Error("Texto do currículo é obrigatório");
    }

    logStep("Request parsed", { format, hasEmail: !!email });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const priceId = PRICES[format as keyof typeof PRICES];
    if (!priceId) {
      throw new Error("Preço não configurado para este formato");
    }

    // Store resume text in metadata (truncated if too long)
    const truncatedResume = resumeText.substring(0, 400);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/cv-download?session_id={CHECKOUT_SESSION_ID}&format=${format}`,
      cancel_url: `${req.headers.get("origin")}/?canceled=true`,
      metadata: {
        format,
        resumePreview: truncatedResume,
        type: "cv_rewrite",
      },
    };

    // Add customer email if provided
    if (email) {
      sessionParams.customer_email = email;
    }

    logStep("Creating checkout session", { priceId });

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
