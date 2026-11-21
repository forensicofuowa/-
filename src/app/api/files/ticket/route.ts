import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth";
import { checkFileName, MIME_BY_EXTENSION } from "@/lib/files/signatures";
import { createClient } from "@/lib/supabase/server";

const ticketSchema = z.object({
  lectureId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  size: z.number().int().positive(),
  category: z.enum(["theory", "practical"]).optional().default("theory"),
});

export async function POST(request: Request) {
  try {
    const profile = await getSessionProfile();
    if (!profile || profile.status !== "active" || !["instructor", "admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "غير مصرح لك برفع الملفات." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ticketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات الملف غير صالحة." }, { status: 400 });
    }

    const { lectureId, fileName, size, category } = parsed.data;
    const maxMb = Number(process.env.MAX_UPLOAD_MB || 50);
    if (size > maxMb * 1024 * 1024) {
      return NextResponse.json({ error: `حجم الملف يتجاوز الحد المسموح (${maxMb} م.ب).` }, { status: 413 });
    }

    const nameCheck = checkFileName(fileName);
    if (!nameCheck.ok) {
      return NextResponse.json({ error: nameCheck.error }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: lecture } = await supabase
      .from("lectures")
      .select("id, department_id, subject_id, uploader_id, status")
      .eq("id", lectureId)
      .maybeSingle();

    if (!lecture) {
      return NextResponse.json({ error: "المحاضرة غير موجودة أو لا تملك صلاحية تعديلها." }, { status: 404 });
    }
    if (profile.role === "instructor" && lecture.uploader_id !== profile.id) {
      return NextResponse.json({ error: "يمكنك رفع الملفات لمحاضراتك فقط." }, { status: 403 });
    }

    const storagePath = `${lecture.department_id}/${lecture.subject_id}/${lecture.id}/${randomUUID()}.${nameCheck.ext}`;
    const mimeType = MIME_BY_EXTENSION[nameCheck.ext];

    const { data: row, error: insertError } = await supabase
      .from("lecture_files")
      .insert({
        lecture_id: lecture.id,
        storage_path: storagePath,
        original_name: fileName.trim().split(/[\\/]/).pop() ?? fileName,
        ext: nameCheck.ext,
        mime_type: mimeType,
        size_bytes: size,
        category,
        status: "pending",
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (insertError || !row) {
      return NextResponse.json(
        { error: "تعذّر إنشاء سجل الملف. تأكد من تنفيذ ملف التحديث 0004_features_upgrade.sql في Supabase." },
        { status: 500 }
      );
    }

    const { data: signed, error: signError } = await supabase.storage
      .from("lectures")
      .createSignedUploadUrl(storagePath);

    if (signError || !signed) {
      await supabase.from("lecture_files").delete().eq("id", row.id);
      return NextResponse.json(
        { error: "فشل إنشاء رابط الرفع. تأكد من تنفيذ ملف 0003_storage.sql في Supabase." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      fileId: row.id,
      signedUrl: signed.signedUrl,
      token: signed.token,
      path: storagePath,
      mimeType,
    });
  } catch (err) {
    console.error("[ticket] error:", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء تجهيز الرفع." }, { status: 500 });
  }
}
