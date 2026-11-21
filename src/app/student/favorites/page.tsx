import Link from "next/link";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudentFavoritesPage() {
  const profile = await requireRole(["student", "instructor", "admin", "super_admin"]);
  const supabase = await createClient();

  const { data: favs } = await supabase
    .from("favorites")
    .select("lectures(id, lecture_number, title, subjects(name))")
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false });

  const items = (favs ?? []).map((f: any) => f.lectures).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Heart className="h-6 w-6 text-red-500 fill-red-500" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">المحاضرات المحفوظة بالمفضلة</h1>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-slate-500">
            لم تقم بحفظ أي محاضرة بالمفضلة بعد.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((lec: any) => (
            <Link key={lec.id} href={`/student/lectures/${lec.id}`}>
              <Card className="hover:border-indigo-400 transition-all">
                <CardContent className="p-5">
                  <Badge tone="indigo">{lec.subjects?.name ?? "—"}</Badge>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 mt-2">
                    محاضرة {lec.lecture_number}: {lec.title}
                  </h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
