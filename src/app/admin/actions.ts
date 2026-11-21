"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { getSessionProfile, requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function updateUserAccountAction(formData: FormData) {
  const admin = await requireRole(["admin", "super_admin"]);
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  const role = String(formData.get("role") ?? "");

  const supabase = await createClient();
  const patch: Record<string, string> = {};
  if (["active", "pending", "disabled"].includes(status)) patch.status = status;
  if (["student", "instructor", "admin"].includes(role)) patch.role = role;

  if (userId && Object.keys(patch).length > 0) {
    const { data: updatedUser } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .select("full_name, email")
      .maybeSingle();

    await logActivity({
      actorId: admin.id,
      action: "user.updated",
      entityType: "profile",
      entityId: userId,
      metadata: {
        targetUser: updatedUser?.full_name ?? updatedUser?.email ?? userId,
        ...patch,
      },
    });
  }
  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/activity");
}

export async function bulkUpdateUsersAction(formData: FormData) {
  const admin = await requireRole(["admin", "super_admin"]);
  const rawIds = String(formData.get("userIds") ?? "[]");
  const bulkStatus = String(formData.get("bulkStatus") ?? "");
  const bulkRole = String(formData.get("bulkRole") ?? "");

  let userIds: string[] = [];
  try {
    const parsed = JSON.parse(rawIds);
    if (Array.isArray(parsed)) userIds = parsed.filter((x) => typeof x === "string");
  } catch {
    return;
  }

  const patch: Record<string, string> = {};
  if (["active", "pending", "disabled"].includes(bulkStatus)) patch.status = bulkStatus;
  if (["student", "instructor", "admin"].includes(bulkRole)) patch.role = bulkRole;

  if (userIds.length === 0 || Object.keys(patch).length === 0) return;

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update(patch)
    .in("id", userIds)
    .neq("role", "super_admin");

  await logActivity({
    actorId: admin.id,
    action: "user.bulk_updated",
    entityType: "profile",
    metadata: { count: userIds.length, ...patch },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/activity");
}

export async function createStageAction(formData: FormData) {
  const admin = await requireRole(["admin", "super_admin"]);
  const name = String(formData.get("name") ?? "").trim();
  const levelNumber = Number(formData.get("levelNumber") ?? 1);
  if (!name) return;

  const supabase = await createClient();
  let deptId = admin.department_id;
  if (!deptId) {
    const { data: dept } = await supabase.from("departments").select("id").limit(1).maybeSingle();
    deptId = dept?.id ?? null;
  }
  if (!deptId) return;

  await supabase.from("stages").insert({
    department_id: deptId,
    name,
    level_number: levelNumber,
  });
  revalidatePath("/admin/academic");
}

export async function updateStageAction(formData: FormData) {
  await requireRole(["admin", "super_admin"]);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const levelNumber = Number(formData.get("levelNumber") ?? 1);
  if (!id || !name) return;

  const supabase = await createClient();
  await supabase.from("stages").update({ name, level_number: levelNumber }).eq("id", id);
  revalidatePath("/admin/academic");
}

export async function deleteStageAction(formData: FormData) {
  await requireRole(["admin", "super_admin"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("stages").delete().eq("id", id);
  revalidatePath("/admin/academic");
}

export async function createSubjectAction(formData: FormData) {
  const admin = await requireRole(["admin", "super_admin"]);
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const stageId = String(formData.get("stageId") ?? "");
  if (!name || !stageId) return;

  const supabase = await createClient();
  let deptId = admin.department_id;
  if (!deptId) {
    const { data: dept } = await supabase.from("departments").select("id").limit(1).maybeSingle();
    deptId = dept?.id ?? null;
  }
  if (!deptId) return;

  await supabase.from("subjects").insert({
    department_id: deptId,
    stage_id: stageId,
    name,
    code,
  });
  revalidatePath("/admin/academic");
  revalidatePath("/admin/lectures/new");
  revalidatePath("/admin/lectures/import");
}

export async function updateSubjectAction(formData: FormData) {
  await requireRole(["admin", "super_admin"]);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const stageId = String(formData.get("stageId") ?? "");
  if (!id || !name) return;

  const supabase = await createClient();
  const patch: Record<string, unknown> = { name, code };
  if (stageId) patch.stage_id = stageId;

  await supabase.from("subjects").update(patch).eq("id", id);
  revalidatePath("/admin/academic");
  revalidatePath("/admin/lectures");
  revalidatePath("/student/lectures");
}

export async function deleteSubjectAction(formData: FormData) {
  await requireRole(["admin", "super_admin"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("subjects").delete().eq("id", id);
  revalidatePath("/admin/academic");
  revalidatePath("/admin/lectures");
  revalidatePath("/student/lectures");
}

export async function assignInstructorSubjectAction(formData: FormData) {
  await requireRole(["admin", "super_admin"]);
  const instructorId = String(formData.get("instructorId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  if (!instructorId || !subjectId) return;

  const supabase = await createClient();
  await supabase
    .from("instructor_subjects")
    .upsert({ instructor_id: instructorId, subject_id: subjectId }, { onConflict: "instructor_id,subject_id" });
  revalidatePath("/admin/academic");
}

export async function createAcademicYearAction(formData: FormData) {
  const admin = await requireRole(["admin", "super_admin"]);
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;

  const supabase = await createClient();
  let orgId = admin.organization_id;
  if (!orgId) {
    const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
    orgId = org?.id ?? null;
  }
  if (!orgId) return;

  await supabase.from("academic_years").insert({
    organization_id: orgId,
    label,
    is_current: false,
  });
  revalidatePath("/admin/academic");
}

export async function deleteAcademicYearAction(formData: FormData) {
  await requireRole(["admin", "super_admin"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("academic_years").delete().eq("id", id);
  revalidatePath("/admin/academic");
}

export async function createScheduleEntryAction(formData: FormData) {
  const admin = await requireRole(["admin", "super_admin"]);
  const stageId = String(formData.get("stageId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "") || null;
  const entryType = String(formData.get("entryType") ?? "class");
  const title = String(formData.get("title") ?? "").trim();
  const dayOfWeek = String(formData.get("dayOfWeek") ?? "").trim() || null;
  const timeRange = String(formData.get("timeRange") ?? "").trim() || null;
  const roomOrHall = String(formData.get("roomOrHall") ?? "").trim() || null;
  const examDateRaw = String(formData.get("examDate") ?? "").trim();
  const examDate = examDateRaw ? new Date(examDateRaw).toISOString() : null;

  if (!stageId || !title) return;

  const supabase = await createClient();
  await supabase.from("stage_schedules").insert({
    stage_id: stageId,
    subject_id: subjectId,
    entry_type: entryType === "exam" ? "exam" : "class",
    title,
    day_of_week: dayOfWeek,
    time_range: timeRange,
    room_or_hall: roomOrHall,
    exam_date: examDate,
  });

  await logActivity({
    actorId: admin.id,
    action: "schedule.created",
    entityType: "stage_schedule",
    metadata: { title, entryType },
  });

  revalidatePath("/admin/schedule");
  revalidatePath("/admin/activity");
  revalidatePath("/student/schedule");
}

export async function deleteScheduleEntryAction(formData: FormData) {
  const admin = await requireRole(["admin", "super_admin"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("stage_schedules").delete().eq("id", id);

  await logActivity({
    actorId: admin.id,
    action: "schedule.deleted",
    entityType: "stage_schedule",
    entityId: id,
  });

  revalidatePath("/admin/schedule");
  revalidatePath("/admin/activity");
  revalidatePath("/student/schedule");
}

export async function createAnnouncementAction(formData: FormData) {
  const admin = await requireRole(["admin", "super_admin"]);
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const stageId = String(formData.get("stageId") ?? "") || null;
  const isPinned = formData.get("isPinned") === "on";
  if (!title || !body) return;

  const supabase = await createClient();
  await supabase.from("announcements").insert({
    department_id: admin.department_id,
    stage_id: stageId,
    author_id: admin.id,
    title,
    body,
    is_pinned: isPinned,
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/student/dashboard");
}

export async function deleteAnnouncementAction(formData: FormData) {
  await requireRole(["admin", "super_admin"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id);
  revalidatePath("/admin/announcements");
  revalidatePath("/student/dashboard");
}
export async function permanentlyDeleteUserAction(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const actor = await getSessionProfile();
  if (!actor || actor.status !== "active" || !["admin", "super_admin"].includes(actor.role)) {
    return { ok: false, error: "غير مصرح لك بتنفيذ الحذف النهائي." };
  }
  if (!userId || userId === actor.id) {
    return { ok: false, error: "لا يمكنك حذف حسابك الحالي نهائياً." };
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (!target) {
    return { ok: false, error: "المستخدم غير موجود." };
  }
  if (target.role === "super_admin" && actor.role !== "super_admin") {
    return { ok: false, error: "لا يمكنك حذف حساب مدير عام." };
  }

  // Delete profile row first, then auth user so email/account can register fresh again
  const { error: profileErr } = await admin.from("profiles").delete().eq("id", userId);
  if (profileErr) {
    return { ok: false, error: `تعذّر حذف ملف المستخدم: ${profileErr.message}` };
  }

  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) {
    return { ok: false, error: `تم حذف الملف ولكن تعذّر حذف حساب الدخول: ${authErr.message}` };
  }

  await logActivity({
    actorId: actor.id,
    action: "user.deleted",
    entityType: "profile",
    entityId: userId,
    metadata: { fullName: target.full_name, email: target.email, role: target.role },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/activity");
  return { ok: true };
}

export async function bulkPermanentlyDeleteUsersAction(
  userIds: string[]
): Promise<{ ok: boolean; deletedCount?: number; error?: string }> {
  const actor = await getSessionProfile();
  if (!actor || actor.status !== "active" || !["admin", "super_admin"].includes(actor.role)) {
    return { ok: false, error: "غير مصرح لك بتنفيذ الحذف النهائي." };
  }

  const cleanIds = Array.from(new Set((userIds ?? []).filter((id) => id && id !== actor.id)));
  if (cleanIds.length === 0) {
    return { ok: false, error: "لم يتم تحديد مستخدمين صالحين للحذف." };
  }

  const admin = createAdminClient();
  const { data: targets } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .in("id", cleanIds);

  let deletedCount = 0;
  for (const t of targets ?? []) {
    if (t.role === "super_admin" && actor.role !== "super_admin") continue;
    const { error: pErr } = await admin.from("profiles").delete().eq("id", t.id);
    if (pErr) continue;
    const { error: aErr } = await admin.auth.admin.deleteUser(t.id);
    if (!aErr) deletedCount++;
  }

  await logActivity({
    actorId: actor.id,
    action: "user.deleted",
    entityType: "profile",
    entityId: actor.id,
    metadata: { bulkDeletedCount: deletedCount, requestedIds: cleanIds },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/activity");
  return { ok: true, deletedCount };
}
