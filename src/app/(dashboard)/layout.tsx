import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/DashboardNav";
import { Header } from "@/components/Header";
import { getSessionWithUser } from "@/lib/auth0";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionWithUser = await getSessionWithUser();
  if (!sessionWithUser) redirect("/login");
  const { user, email } = sessionWithUser;
  return (
    <div className="min-h-screen flex flex-col">
      <Header email={email} role={user.role} />
      <div className="flex-1 flex">
        <DashboardNav role={user.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
