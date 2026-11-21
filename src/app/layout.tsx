import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "قسم الادلة الجنائية  | منصة المحاضرات الجامعية",
  description: "منصة أكاديمية منظمة وآمنة لنشر وتصفح المحاضرات الجامعية ومرفقاتها",
};

const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('flp_theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="font-cairo" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}