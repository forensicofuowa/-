import { createAdminClient } from "@/lib/supabase/admin";

type NewRegistrationPayload = {
  fullName: string;
  email: string;
  role: "student" | "instructor" | string;
  stageId?: string | null;
};

async function sendGmailSmtpEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim();
  if (!gmailUser || !gmailAppPassword) {
    return;
  }

  try {
    // Dynamic import so build succeeds even if nodemailer is optional
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    await transporter.sendMail({
      from: `"منصة قسم الأدلة الجنائية" <${gmailUser}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (err) {
    console.error("Failed to send registration notification email:", err);
  }
}

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

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    const adminUsersLink = siteUrl ? `${siteUrl}/admin/users` : "/admin/users";

    const htmlBody = `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; line-height: 1.8; color: #0f172a; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
        <h2 style="color: #4f46e5; margin-top: 0;">طلب تسجيل حساب جديد في المنصة</h2>
        <p>تم استلام طلب تسجيل جديد وبانتظار موافقتك:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>الاسم الكامل:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${payload.fullName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>البريد الإلكتروني:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;" dir="ltr">${payload.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>نوع الحساب:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${roleText}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>المرحلة الدراسية:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${stageName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>وقت التسجيل:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${createdAtFormatted}</td>
          </tr>
        </table>
        <div style="margin-top: 20px;">
          <a href="${adminUsersLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: bold;">
            مراجعة وتفعيل الحساب الآن
          </a>
        </div>
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
      },
    });

    // Collect admin recipients (GMAIL_USER + active admin/super_admin emails)
    const recipients = new Set<string>();
    if (process.env.GMAIL_USER?.trim()) {
      recipients.add(process.env.GMAIL_USER.trim());
    }

    const { data: admins } = await admin
      .from("profiles")
      .select("email")
      .in("role", ["admin", "super_admin"])
      .eq("status", "active");

    for (const row of admins ?? []) {
      if (row.email && typeof row.email === "string") {
        recipients.add(row.email.trim());
      }
    }

    for (const recipient of recipients) {
      await sendGmailSmtpEmail({
        to: recipient,
        subject: `طلب تسجيل جديد: ${payload.fullName} (${roleText})`,
        html: htmlBody,
      });
    }
  } catch (err) {
    console.error("notifyAdminNewUserRegistration error:", err);
  }
}
