-- Create PatientJournalEntry table if missing (idempotent fix for schema drift)
CREATE TABLE IF NOT EXISTS "PatientJournalEntry" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "sourceChatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientJournalEntry_pkey" PRIMARY KEY ("id")
);

-- Add foreign key if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PatientJournalEntry_patientId_fkey'
  ) THEN
    ALTER TABLE "PatientJournalEntry"
    ADD CONSTRAINT "PatientJournalEntry_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
