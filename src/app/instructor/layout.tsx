import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["instructor", "admin", "super_admin"]);

  return (
    <DashboardShell
      profile={profile}
      navItems={[
        { href: "/instructor/dashboard", label: "لوحة التدريسي", icon: "dashboard" },
        { href: "/instructor/lectures", label: "محاضراتي", icon: "lectures" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
