
-- =============================================
-- B2B MULTI-TENANT BACKEND FOR CV SCREENING
-- =============================================

-- 1. Create enum for organization roles
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'recruiter', 'viewer');

-- 2. Create enum for job status
CREATE TYPE public.job_status AS ENUM ('draft', 'active', 'paused', 'closed');

-- 3. Create enum for candidate status
CREATE TYPE public.candidate_status AS ENUM ('pending', 'analyzed', 'shortlisted', 'rejected', 'hired');

-- 4. Create enum for recommendation
CREATE TYPE public.recommendation_type AS ENUM ('strongly_recommend', 'recommend', 'maybe', 'not_recommend');

-- 5. Create enum for work model
CREATE TYPE public.work_model AS ENUM ('remote', 'hybrid', 'onsite');

-- =============================================
-- TABLE: organizations
-- =============================================
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
    max_jobs INTEGER NOT NULL DEFAULT 3,
    max_candidates_per_job INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: organization_members
-- =============================================
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role org_role NOT NULL DEFAULT 'viewer',
    invited_by UUID,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: job_posts
-- =============================================
CREATE TABLE public.job_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT[],
    location TEXT,
    work_model work_model DEFAULT 'onsite',
    salary_range TEXT,
    status job_status NOT NULL DEFAULT 'draft',
    ai_summary JSONB,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_job_posts_updated_at
    BEFORE UPDATE ON public.job_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Index for organization queries
CREATE INDEX idx_job_posts_organization ON public.job_posts(organization_id);
CREATE INDEX idx_job_posts_status ON public.job_posts(status);

-- =============================================
-- TABLE: candidates
-- =============================================
CREATE TABLE public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_post_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    phone TEXT,
    original_filename TEXT NOT NULL,
    resume_text TEXT,
    resume_storage_path TEXT,
    ai_summary JSONB,
    status candidate_status NOT NULL DEFAULT 'pending',
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON public.candidates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_candidates_job_post ON public.candidates(job_post_id);
CREATE INDEX idx_candidates_organization ON public.candidates(organization_id);
CREATE INDEX idx_candidates_status ON public.candidates(status);

-- =============================================
-- TABLE: candidate_evaluations
-- =============================================
CREATE TABLE public.candidate_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_post_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    fit_score INTEGER NOT NULL CHECK (fit_score >= 0 AND fit_score <= 100),
    ranking_position INTEGER,
    summary TEXT NOT NULL,
    strengths TEXT[],
    weaknesses TEXT[],
    recommendation recommendation_type NOT NULL,
    detailed_analysis JSONB,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_evaluations_candidate ON public.candidate_evaluations(candidate_id);
CREATE INDEX idx_evaluations_job_post ON public.candidate_evaluations(job_post_id);
CREATE INDEX idx_evaluations_organization ON public.candidate_evaluations(organization_id);
CREATE INDEX idx_evaluations_fit_score ON public.candidate_evaluations(fit_score DESC);

-- =============================================
-- TABLE: organization_usage
-- =============================================
CREATE TABLE public.organization_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    jobs_created INTEGER NOT NULL DEFAULT 0,
    candidates_evaluated INTEGER NOT NULL DEFAULT 0,
    api_calls INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_usage ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_organization_usage_updated_at
    BEFORE UPDATE ON public.organization_usage
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX idx_org_usage_organization ON public.organization_usage(organization_id);
CREATE INDEX idx_org_usage_period ON public.organization_usage(period_start, period_end);

-- =============================================
-- SECURITY DEFINER FUNCTIONS (to avoid RLS recursion)
-- =============================================

-- Function to check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE user_id = _user_id
          AND organization_id = _org_id
    )
$$;

-- Function to check if user has specific role in organization
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _role org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE user_id = _user_id
          AND organization_id = _org_id
          AND role = _role
    )
$$;

-- Function to check if user is admin or owner of organization
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE user_id = _user_id
          AND organization_id = _org_id
          AND role IN ('owner', 'admin')
    )
$$;

-- Function to get user's organization IDs
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = _user_id
$$;

-- =============================================
-- RLS POLICIES: organizations
-- =============================================

-- Members can view their organization
CREATE POLICY "Members can view their organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), id));

-- Only owners can update organization
CREATE POLICY "Owners can update organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.has_org_role(auth.uid(), id, 'owner'));

-- Authenticated users can create organizations (they become owner)
CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only owners can delete organization
CREATE POLICY "Owners can delete organization"
ON public.organizations
FOR DELETE
TO authenticated
USING (public.has_org_role(auth.uid(), id, 'owner'));

-- =============================================
-- RLS POLICIES: organization_members
-- =============================================

-- Members can view other members in their org
CREATE POLICY "Members can view org members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));

-- Admins/owners can add members
CREATE POLICY "Admins can add members"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_org_admin(auth.uid(), organization_id)
    OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = organization_members.organization_id)
);

-- Admins/owners can update members (except owner role changes)
CREATE POLICY "Admins can update members"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id));

-- Owners can remove members, users can leave
CREATE POLICY "Owners can remove or users can leave"
ON public.organization_members
FOR DELETE
TO authenticated
USING (
    public.has_org_role(auth.uid(), organization_id, 'owner')
    OR user_id = auth.uid()
);

-- =============================================
-- RLS POLICIES: job_posts
-- =============================================

-- Members can view jobs in their org
CREATE POLICY "Members can view org jobs"
ON public.job_posts
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));

-- Recruiters, admins, owners can create jobs
CREATE POLICY "Recruiters can create jobs"
ON public.job_posts
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND created_by = auth.uid()
);

-- Recruiters, admins, owners can update jobs
CREATE POLICY "Recruiters can update jobs"
ON public.job_posts
FOR UPDATE
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));

-- Admins/owners can delete jobs
CREATE POLICY "Admins can delete jobs"
ON public.job_posts
FOR DELETE
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id));

-- =============================================
-- RLS POLICIES: candidates
-- =============================================

-- Members can view candidates in their org
CREATE POLICY "Members can view org candidates"
ON public.candidates
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));

-- Recruiters can add candidates
CREATE POLICY "Recruiters can add candidates"
ON public.candidates
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND uploaded_by = auth.uid()
);

-- Recruiters can update candidates
CREATE POLICY "Recruiters can update candidates"
ON public.candidates
FOR UPDATE
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));

-- Admins can delete candidates
CREATE POLICY "Admins can delete candidates"
ON public.candidates
FOR DELETE
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id));

-- =============================================
-- RLS POLICIES: candidate_evaluations
-- =============================================

-- Members can view evaluations in their org
CREATE POLICY "Members can view org evaluations"
ON public.candidate_evaluations
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));

-- Service role inserts evaluations (via edge function)
CREATE POLICY "Service role can insert evaluations"
ON public.candidate_evaluations
FOR INSERT
TO authenticated
WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- No update/delete for evaluations (immutable audit trail)
CREATE POLICY "No update evaluations"
ON public.candidate_evaluations
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No delete evaluations"
ON public.candidate_evaluations
FOR DELETE
TO authenticated
USING (false);

-- =============================================
-- RLS POLICIES: organization_usage
-- =============================================

-- Admins can view usage
CREATE POLICY "Admins can view usage"
ON public.organization_usage
FOR SELECT
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id));

-- Service role manages usage (no direct user access)
CREATE POLICY "No direct insert usage"
ON public.organization_usage
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No direct update usage"
ON public.organization_usage
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No direct delete usage"
ON public.organization_usage
FOR DELETE
TO authenticated
USING (false);

-- =============================================
-- STORAGE BUCKET: candidate-resumes
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'candidate-resumes',
    'candidate-resumes',
    false,
    10485760, -- 10MB
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
);

-- Storage policies for candidate-resumes bucket
CREATE POLICY "Org members can upload resumes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'candidate-resumes'
    AND public.is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Org members can view resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'candidate-resumes'
    AND public.is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Org admins can delete resumes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'candidate-resumes'
    AND public.is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);
