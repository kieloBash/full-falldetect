-- AlterTable
ALTER TABLE "sensors" ADD COLUMN     "nodeId" TEXT;

-- CreateTable
CREATE TABLE "detection_nodes" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "streamBaseUrl" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detection_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "detection_nodes_nodeKey_key" ON "detection_nodes"("nodeKey");

-- CreateIndex
CREATE INDEX "detection_nodes_facilityId_idx" ON "detection_nodes"("facilityId");

-- CreateIndex
CREATE INDEX "sensors_nodeId_idx" ON "sensors"("nodeId");

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "detection_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detection_nodes" ADD CONSTRAINT "detection_nodes_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
