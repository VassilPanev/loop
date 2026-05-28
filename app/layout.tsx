import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loop",
  description: "Turn mental noise into clarity."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
