"use client";

import { PatientInfoCard } from "@/components/PatientInfoCard";
import type { User } from "@prisma/client";

type PatientHomeViewProps = {
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

export function PatientHomeView({ user }: PatientHomeViewProps) {
  return (
    <div className="max-w-2xl">
      <PatientInfoCard user={user} />
    </div>
  );
}
