import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";

export default async function HomePage() {
  const profile = await getSessionProfile();

  if (!profile) redirect("/login");
  if (profile.status === "pending") redirect("/pending-approval");
  if (profile.status === "disabled") redirect("/account-disabled");

  if (profile.role === "admin" || profile.role === "super_admin") {
    redirect("/admin/dashboard");
  }
  if (profile.role === "instructor") {
    redirect("/instructor/dashboard");
  }
  redirect("/student/dashboard");
}
