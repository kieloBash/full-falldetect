/*
  Warnings:

  - A unique constraint covering the columns `[deviceId]` on the table `sensors` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "sensors" ADD COLUMN     "deviceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sensors_deviceId_key" ON "sensors"("deviceId");
