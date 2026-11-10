import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Diagonal - Robotics Agency | Smart Manufacturing Solutions",
  description:
    "Diagonal is a leading robotics agency specializing in AMR (Autonomous Mobile Robots) and Industry 4.0 solutions. Discover TIFA - Tel-U Interactive Food Assistant and other innovative robotics products.",
  keywords: "robotics, AMR, autonomous mobile robot, TIFA, Industry 4.0, smart manufacturing, Diagonal",
  openGraph: {
    title: "Diagonal - Robotics as Your Partner in Smart Manufacturing",
    description: "Building smarter industries through robotics and automation solutions.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${plusJakartaSans.variable} antialiased`}
      >
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
