-- Add missing UPDATE policy for analysis_history table
CREATE POLICY "Users can update their own history" 
ON public.analysis_history 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);