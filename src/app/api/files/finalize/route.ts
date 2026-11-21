import { NextResponse } from "next/server";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { getSessionProfile } from "@/lib/auth";
import { verifySignature, type AllowedExtension } from "@/lib/files/signatures";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const finalizeSchema = z.object({
  fileId: z.string().uuid(),
});

const ZIP_OFFICE_EXTS = new Set(["docx", "xlsx", "pptx"]);

async function inspectStoredFileFast(storagePath: string, ext: AllowedExtension) {
  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("lectures")
    .createSignedUrl(storagePath, 60);

  if (error || !signed?.signedUrl) {
    throw new Error("تعذّر الوصول للملف المرفوع على التخزين.");
  }

  const headRes = await fetch(signed.signedUrl, {
    headers: { Range: "bytes=0-8191" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });

  if (!headRes.ok && headRes.status !== 206) {
    throw new Error(`الملف غير موجود في التخزين (كود ${headRes.status}).`);
  }

  const head = new Uint8Array(await headRes.arrayBuffer());

  let totalSize = head.byteLength;
  const contentRange = headRes.headers.get("content-range");
  if (contentRange && contentRange.includes("/")) {
    const parsedSize = Number(contentRange.split("/")[1]);
    if (Number.isFinite(parsedSize) && parsedSize > 0) totalSize = parsedSize;
  } else {
    const cl = Number(headRes.headers.get("content-length"));
    if (Number.isFinite(cl) && cl > 0) totalSize = cl;
  }

  let tail: Uint8Array = head;
  if (ZIP_OFFICE_EXTS.has(ext) && totalSize > 8192) {
    const start = Math.max(0, totalSize - 65536);
    const tailRes = await fetch(signed.signedUrl, {
      headers: { Range: `bytes=${start}-${totalSize - 1}` },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (tailRes.ok || tailRes.status === 206) {
      tail = new Uint8Array(await tailRes.arrayBuffer());
    }
  }

  return { head, tail, size: totalSize };
}

export async function POST(request: Request) {
  try {
    const profile = await getSessionProfile();
    if (!profile || profile.status !== "active" || !["instructor", "admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "غير مصرح لك بهذه العملية." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = finalizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "معرّف الملف غير صالح." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: file } = await supabase
      .from("lecture_files")
      .select("id, lecture_id, storage_path, original_name, ext, category, status, created_by")
      .eq("id", parsed.data.fileId)
      .maybeSingle();

    if (!file || file.status !== "pending" || file.created_by !== profile.id) {
      return NextResponse.json({ error: "سجل الملف غير موجود أو تمت معالجته مسبقاً." }, { status: 404 });
    }

    const admin = createAdminClient();
    const cleanupAndReject = async (message: string, status = 400) => {
      await admin.storage.from("lectures").remove([file.storage_path]).catch(() => {});
      await admin.from("lecture_files").delete().eq("id", file.id);
      return NextResponse.json({ error: message }, { status });
    };

    let inspected;
    try {
      inspected = await inspectStoredFileFast(file.storage_path, file.ext as AllowedExtension);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "انتهت مهلة فحص الملف.";
      return cleanupAndReject(msg, 502);
    }

    const maxMb = Number(process.env.MAX_UPLOAD_MB || 50);
    if (inspected.size > maxMb * 1024 * 1024) {
      return cleanupAndReject(`حجم الملف الفعلي يتجاوز ${maxMb} م.ب.`, 413);
    }

    const check = verifySignature(file.ext as AllowedExtension, inspected.head, inspected.tail);
    if (!check.ok) {
      return cleanupAndReject(check.error, 400);
    }

    const { data: lastFile } = await admin
      .from("lecture_files")
      .select("sort_order")
      .eq("lecture_id", file.lecture_id)
      .eq("status", "ready")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: updated, error: updateErr } = await admin
      .from("lecture_files")
      .update({
        status: "ready",
        size_bytes: inspected.size,
        sort_order: (lastFile?.sort_order ?? -1) + 1,
        finalized_at: new Date().toISOString(),
      })
      .eq("id", file.id)
      .select("*")
      .single();

    if (updateErr || !updated) {
      return cleanupAndReject("تعذّر اعتماد الملف في قاعدة البيانات.", 500);
    }

    await logActivity({
      actorId: profile.id,
      action: "lecture.file_added",
      entityType: "lecture",
      entityId: file.lecture_id,
      metadata: {
        fileName: file.original_name,
        category: file.category,
        ext: file.ext,
        size: inspected.size,
      },
    });

    return NextResponse.json({ ok: true, file: updated });
  } catch (err) {
    console.error("[finalize] error:", err);
    return NextResponse.json(
      { error: "حدث خطأ بالسيرفر أثناء الفحص. تأكد من صحة SUPABASE_SERVICE_ROLE_KEY في ملف .env.local." },
      { status: 500 }
    );
  }
}
