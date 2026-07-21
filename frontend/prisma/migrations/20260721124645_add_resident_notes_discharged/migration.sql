-- AlterTable
ALTER TABLE "residents" ADD COLUMN     "discharged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT NOT NULL DEFAULT '';
