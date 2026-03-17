import { redirect } from "next/navigation";

// Root always bounces to /dashboard.
// Middleware will redirect unauthenticated users from /dashboard → /login.
export default function RootPage() {
  redirect("/dashboard");
}
