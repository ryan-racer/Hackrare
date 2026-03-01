"use client";

import { PatientHomeView } from "@/components/PatientHomeView";
import { PatientJournalSection } from "@/components/PatientJournalSection";
import type { User } from "@prisma/client";

type ExtractionEntry = {
  id: string;
  title: string | null;
  createdAt: string;
  extractedData: string | null;
};

type Props = {
  activeTab: "home" | "journal";
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
  recentExtractions: ExtractionEntry[];
};

export function PatientTabs({
  activeTab,
  user,
  recentExtractions,
}: Props) {
  if (activeTab === "journal") {
    return (
      <div className="flex-1 min-h-0">
        <PatientJournalSection recentExtractions={recentExtractions} />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0">
      <PatientHomeView user={user} />
    </div>
  );
}
