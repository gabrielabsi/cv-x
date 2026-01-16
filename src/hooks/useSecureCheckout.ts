import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

interface CheckoutOptions {
  productType: string;
  couponCode?: string;
}

interface CheckoutResult {
  url?: string;
  error?: string;
}

// Price IDs for Portuguese (BRL) products
const PRICE_IDS_PT: Record<string, string> = {
  basico: "price_1SmxLsJmb1TyvE3zVlpHKhTc",
  intermediario: "price_1SmxMCJmb1TyvE3zVfhJvHFt",
  avancado: "price_1SmxMOJmb1TyvE3zDLXk6vRl",
  mentoria: "price_1SmxP8Jmb1TyvE3z45IVjKRd",
  rewrite_pdf: "price_1So10HJmb1TyvE3z6OOJEf1R",
  rewrite_word: "price_1So10sJmb1TyvE3zLKQb96pu",
  premium_analysis: "price_1So11QJmb1TyvE3zXBGpzxiw",
};

// Price IDs for English (USD) products
const PRICE_IDS_EN: Record<string, string> = {
  basico: "price_1SqBuRJmb1TyvE3zHnRPacyl",      // CVX Basic - $9.99/month
  intermediario: "price_1SqBuQJmb1TyvE3zqgGEu6j1", // CVX Intermediate - $14.99/month
  avancado: "price_1SqBuPJmb1TyvE3zrA33BZ7j",    // CVX Advanced - $29.99/month
  mentoria: "price_1SqBuJJmb1TyvE3zKLCfFsCS",    // Cela Mentorship - $99
  rewrite_pdf: "price_1SqBuUJmb1TyvE3z8JgSMBQ0", // Rewrite PDF - $1.99
  rewrite_word: "price_1SqBuTJmb1TyvE3zK23Wwggj", // Rewrite Word - $4.99
  premium_analysis: "price_1SqBuVJmb1TyvE3ziyY5bF0a", // Premium Analysis - $4.99
};

/**
 * Hook for secure checkout that handles both authenticated and unauthenticated flows
 * - For authenticated users: uses JWT token directly
 * - For unauthenticated users: requires intent token (not supported in current flow)
 * - Automatically selects correct price IDs based on language
 */
export function useSecureCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();
  const { language, t } = useLanguage();

  /**
   * Get the correct price ID based on current language
   */
  const getPriceId = (productType: string): string | null => {
    // Remove _en suffix if present (legacy support)
    const baseProductType = productType.replace(/_en$/, "");
    
    const priceIds = language === "en" ? PRICE_IDS_EN : PRICE_IDS_PT;
    return priceIds[baseProductType] || null;
  };

  /**
   * Get intent token for unauthenticated checkout
   * This is a fallback for flows that allow guest checkout
   */
  const getIntentToken = async (planId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-intent", {
        body: { planId }
      });

      if (error) {
        console.error("Failed to get intent token:", error);
        return null;
      }

      return data?.intentToken || null;
    } catch (err) {
      console.error("Error getting intent token:", err);
      return null;
    }
  };

  /**
   * Initiate secure checkout
   * For authenticated users, the JWT is automatically included by Supabase client
   * For unauthenticated flows (if needed), gets intent token first
   */
  const initiateCheckout = async (
    options: CheckoutOptions,
    requireAuth: boolean = true
  ): Promise<CheckoutResult> => {
    setIsLoading(true);

    try {
      const { productType, couponCode } = options;
      
      // Get the correct price ID for the current language
      const priceId = getPriceId(productType);
      
      if (!priceId) {
        throw new Error(t("checkout.invalidProduct"));
      }
      
      // Build request body with price ID instead of product type
      const body: Record<string, string> = { 
        productType,
        priceId,
        language 
      };
      if (couponCode) {
        body.couponCode = couponCode;
      }

      // If user is authenticated, JWT is automatically included
      if (session?.access_token) {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body
        });

        if (error) {
          throw new Error(error.message || t("checkout.error"));
        }

        if (!data?.url) {
          throw new Error(t("checkout.error"));
        }

        return { url: data.url };
      }

      // For unauthenticated flows - get intent token first
      if (!requireAuth) {
        const intentToken = await getIntentToken(productType);
        
        if (!intentToken) {
          throw new Error(t("checkout.retryError"));
        }

        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { ...body, intentToken }
        });

        if (error) {
          throw new Error(error.message || t("checkout.error"));
        }

        if (!data?.url) {
          throw new Error(t("checkout.error"));
        }

        return { url: data.url };
      }

      // Auth required but not authenticated
      throw new Error(t("checkout.loginRequired"));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("checkout.retryError");
      return { error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start checkout and open in new tab
   */
  const startCheckout = async (
    productType: string,
    options?: { couponCode?: string; requireAuth?: boolean; openInNewTab?: boolean }
  ): Promise<boolean> => {
    const { couponCode, requireAuth = true, openInNewTab = true } = options || {};

    const result = await initiateCheckout({ productType, couponCode }, requireAuth);

    if (result.error) {
      toast({
        title: t("checkout.errorTitle"),
        description: result.error,
        variant: "destructive",
      });
      return false;
    }

    if (result.url) {
      if (openInNewTab) {
        window.open(result.url, "_blank");
      } else {
        window.location.href = result.url;
      }
      return true;
    }

    return false;
  };

  return {
    isLoading,
    startCheckout,
    initiateCheckout,
  };
}
