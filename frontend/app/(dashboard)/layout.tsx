import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-surface-2">
      <Sidebar />
      <div className="ml-60">
        <TopBar />
        <main className="p-6 max-w-[1200px]">{children}</main>
      </div>
    </div>
  );
}
