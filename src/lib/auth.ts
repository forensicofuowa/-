import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (profile as Profile | null) ?? null;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.status === "pending") redirect("/pending-approval");
  if (profile.status === "disabled") redirect("/account-disabled");

  if (!allowedRoles.includes(profile.role)) {
    if (profile.role === "admin" || profile.role === "super_admin") redirect("/admin/dashboard");
    if (profile.role === "instructor") redirect("/instructor/dashboard");
    redirect("/student/dashboard");
  }

  return profile;
}
