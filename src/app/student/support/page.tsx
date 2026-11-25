import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function StudentSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const profile = await requireRole(["student", "instructor", "admin", "super_admin"]);
  const sp = await searchParams;

  async function sendSupportMessageAction(formData: FormData) {
    "use server";
    const currentUser = await requireRole(["student", "instructor", "admin", "super_admin"]);
    const subject = String(formData.get("subject") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    if (!subject || !message) return;

    const supabase = await createClient();
    const { error } = await supabase.from("support_messages").insert({
      user_id: currentUser.id,
      full_name: currentUser.full_name || "مستخدم",
      email: currentUser.email || "",
      subject,
      message,
      status: "open",
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/student/support");
    redirect("/student/support?sent=1");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">تواصل مع الإدارة</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          أرسل استفسارك أو ملاحظتك أو بلاغك مباشرة إلى إدارة المنصة.
        </p>
      </div>

      {sp?.sent === "1" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
          تم إرسال رسالتك بنجاح إلى الإدارة.
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">نموذج مراسلة الإدارة</h2>
        </CardHeader>
        <CardContent>
          <form action={sendSupportMessageAction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
                <span className="text-slate-400 block">الاسم الكامل</span>
                <span className="font-semibold">{profile.full_name || "مستخدم"}</span>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
                <span className="text-slate-400 block">البريد الإلكتروني</span>
                <span className="font-semibold" dir="ltr">
                  {profile.email || "—"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                عنوان الرسالة / الموضوع
              </label>
              <input
                type="text"
                name="subject"
                required
                placeholder="مثال: مشكلة في فتح محاضرة أو طلب تفعيل صلاحية"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                تفاصيل الرسالة
              </label>
              <textarea
                name="message"
                required
                rows={5}
                placeholder="اكتب التفاصيل بوضوح..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <Button type="submit">إرسال الرسالة</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
