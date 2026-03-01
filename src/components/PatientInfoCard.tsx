import Link from "next/link";
import type { User } from "@prisma/client";

type PatientInfoCardProps = {
  user: Pick<
    User,
    | "name"
    | "email"
    | "pcpName"
    | "pcpCity"
    | "pcpState"
    | "currentDiagnoses"
    | "currentMedications"
    | "allergies"
  >;
};

function parseJson<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function PatientInfoCard({ user }: PatientInfoCardProps) {
  const diagnoses = parseJson<string[]>(user.currentDiagnoses);
  const medications = parseJson<{ name: string; dose?: string; frequency?: string }[]>(
    user.currentMedications
  );

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-900 mb-3">My info</h3>
      <div className="space-y-2 text-sm">
        <p className="font-medium text-stone-900">{user.name ?? user.email}</p>
        <p className="text-stone-600">{user.email}</p>
        {(user.pcpName || user.pcpCity || user.pcpState) && (
          <p className="text-stone-600">
            PCP: {[user.pcpName, user.pcpCity, user.pcpState].filter(Boolean).join(", ")}
          </p>
        )}
        {diagnoses && diagnoses.length > 0 && (
          <div>
            <span className="text-stone-500">Diagnoses: </span>
            <span className="text-stone-700">{diagnoses.join(", ")}</span>
          </div>
        )}
        {medications && medications.length > 0 && (
          <div>
            <span className="text-stone-500">Medications: </span>
            <span className="text-stone-700">
              {medications.map((m) => m.name).join(", ")}
            </span>
          </div>
        )}
        {user.allergies && (
          <div>
            <span className="text-stone-500">Allergies: </span>
            <span className="text-stone-700">{user.allergies}</span>
          </div>
        )}
      </div>
      <Link
        href="/patient/onboarding"
        className="mt-3 inline-block text-xs text-stone-500 hover:text-stone-900 transition-colors"
      >
        Edit profile
      </Link>
    </div>
  );
}
