-- Create cv_rewrites table for storing rewritten CVs
CREATE TABLE public.cv_rewrites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_description_text TEXT,
  target_role TEXT,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  original_cv_text TEXT NOT NULL,
  rewrite_content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cv_rewrites ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own rewrites" 
ON public.cv_rewrites 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rewrites" 
ON public.cv_rewrites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rewrites" 
ON public.cv_rewrites 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create credit_transactions table for tracking credit usage
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('consume', 'grant', 'purchase')),
  amount INTEGER NOT NULL,
  feature TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own transactions" 
ON public.credit_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.credit_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_cv_rewrites_user_id ON public.cv_rewrites(user_id);
CREATE INDEX idx_cv_rewrites_created_at ON public.cv_rewrites(created_at DESC);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_feature ON public.credit_transactions(feature);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);