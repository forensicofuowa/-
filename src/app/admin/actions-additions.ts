"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function adminUpdateUserPasswordAction(
  userId: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireRole(["admin", "super_admin"]);
    const trimmedPassword = newPassword.trim();

    if (!userId) {
      return { ok: false, error: "معرّف المستخدم غير صالح." };
    }
    if (trimmedPassword.length < 6) {
      return { ok: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." };
    }

    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      password: trimmedPassword,
    });

    if (authError) {
      return { ok: false, error: authError.message };
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        admin_password_note: trimmedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      return { ok: false, error: profileError.message };
    }

    await admin.from("activity_logs").insert({
      actor_id: actor.id,
      action: "admin_updated_user_password",
      details: `Updated password for user ${userId}`,
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/student-accounts");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
    return { ok: false, error: msg };
  }
}

export async function toggleStudentSummaryUploadAction(
  userId: string,
  canUpload: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireRole(["admin", "super_admin"]);

    if (!userId) {
      return { ok: false, error: "معرّف المستخدم غير صالح." };
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({
        can_upload_summaries: Boolean(canUpload),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await admin.from("activity_logs").insert({
      actor_id: actor.id,
      action: "toggle_student_summary_upload",
      details: `Set can_upload_summaries=${Boolean(canUpload)} for user ${userId}`,
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/student-accounts");
    revalidatePath("/student/lectures");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
    return { ok: false, error: msg };
  }
}
