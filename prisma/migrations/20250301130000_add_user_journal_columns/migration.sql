-- Add User columns if missing (idempotent fix for schema drift)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "journalDisplayName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "smsFrequencyOverride" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "smsPreferredTime" TEXT;
