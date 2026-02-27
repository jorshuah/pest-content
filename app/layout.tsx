import type { Metadata } from "next";
import { Inter } from "next/font/google";
import DashboardLayout from "../components/DashboardLayout";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PestContent OS",
  description: "Autonomous Seasonal Social Media Engine for Multi-Location Pest Control Brands",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}
