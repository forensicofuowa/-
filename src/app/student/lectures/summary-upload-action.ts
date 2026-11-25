"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
  "zip",
  "jpg",
  "jpeg",
  "png",
]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-؀-ۿ]/g, "_");
}

export async function uploadStudentSummaryAction(
  lectureId: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    const profile = await requireRole(["student", "instructor", "admin", "super_admin"]);
    const admin = createAdminClient();

    // Verify permission directly from profiles table
    const { data: dbProfile } = await admin
      .from("profiles")
      .select("id, role, status, can_upload_summaries, full_name")
      .eq("id", profile.id)
      .maybeSingle();

    const isPrivileged =
      dbProfile?.role === "admin" ||
      dbProfile?.role === "super_admin" ||
      dbProfile?.role === "instructor";

    const canStudentUpload =
      dbProfile?.role === "student" &&
      dbProfile?.status === "active" &&
      Boolean(dbProfile?.can_upload_summaries);

    if (!isPrivileged && !canStudentUpload) {
      return {
        ok: false,
        error: "ليس لديك صلاحية رفع ملخصات. اطلب من الإدارة تفعيل الصلاحية لحسابك.",
      };
    }

    const title = String(formData.get("title") ?? "").trim();
    const fileEntry = formData.get("file");

    if (!lectureId) {
      return { ok: false, error: "معرّف المحاضرة غير صالح." };
    }

    if (!(fileEntry instanceof File) || fileEntry.size === 0) {
      return { ok: false, error: "يرجى اختيار ملف صالح للرفع." };
    }

    const maxMb = Number(process.env.MAX_UPLOAD_MB || "25");
    if (fileEntry.size > maxMb * 1024 * 1024) {
      return {
        ok: false,
        error: `حجم الملف يتجاوز الحد الأقصى المسموح (${maxMb} ميجابايت).`,
      };
    }

    const ext = fileEntry.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return {
        ok: false,
        error: "صيغة الملف غير مدعومة. الصيغ المسموحة: PDF, Word, PowerPoint, صور, أو ZIP.",
      };
    }

    const safeName = sanitizeFileName(fileEntry.name);
    const storagePath = `student-summaries/${lectureId}/${Date.now()}_${safeName}`;
    const arrayBuffer = await fileEntry.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Try primary bucket 'lectures' or fallback 'lecture-files'
    let usedBucket = "lectures";
    let uploadErr = (
      await admin.storage.from(usedBucket).upload(storagePath, fileBuffer, {
        contentType: fileEntry.type || "application/octet-stream",
        upsert: false,
      })
    ).error;

    if (uploadErr) {
      usedBucket = "lecture-files";
      uploadErr = (
        await admin.storage.from(usedBucket).upload(storagePath, fileBuffer, {
          contentType: fileEntry.type || "application/octet-stream",
          upsert: false,
        })
      ).error;
    }

    if (uploadErr) {
      return { ok: false, error: `تعذّر رفع الملف إلى التخزين: ${uploadErr.message}` };
    }

    const { data: pubData } = admin.storage.from(usedBucket).getPublicUrl(storagePath);
    const displayTitle = title || `ملخص الطالب: ${fileEntry.name}`;

    const { error: insertError } = await admin.from("lecture_files").insert({
      lecture_id: lectureId,
      title: displayTitle,
      file_name: fileEntry.name,
      file_path: storagePath,
      file_url: pubData?.publicUrl ?? storagePath,
      file_size: fileEntry.size,
      mime_type: fileEntry.type || "application/octet-stream",
      category: "summary",
      uploaded_by: profile.id,
      uploaded_by_role: dbProfile?.role ?? "student",
    });

    if (insertError) {
      return { ok: false, error: `تعذّر حفظ بيانات الملف: ${insertError.message}` };
    }

    await admin.from("activity_logs").insert({
      actor_id: profile.id,
      action: "student_uploaded_summary",
      details: `${dbProfile?.full_name || "طالب"} رفع ملخص (${displayTitle}) للمحاضرة ${lectureId}`,
    });

    revalidatePath(`/student/lectures/${lectureId}`);
    revalidatePath("/student/lectures");
    revalidatePath("/admin/lectures");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء رفع الملخص.";
    return { ok: false, error: msg };
  }
}

export async function deleteStudentSummaryAction(
  fileId: string,
  lectureId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const profile = await requireRole(["student", "instructor", "admin", "super_admin"]);
    const admin = createAdminClient();

    const { data: fileRow } = await admin
      .from("lecture_files")
      .select("id, uploaded_by, file_path")
      .eq("id", fileId)
      .maybeSingle();

    if (!fileRow) {
      return { ok: false, error: "الملف غير موجود." };
    }

    const { data: dbProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", profile.id)
      .maybeSingle();

    const isAdmin = dbProfile?.role === "admin" || dbProfile?.role === "super_admin";
    if (!isAdmin && fileRow.uploaded_by !== profile.id) {
      return { ok: false, error: "لا تملك صلاحية حذف هذا الملف." };
    }

    if (fileRow.file_path) {
      await admin.storage.from("lectures").remove([fileRow.file_path]);
      await admin.storage.from("lecture-files").remove([fileRow.file_path]);
    }

    const { error } = await admin.from("lecture_files").delete().eq("id", fileId);
    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath(`/student/lectures/${lectureId}`);
    revalidatePath("/admin/lectures");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "تعذّر حذف الملف.";
    return { ok: false, error: msg };
  }
}
