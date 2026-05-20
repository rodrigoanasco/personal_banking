import "./globals.css";
import { AuthGate } from "@/components/AuthGate";

export const metadata = {
  title: "Personal Banking Tracker",
  description: "Personal finance dashboard connected to the ASP.NET Core API"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
