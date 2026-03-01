import { getSessionWithUser } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { DitheredWave } from "@/components/DitheredWave";

export default async function HomePage() {
  const sessionWithUser = await getSessionWithUser();
  if (sessionWithUser) {
    if (sessionWithUser.user.role === "doctor") redirect("/doctor");
    redirect("/patient");
  }
  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-stone-50">
      {/* Left: copy + CTAs */}
      <div className="flex flex-col justify-center p-12 md:p-20 border-b border-stone-200 md:border-b-0 md:border-r md:border-stone-200">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-stone-900 leading-[1.1]">
          Your health, translated.
        </h1>
        <p className="mt-8 text-stone-600 max-w-md text-lg leading-relaxed">
          An intelligent symptom journal that chats with you to track your daily
          health, and generates clinical summaries for your doctor.
        </p>
        <div className="mt-12 flex flex-col sm:flex-row gap-4">
          <a
            href="/auth/login"
            className="inline-flex items-center justify-center px-8 py-3.5 text-center font-medium bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 active:bg-stone-700 transition-colors"
          >
            Patient Login
          </a>
          <a
            href="/auth/login"
            className="inline-flex items-center justify-center px-8 py-3.5 text-center font-medium bg-white text-stone-800 border border-stone-300 rounded-lg hover:bg-stone-50 hover:border-stone-400 transition-colors"
          >
            Provider Login
          </a>
        </div>
      </div>
      {/* Right: full-bleed dithered green wave */}
      <div className="relative min-h-[50vh] md:min-h-0 border-t border-stone-200 md:border-t-0 md:border-l md:border-stone-200">
        <DitheredWave />
      </div>
    </main>
  );
}
