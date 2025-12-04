import { supabase } from "@/integrations/supabase/client";

export interface HistoryItem {
  id: string;
  date: string;
  score: number;
  jobTitle: string;
  company?: string;
  summary: string;
  strengths?: string[];
  weaknesses?: string[];
  improvements?: string[];
  missingKeywords?: string[];
  isPremium: boolean;
}

const STORAGE_KEY = "resume-analysis-history";

// Local storage functions for non-authenticated users
export function getLocalHistory(): HistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveToLocalHistory(item: Omit<HistoryItem, "id" | "date">): HistoryItem {
  const history = getLocalHistory();
  const newItem: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };
  const updated = [newItem, ...history].slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newItem;
}

export function clearLocalHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

// Cloud storage functions for authenticated users
export async function getCloudHistory(userId: string): Promise<HistoryItem[]> {
  const { data, error } = await supabase
    .from("analysis_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map((item) => ({
    id: item.id,
    date: item.created_at,
    score: item.score,
    jobTitle: item.job_title,
    company: item.company || undefined,
    summary: item.summary,
    strengths: item.strengths || undefined,
    weaknesses: item.weaknesses || undefined,
    improvements: item.improvements || undefined,
    missingKeywords: item.missing_keywords || undefined,
    isPremium: item.is_premium,
  }));
}

export async function saveToCloudHistory(
  userId: string,
  item: Omit<HistoryItem, "id" | "date">
): Promise<HistoryItem | null> {
  const { data, error } = await supabase
    .from("analysis_history")
    .insert({
      user_id: userId,
      job_title: item.jobTitle,
      company: item.company || null,
      score: item.score,
      summary: item.summary,
      strengths: item.strengths || null,
      weaknesses: item.weaknesses || null,
      improvements: item.improvements || null,
      missing_keywords: item.missingKeywords || null,
      is_premium: item.isPremium,
    })
    .select()
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    date: data.created_at,
    score: data.score,
    jobTitle: data.job_title,
    company: data.company || undefined,
    summary: data.summary,
    strengths: data.strengths || undefined,
    weaknesses: data.weaknesses || undefined,
    improvements: data.improvements || undefined,
    missingKeywords: data.missing_keywords || undefined,
    isPremium: data.is_premium,
  };
}

export async function deleteFromCloudHistory(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("analysis_history")
    .delete()
    .eq("id", id);

  return !error;
}

export async function clearCloudHistory(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("analysis_history")
    .delete()
    .eq("user_id", userId);

  return !error;
}
