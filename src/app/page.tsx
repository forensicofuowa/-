import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/pending-approval");
  }

  if (profile.status === "pending") {
    redirect("/pending-approval");
  }

  if (profile.status === "disabled") {
    redirect("/account-disabled");
  }

  if (profile.role === "admin" || profile.role === "super_admin") {
    redirect("/admin/dashboard");
  }

  if (profile.role === "instructor") {
    redirect("/instructor/dashboard");
  }

  redirect("/student/lectures");
}