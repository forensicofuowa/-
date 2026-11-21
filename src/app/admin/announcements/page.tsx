import { AnnouncementsFormAndList } from "@/components/admin/announcements-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const [{ data: announcements }, { data: stages }] = await Promise.all([
    supabase
      .from("announcements")
      .select("*, stages(name), profiles(full_name)")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("stages").select("*").order("level_number", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">الإعلانات والتبليغات</h1>
      <AnnouncementsFormAndList announcements={announcements ?? []} stages={stages ?? []} />
    </div>
  );
}
