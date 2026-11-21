import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
});

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
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
