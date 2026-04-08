-- Rename old Plan enum values to new structure
-- Since there's no production data, we drop and recreate

ALTER TABLE "User" ALTER COLUMN "plan" TYPE TEXT;
DROP TYPE "Plan";
CREATE TYPE "Plan" AS ENUM (
  'CREATOR_STARTER',
  'CREATOR_PRO',
  'CREATOR_FULL',
  'BUSINESS_PLAY',
  'BUSINESS_ENTERPRISE',
  'AGENCY_SYMPHONY'
);
ALTER TABLE "User" ALTER COLUMN "plan" TYPE "Plan" USING 'CREATOR_STARTER'::"Plan";

-- Add TRIALING to UserStatus
ALTER TYPE "UserStatus" ADD VALUE 'TRIALING';
