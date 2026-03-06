/**
 * modules/profile/queries/profile.queries.ts
 */

import { createAdminClient } from "@/lib/supabase.server";

export interface ProfileData {
  id:         string;
  full_name:  string;
  email:      string;
  phone:      string | null;
  avatar_url: string | null;
  role:       string;
  is_active:  boolean;
  created_at: string;
  updated_at: string;
}

export async function getProfileById(userId: string): Promise<ProfileData | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) { console.error("[ProfileQuery]", error.message); return null; }
  return data;
}