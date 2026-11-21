import { Clock } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Clock className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">حسابك بانتظار موافقة الإدارة</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          تم استلام طلب تسجيلك بنجاح. سيقوم مشرف القسم بمراجعة الطلب وتفعيل حسابك قريباً، وبعدها يمكنك الدخول وتصفح جميع المحاضرات.
        </p>
        <form action={signOutAction} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            العودة لصفحة تسجيل الدخول
          </Button>
        </form>
      </div>
    </div>
  );
}
