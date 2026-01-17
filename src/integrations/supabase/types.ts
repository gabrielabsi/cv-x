export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analysis_history: {
        Row: {
          company: string | null
          created_at: string
          id: string
          improvements: string[] | null
          is_premium: boolean
          job_title: string
          missing_keywords: string[] | null
          score: number
          strengths: string[] | null
          summary: string
          user_id: string
          weaknesses: string[] | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          id?: string
          improvements?: string[] | null
          is_premium?: boolean
          job_title: string
          missing_keywords?: string[] | null
          score: number
          strengths?: string[] | null
          summary: string
          user_id: string
          weaknesses?: string[] | null
        }
        Update: {
          company?: string | null
          created_at?: string
          id?: string
          improvements?: string[] | null
          is_premium?: boolean
          job_title?: string
          missing_keywords?: string[] | null
          score?: number
          strengths?: string[] | null
          summary?: string
          user_id?: string
          weaknesses?: string[] | null
        }
        Relationships: []
      }
      candidate_evaluations: {
        Row: {
          candidate_id: string
          created_at: string
          detailed_analysis: Json | null
          evaluated_at: string
          fit_score: number
          id: string
          job_post_id: string
          organization_id: string
          ranking_position: number | null
          recommendation: Database["public"]["Enums"]["recommendation_type"]
          strengths: string[] | null
          summary: string
          weaknesses: string[] | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          detailed_analysis?: Json | null
          evaluated_at?: string
          fit_score: number
          id?: string
          job_post_id: string
          organization_id: string
          ranking_position?: number | null
          recommendation: Database["public"]["Enums"]["recommendation_type"]
          strengths?: string[] | null
          summary: string
          weaknesses?: string[] | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          detailed_analysis?: Json | null
          evaluated_at?: string
          fit_score?: number
          id?: string
          job_post_id?: string
          organization_id?: string
          ranking_position?: number | null
          recommendation?: Database["public"]["Enums"]["recommendation_type"]
          strengths?: string[] | null
          summary?: string
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_evaluations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_evaluations_job_post_id_fkey"
            columns: ["job_post_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          ai_summary: Json | null
          created_at: string
          email: string | null
          id: string
          job_post_id: string
          name: string | null
          organization_id: string
          original_filename: string
          phone: string | null
          resume_storage_path: string | null
          resume_text: string | null
          status: Database["public"]["Enums"]["candidate_status"]
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          ai_summary?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          job_post_id: string
          name?: string | null
          organization_id: string
          original_filename: string
          phone?: string | null
          resume_storage_path?: string | null
          resume_text?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          ai_summary?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          job_post_id?: string
          name?: string | null
          organization_id?: string
          original_filename?: string
          phone?: string | null
          resume_storage_path?: string | null
          resume_text?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_job_post_id_fkey"
            columns: ["job_post_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_intents: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          intent_token: string
          ip_hash: string
          plan_id: string
          used: boolean
          user_agent_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          intent_token: string
          ip_hash: string
          plan_id: string
          used?: boolean
          user_agent_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          intent_token?: string
          ip_hash?: string
          plan_id?: string
          used?: boolean
          user_agent_hash?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          feature: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          feature: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          feature?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      cv_rewrites: {
        Row: {
          created_at: string
          id: string
          job_description_text: string | null
          language: string
          original_cv_text: string
          rewrite_content: Json
          target_role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_description_text?: string | null
          language?: string
          original_cv_text: string
          rewrite_content: Json
          target_role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_description_text?: string | null
          language?: string
          original_cv_text?: string
          rewrite_content?: Json
          target_role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_posts: {
        Row: {
          ai_summary: Json | null
          closed_at: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          location: string | null
          organization_id: string
          requirements: string[] | null
          salary_range: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
          work_model: Database["public"]["Enums"]["work_model"] | null
        }
        Insert: {
          ai_summary?: Json | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          location?: string | null
          organization_id: string
          requirements?: string[] | null
          salary_range?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
          work_model?: Database["public"]["Enums"]["work_model"] | null
        }
        Update: {
          ai_summary?: Json | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          location?: string | null
          organization_id?: string
          requirements?: string[] | null
          salary_range?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
          work_model?: Database["public"]["Enums"]["work_model"] | null
        }
        Relationships: [
          {
            foreignKeyName: "job_posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_usage: {
        Row: {
          api_calls: number
          candidates_evaluated: number
          created_at: string
          id: string
          jobs_created: number
          organization_id: string
          period_end: string
          period_start: string
          updated_at: string
        }
        Insert: {
          api_calls?: number
          candidates_evaluated?: number
          created_at?: string
          id?: string
          jobs_created?: number
          organization_id: string
          period_end: string
          period_start: string
          updated_at?: string
        }
        Update: {
          api_calls?: number
          candidates_evaluated?: number
          created_at?: string
          id?: string
          jobs_created?: number
          organization_id?: string
          period_end?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          max_candidates_per_job: number
          max_jobs: number
          name: string
          slug: string
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          max_candidates_per_job?: number
          max_jobs?: number
          name: string
          slug: string
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          max_candidates_per_job?: number
          max_jobs?: number
          name?: string
          slug?: string
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_private: {
        Row: {
          created_at: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          linkedin_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          endpoint: string | null
          event_type: string
          id: string
          ip_hash: string | null
          request_id: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          endpoint?: string | null
          event_type: string
          id?: string
          ip_hash?: string | null
          request_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          endpoint?: string | null
          event_type?: string
          id?: string
          ip_hash?: string | null
          request_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          analyses_limit: number
          analyses_used: number
          created_at: string
          id: string
          period_end: string
          period_start: string
          product_type: string
          rewrites_limit: number
          rewrites_used: number
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analyses_limit?: number
          analyses_used?: number
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          product_type?: string
          rewrites_limit?: number
          rewrites_used?: number
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analyses_limit?: number
          analyses_used?: number
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          product_type?: string
          rewrites_limit?: number
          rewrites_used?: number
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_security_records: { Args: never; Returns: undefined }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      candidate_status:
        | "pending"
        | "analyzed"
        | "shortlisted"
        | "rejected"
        | "hired"
      job_status: "draft" | "active" | "paused" | "closed"
      org_role: "owner" | "admin" | "recruiter" | "viewer"
      recommendation_type:
        | "strongly_recommend"
        | "recommend"
        | "maybe"
        | "not_recommend"
      work_model: "remote" | "hybrid" | "onsite"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      candidate_status: [
        "pending",
        "analyzed",
        "shortlisted",
        "rejected",
        "hired",
      ],
      job_status: ["draft", "active", "paused", "closed"],
      org_role: ["owner", "admin", "recruiter", "viewer"],
      recommendation_type: [
        "strongly_recommend",
        "recommend",
        "maybe",
        "not_recommend",
      ],
      work_model: ["remote", "hybrid", "onsite"],
    },
  },
} as const
