import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata = {
  title: "Personal Banking Tracker",
  description: "Personal finance dashboard connected to the ASP.NET Core API"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
