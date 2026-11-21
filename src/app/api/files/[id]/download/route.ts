import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const profile = await getSessionProfile();
  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولاً." }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: file } = await supabase
    .from("lecture_files")
    .select("id, storage_path, original_name, mime_type, status")
    .eq("id", id)
    .maybeSingle();

  if (!file || file.status !== "ready") {
    return NextResponse.json({ error: "الملف غير متوفر." }, { status: 404 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  const inline = mode === "preview" || mode === "json";

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("lectures")
    .createSignedUrl(file.storage_path, 300, inline ? undefined : { download: file.original_name });

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "تعذّر إنشاء رابط التحميل." }, { status: 500 });
  }

  if (mode === "json") {
    return NextResponse.json({
      signedUrl: signed.signedUrl,
      name: file.original_name,
      mimeType: file.mime_type,
    });
  }

  return NextResponse.redirect(signed.signedUrl);
}
