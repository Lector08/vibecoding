-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "category" TEXT,
ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "Task_userId_category_idx" ON "Task"("userId", "category");
