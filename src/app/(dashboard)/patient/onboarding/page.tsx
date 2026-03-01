import { getSessionWithUser } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { PatientOnboardingForm } from "@/components/PatientOnboardingForm";

export default async function PatientOnboardingPage() {
  const sessionWithUser = await getSessionWithUser();
  if (!sessionWithUser) redirect("/login");
  if (sessionWithUser.user.role === "doctor") redirect("/doctor");
  if (sessionWithUser.user.onboardingCompletedAt != null) redirect("/patient");

  return (
    <div className="min-h-[80vh] flex flex-col items-center bg-stone-50 px-4 py-12 md:py-16">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-stone-900 mb-2">
          Welcome — tell us a bit about you
        </h1>
        <p className="text-stone-600 text-lg mb-10 leading-relaxed">
          This helps us tailor your symptom journal and share accurate summaries with your doctor.
        </p>
        <PatientOnboardingForm initialName={sessionWithUser.user.name} />
      </div>
    </div>
  );
}
