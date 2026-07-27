import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoragePK | Workspace overview",
  description: "A calm workspace for routing files across connected storage pools.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
