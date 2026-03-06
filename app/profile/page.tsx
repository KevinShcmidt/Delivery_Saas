/**
 * app/profile/page.tsx
 * Server Component — charge le profil et vérifie le rôle admin
 */

import { redirect }        from "next/navigation";
import { createSsrClient } from "@/lib/supabase.ssr";
import { getProfileById }  from "@/modules/profile/queries/profile.queries";
import ProfileClient       from "@/modules/profile/components/ProfileClient";

export const metadata = { title: "Mon profil | FleetOps" };

export default async function ProfilePage() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfileById(user.id);
  if (!profile)            redirect("/login?error=profile_not_found");
  if (profile.role !== "admin") redirect("/dashboard");

  return <ProfileClient profile={profile} />;
}