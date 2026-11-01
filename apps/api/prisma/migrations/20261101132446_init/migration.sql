-- CreateTable
CREATE TABLE "predictions" (
    "id" UUID NOT NULL,
    "learner_id" UUID NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "choice_id" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "predictions_lesson_id_question_id_idx" ON "predictions"("lesson_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "predictions_learner_id_lesson_id_question_id_key" ON "predictions"("learner_id", "lesson_id", "question_id");
