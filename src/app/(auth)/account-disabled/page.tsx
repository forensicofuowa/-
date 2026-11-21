import { ShieldAlert } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export default function AccountDisabledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">الحساب معطّل</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          تم تعطيل صلاحية الدخول لهذا الحساب من قبل إدارة النظام. يرجى التواصل مع مشرف القسم.
        </p>
        <form action={signOutAction} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            تسجيل الخروج
          </Button>
        </form>
      </div>
    </div>
  );
}
