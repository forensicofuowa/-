"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function toggleFavoriteAction(formData: FormData) {
  const student = await requireRole(["student", "instructor", "admin", "super_admin"]);
  const lectureId = String(formData.get("lectureId") ?? "");
  if (!lectureId) return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("favorites")
    .select("lecture_id")
    .eq("student_id", student.id)
    .eq("lecture_id", lectureId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("favorites")
      .delete()
      .eq("student_id", student.id)
      .eq("lecture_id", lectureId);
  } else {
    await supabase.from("favorites").insert({
      student_id: student.id,
      lecture_id: lectureId,
    });
  }

  revalidatePath(`/student/lectures/${lectureId}`);
  revalidatePath("/student/favorites");
  revalidatePath("/student/summary");
}

export async function toggleLectureCompletedAction(formData: FormData) {
  const student = await requireRole(["student", "instructor", "admin", "super_admin"]);
  const lectureId = String(formData.get("lectureId") ?? "");
  if (!lectureId) return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("student_lecture_views")
    .select("is_completed")
    .eq("student_id", student.id)
    .eq("lecture_id", lectureId)
    .maybeSingle();

  const nextCompleted = !existing?.is_completed;
  await supabase.from("student_lecture_views").upsert(
    {
      student_id: student.id,
      lecture_id: lectureId,
      is_completed: nextCompleted,
      last_viewed_at: new Date().toISOString(),
    },
    { onConflict: "student_id,lecture_id" }
  );

  revalidatePath(`/student/lectures/${lectureId}`);
  revalidatePath("/student/summary");
}

export async function recordStudySessionAction(input: {
  subjectId: string | null;
  durationMinutes: number;
}) {
  const student = await requireRole(["student", "instructor", "admin", "super_admin"]);
  const mins = Math.max(1, Math.min(300, Math.floor(input.durationMinutes)));

  const supabase = await createClient();
  await supabase.from("study_sessions").insert({
    student_id: student.id,
    subject_id: input.subjectId || null,
    duration_minutes: mins,
  });

  revalidatePath("/student/timer");
  revalidatePath("/student/summary");
}
