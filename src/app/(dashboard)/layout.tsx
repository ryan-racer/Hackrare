import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/DashboardNav";
import { Header } from "@/components/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  return (
    <div className="min-h-screen flex flex-col">
      <Header email={session.user.email} role={role} />
      <div className="flex-1 flex">
        <DashboardNav role={role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
