import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["admin", "super_admin"]);

  return (
    <DashboardShell
      profile={profile}
      navItems={[
        { href: "/admin/dashboard", label: "لوحة التحكم", icon: "dashboard" },
        { href: "/admin/users", label: "المستخدمون وطلبات التسجيل", icon: "users" },
        { href: "/admin/academic", label: "المراحل والمواد والسنوات", icon: "academic" },
        { href: "/admin/lectures", label: "إدارة المحاضرات", icon: "lectures" },
        { href: "/admin/schedule", label: "الجداول والامتحانات", icon: "schedule" },
        { href: "/admin/announcements", label: "الإعلانات والتبليغات", icon: "announcements" },
        { href: "/admin/activity", label: "سجل النشاطات", icon: "activity" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
