import JSZip from "jszip";
import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const profile = await getSessionProfile();
  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولاً." }, { status: 401 });
  }

  const supabase = await createClient();
  const [{ data: lecture }, { data: files }] = await Promise.all([
    supabase.from("lectures").select("id, lecture_number, title").eq("id", id).maybeSingle(),
    supabase
      .from("lecture_files")
      .select("id, storage_path, original_name, category")
      .eq("lecture_id", id)
      .eq("status", "ready")
      .order("sort_order", { ascending: true }),
  ]);

  if (!lecture || !files || files.length === 0) {
    return NextResponse.json({ error: "لا توجد ملفات متاحة للتحميل في هذه المحاضرة." }, { status: 404 });
  }

  const admin = createAdminClient();
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const f of files) {
    const { data: blobData, error } = await admin.storage.from("lectures").download(f.storage_path);
    if (error || !blobData) continue;

    const prefix = f.category === "practical" ? "[عملي] " : "[نظري] ";
    let entryName = `${prefix}${f.original_name}`;
    let counter = 2;
    while (usedNames.has(entryName)) {
      entryName = `${prefix}(${counter}) ${f.original_name}`;
      counter++;
    }
    usedNames.add(entryName);

    const arrBuf = await blobData.arrayBuffer();
    zip.file(entryName, arrBuf);
  }

  const zipBuffer = await zip.generateAsync({ type: "uint8array" });
  const safeAsciiName = `lecture-${lecture.lecture_number}-files.zip`;
  const encodedUtf8Name = encodeURIComponent(`محاضرة_${lecture.lecture_number}_${lecture.title}.zip`);

  return new Response(zipBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodedUtf8Name}`,
      "Content-Length": String(zipBuffer.byteLength),
    },
  });
}
