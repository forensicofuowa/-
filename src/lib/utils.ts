import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 بايت";
  const units = ["بايت", "ك.ب", "م.ب", "ج.ب"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, idx);
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("ar-IQ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("ar-IQ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    super_admin: "المشرف العام",
    admin: "مدير النظام",
    instructor: "تدريسي",
    student: "طالب",
  };
  return map[role] ?? role;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "مفعّل",
    pending: "قيد المراجعة",
    disabled: "معطّل",
    draft: "مسودة",
    published: "منشورة",
    archived: "مؤرشفة",
  };
  return map[status] ?? status;
}

export function fileCategoryLabel(cat?: string): string {
  return cat === "practical" ? "عملي" : "نظري";
}

export function semesterLabel(sem?: number): string {
  return sem === 2 ? "الفصل الثاني" : "الفصل الأول";
}

export function activityActionLabel(action: string): string {
  const map: Record<string, string> = {
    "lecture.created": "إضافة محاضرة جديدة",
    "lecture.email_notified": "إرسال إشعار بريدي للطلبة",
    "lecture.updated": "تعديل بيانات محاضرة",
    "lecture.deleted": "حذف محاضرة",
    "lecture.batch_imported": "استيراد مجموعة محاضرات",
    "lecture.file_added": "رفع مرفق لمحاضرة",
    "lecture.file_deleted": "حذف مرفق من محاضرة",
    "lecture.file_category_updated": "تغيير تصنيف مرفق (نظري/عملي)",
    "user.updated": "تعديل حالة أو صلاحية حساب",
    "user.bulk_updated": "إجراء جماعي على حسابات المستخدمين",
    "schedule.created": "إضافة موعد جدول أو امتحان",
    "schedule.deleted": "حذف موعد من الجدول",
  };
  return map[action] ?? action;
}
