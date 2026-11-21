"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { purgeAllLecturesAction } from "@/app/lectures/actions";
import { Button } from "@/components/ui/button";

export function PurgeAllLecturesButton({ totalCount }: { totalCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePurge() {
    if (totalCount === 0) {
      alert("لا توجد محاضرات في النظام حالياً.");
      return;
    }

    const firstConfirm = confirm(
      `تحذير: سيتم حذف جميع المحاضرات (${totalCount} محاضرة) وجميع ملفاتها المرفقة نهائياً من النظام والتخزين للبدء من جديد.\n\nهل تريد المتابعة؟`
    );
    if (!firstConfirm) return;

    const typed = prompt('للتأكيد النهائي على مسح جميع المحاضرات، اكتب كلمة: مسح');
    if (typed?.trim() !== "مسح") {
      alert("تم إلغاء عملية التنظيف.");
      return;
    }

    setLoading(true);
    const res = await purgeAllLecturesAction();
    setLoading(false);

    if (!res.ok) {
      alert(res.error);
      return;
    }

    alert(`تم تنظيف النظام بنجاح: حذف ${res.deletedCount} محاضرة و ${res.deletedFilesCount} ملف مرفق.`);
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="danger"
      disabled={loading || totalCount === 0}
      onClick={handlePurge}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>جارٍ التنظيف...</span>
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4" />
          <span>تنظيف جميع المحاضرات</span>
        </>
      )}
    </Button>
  );
}
