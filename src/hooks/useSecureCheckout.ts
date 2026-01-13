import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface CheckoutOptions {
  productType: string;
  couponCode?: string;
}

interface CheckoutResult {
  url?: string;
  error?: string;
}

/**
 * Hook for secure checkout that handles both authenticated and unauthenticated flows
 * - For authenticated users: uses JWT token directly
 * - For unauthenticated users: requires intent token (not supported in current flow)
 */
export function useSecureCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

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
      
      // Build request body
      const body: Record<string, string> = { productType };
      if (couponCode) {
        body.couponCode = couponCode;
      }

      // If user is authenticated, JWT is automatically included
      if (session?.access_token) {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body
        });

        if (error) {
          throw new Error(error.message || "Erro ao criar sessão de pagamento");
        }

        if (!data?.url) {
          throw new Error("Falha ao criar sessão de pagamento");
        }

        return { url: data.url };
      }

      // For unauthenticated flows - get intent token first
      if (!requireAuth) {
        const intentToken = await getIntentToken(productType);
        
        if (!intentToken) {
          throw new Error("Não foi possível iniciar o checkout. Tente novamente.");
        }

        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { ...body, intentToken }
        });

        if (error) {
          throw new Error(error.message || "Erro ao criar sessão de pagamento");
        }

        if (!data?.url) {
          throw new Error("Falha ao criar sessão de pagamento");
        }

        return { url: data.url };
      }

      // Auth required but not authenticated
      throw new Error("Login necessário para continuar");

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Tente novamente.";
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
        title: "Erro",
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
