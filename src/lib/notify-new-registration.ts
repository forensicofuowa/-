import { createAdminClient } from "@/lib/supabase/admin";

type NewRegistrationPayload = {
  fullName: string;
  email: string;
  role: "student" | "instructor" | string;
  stageId?: string | null;
};

export async function notifyAdminNewUserRegistration(payload: NewRegistrationPayload) {
  try {
    const admin = createAdminClient();
    let stageName = "—";

    if (payload.stageId) {
      const { data: stage } = await admin
        .from("stages")
        .select("name")
        .eq("id", payload.stageId)
        .maybeSingle();
      if (stage?.name) {
        stageName = stage.name;
      }
    }

    const roleText = payload.role === "instructor" ? "تدريسي" : "طالب";
    const createdAtFormatted = new Intl.DateTimeFormat("ar-IQ", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());

    const htmlBody = `
      <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
        <h2>طلب تسجيل حساب جديد في المنصة</h2>
        <p><strong>الاسم الكامل:</strong> ${payload.fullName}</p>
        <p><strong>البريد الإلكتروني:</strong> ${payload.email}</p>
        <p><strong>نوع الحساب:</strong> ${roleText}</p>
        <p><strong>المرحلة الدراسية:</strong> ${stageName}</p>
        <p><strong>وقت التسجيل:</strong> ${createdAtFormatted}</p>
        <p><a href="/admin/users">مراجعة الطلب من لوحة الإدارة</a></p>
      </div>
    `.trim();

    await admin.from("activity_logs").insert({
      action: "new_user_registration_request",
      details: `${payload.fullName} (${payload.email}) - ${roleText} - ${stageName}`,
      metadata: {
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
        stageName,
        htmlBody,
      },
    });
  } catch {
    // Do not block registration if notification logging fails
  }
}
