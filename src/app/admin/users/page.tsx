import { UsersBulkManager } from "@/components/admin/users-bulk-manager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("*, stages(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إدارة المستخدمين وطلبات التسجيل</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          الموافقة الفردية أو الجماعية على حسابات الطلبة والتدريسيين وتعديل صلاحياتهم بسرعة
        </p>
      </div>

      <UsersBulkManager users={users ?? []} />
    </div>
  );
}
