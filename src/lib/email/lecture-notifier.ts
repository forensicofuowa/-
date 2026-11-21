import net from "node:net";
import tls from "node:tls";
import { createAdminClient } from "@/lib/supabase/admin";

export interface NotifyStudentsResult {
  notifiedInApp: number;
  emailedCount: number;
  emailConfigured: boolean;
  note?: string;
}

function encodeBase64(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64");
}

function encodeSubjectRfc2047(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
}

async function sendGmailSmtpEmail(params: {
  gmailUser: string;
  gmailAppPassword: string;
  to: string;
  subject: string;
  htmlBody: string;
}): Promise<boolean> {
  const pass = params.gmailAppPassword.replace(/\s+/g, "");
  const fromAddr = params.gmailUser.trim();
  const toAddr = params.to.trim();

  const mimeMessage = [
    `From: "Forensic Learn" <${fromAddr}>`,
    `To: <${toAddr}>`,
    `Subject: ${encodeSubjectRfc2047(params.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    encodeBase64(params.htmlBody).replace(/(.{76})/g, "$1\r\n"),
  ].join("\r\n");

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (!settled) {
        settled = true;
        resolve(ok);
      }
    };

    const socket = net.createConnection({ host: "smtp.gmail.com", port: 587 });
    socket.setTimeout(15000);

    let step = 0;
    let tlsSocket: tls.TLSSocket | null = null;

    const handleLine = (line: string, writeFn: (cmd: string) => void) => {
      const code = line.slice(0, 3);
      if (line.charAt(3) === "-") return;

      if (step === 0 && code === "220") {
        step = 1;
        writeFn("EHLO forensic-learn.local");
      } else if (step === 1 && code === "250") {
        step = 2;
        writeFn("STARTTLS");
      } else if (step === 2 && code === "220") {
        step = 3;
        const secure = tls.connect({
          socket,
          servername: "smtp.gmail.com",
        });
        tlsSocket = secure;
        secure.setTimeout(15000);
        let tlsBuf = "";

        const tlsWrite = (cmd: string) => secure.write(`${cmd}\r\n`);

        secure.on("secureConnect", () => {
          tlsWrite("EHLO forensic-learn.local");
        });

        secure.on("data", (chunk: Buffer) => {
          tlsBuf += chunk.toString("utf-8");
          const parts = tlsBuf.split("\r\n");
          tlsBuf = parts.pop() ?? "";
          for (const p of parts) {
            if (!p) continue;
            const c = p.slice(0, 3);
            if (p.charAt(3) === "-") continue;

            if (step === 3 && c === "250") {
              step = 4;
              tlsWrite("AUTH LOGIN");
            } else if (step === 4 && c === "334") {
              step = 5;
              tlsWrite(Buffer.from(fromAddr, "utf-8").toString("base64"));
            } else if (step === 5 && c === "334") {
              step = 6;
              tlsWrite(Buffer.from(pass, "utf-8").toString("base64"));
            } else if (step === 6 && c === "235") {
              step = 7;
              tlsWrite(`MAIL FROM:<${fromAddr}>`);
            } else if (step === 7 && c === "250") {
              step = 8;
              tlsWrite(`RCPT TO:<${toAddr}>`);
            } else if (step === 8 && c === "250") {
              step = 9;
              tlsWrite("DATA");
            } else if (step === 9 && c === "354") {
              step = 10;
              tlsWrite(`${mimeMessage}\r\n.`);
            } else if (step === 10 && c === "250") {
              step = 11;
              tlsWrite("QUIT");
              finish(true);
            } else if (Number(c) >= 400) {
              secure.end();
              finish(false);
            }
          }
        });

        secure.on("error", () => finish(false));
        secure.on("timeout", () => {
          secure.destroy();
          finish(false);
        });
      } else if (Number(code) >= 400) {
        socket.destroy();
        finish(false);
      }
    };

    let plainBuf = "";
    const plainWrite = (cmd: string) => {
      if (!tlsSocket) socket.write(`${cmd}\r\n`);
    };

    socket.on("data", (chunk: Buffer) => {
      if (tlsSocket) return;
      plainBuf += chunk.toString("utf-8");
      const parts = plainBuf.split("\r\n");
      plainBuf = parts.pop() ?? "";
      for (const p of parts) {
        if (p) handleLine(p, plainWrite);
      }
    });

    socket.on("error", () => finish(false));
    socket.on("timeout", () => {
      socket.destroy();
      finish(false);
    });
  });
}

export async function notifyStudentsNewLecture(params: {
  lectureId: string;
  subjectId: string;
  lectureNumber: number;
  semester: number;
  title: string;
}): Promise<NotifyStudentsResult> {
  const admin = createAdminClient();

  const { data: subject } = await admin
    .from("subjects")
    .select("id, name, stage_id")
    .eq("id", params.subjectId)
    .maybeSingle();

  if (!subject) {
    return { notifiedInApp: 0, emailedCount: 0, emailConfigured: false, note: "المادة غير موجودة." };
  }

  const { data: students } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "student")
    .eq("status", "active")
    .eq("stage_id", subject.stage_id);

  const recipients = (students ?? []).filter((s) => Boolean(s.email));
  if (recipients.length === 0) {
    return {
      notifiedInApp: 0,
      emailedCount: 0,
      emailConfigured: Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
      note: "لا يوجد طلبة مفعّلون مسجّلون في مرحلة هذه المادة حالياً.",
    };
  }

  const semLabel = params.semester === 2 ? "الفصل الثاني" : "الفصل الأول";
  const notifTitle = `محاضرة جديدة في مادة ${subject.name}`;
  const notifBody = `تم نشر المحاضرة رقم (${params.lectureNumber}): "${params.title}" ضمن ${semLabel}.`;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const lectureUrl = `${siteUrl}/student/lectures/${params.lectureId}`;

  await admin.from("notifications").insert(
    recipients.map((s) => ({
      user_id: s.id,
      title: notifTitle,
      body: notifBody,
      link: `/student/lectures/${params.lectureId}`,
    }))
  );

  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!gmailUser || !gmailAppPassword) {
    return {
      notifiedInApp: recipients.length,
      emailedCount: 0,
      emailConfigured: false,
      note: `تم حفظ الإشعار لـ ${recipients.length} طالب داخل المنصة (أضف GMAIL_USER و GMAIL_APP_PASSWORD في ملف .env.local لتفعيل إرسال إيميلات Gmail مجاناً).`,
    };
  }

  let emailedCount = 0;
  for (const student of recipients) {
    const htmlBody = `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
        <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:24px;">
          <h2 style="margin:0 0 8px; color:#4f46e5;">منصة قسم الادلة الجنائية  — محاضرة جديدة</h2>
          <p style="margin:0 0 16px; font-size:14px; color:#334155;">مرحباً <strong>${student.full_name}</strong>،</p>
          <p style="margin:0 0 16px; font-size:15px; line-height:1.7;">
            عندك محاضرة جديدة منشورة في مادة <strong>${subject.name}</strong> (${semLabel}):
          </p>
          <div style="background:#f1f5f9; border-right:4px solid #ff5722; padding:12px 16px; border-radius:8px; margin-bottom:20px;">
            <strong style="font-size:15px;">محاضرة ${params.lectureNumber}: ${params.title}</strong>
          </div>
          <a href="${lectureUrl}" style="display:inline-block; background:#4f46e5; color:#ffffff; text-decoration:none; padding:10px 20px; border-radius:8px; font-weight:bold; font-size:14px;">
            فتح المحاضرة ومرفقاتها
          </a>
        </div>
      </div>
    `;

    const sent = await sendGmailSmtpEmail({
      gmailUser,
      gmailAppPassword,
      to: student.email,
      subject: `محاضرة جديدة: ${params.title} — ${subject.name}`,
      htmlBody,
    });
    if (sent) emailedCount++;
  }

  return {
    notifiedInApp: recipients.length,
    emailedCount,
    emailConfigured: true,
    note: `تم إرسال إشعارات Gmail إلى ${emailedCount} من أصل ${recipients.length} طالب في هذه المرحلة.`,
  };
}
