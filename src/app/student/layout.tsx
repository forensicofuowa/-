import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["student", "instructor", "admin", "super_admin"]);

  return (
    <DashboardShell
      profile={profile}
      navItems={[
        { href: "/student/dashboard", label: "الرئيسية والتبليغات", icon: "dashboard" },
        { href: "/student/lectures", label: "مكتبة المحاضرات", icon: "lectures" },
        { href: "/student/schedule", label: "الجدول والامتحانات", icon: "schedule" },
        { href: "/student/timer", label: "مؤقت الدراسة والتركيز", icon: "timer" },
        { href: "/student/summary", label: "ملف إنجازي", icon: "summary" },
        { href: "/student/favorites", label: "المفضلة", icon: "favorites" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
