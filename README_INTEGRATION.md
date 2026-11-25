# تعليمات دمج الميزتين الجديدتين

## 1. إشعار الإيميل الفوري عند التسجيل
- تم تحديث `src/lib/notify-new-registration.ts` ليرسل إيميل HTML مباشر عبر `GMAIL_USER` و `GMAIL_APP_PASSWORD` الموجودين مسبقاً في إعدادات Netlify فور تسجيل أي حساب جديد.
- تأكد من تثبيت حزمة `nodemailer` إذا لم تكن مثبتة في `package.json`:
  ```bash
  npm install nodemailer
  npm install -D @types/nodemailer
  ```

## 2. واجهة رفع الملخصات للطلبة المصرّح لهم
1. نفّذ ملف `supabase/migrations/20261125_student_summaries_and_notifications.sql` في Supabase SQL Editor.
2. داخل صفحة تفاصيل المحاضرة للطالب (`src/app/student/lectures/[id]/page.tsx`)، استدعِ المكوّن `StudentSummaryUploader`:
   ```tsx
   import { StudentSummaryUploader } from "@/components/student/student-summary-uploader";

   // داخل JSX الصفحة:
   <StudentSummaryUploader
     lectureId={lecture.id}
     canUpload={Boolean(profile.can_upload_summaries)}
     currentUserId={profile.id}
     existingSummaries={(files ?? []).filter((f: any) => f.uploaded_by_role === "student")}
   />
   ```
