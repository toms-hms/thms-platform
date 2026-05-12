DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Job'
      AND column_name = 'diagnosis'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Job'
      AND column_name = 'ai_session'
  ) THEN
    ALTER TABLE "Job" RENAME COLUMN "diagnosis" TO "ai_session";
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Job'
      AND column_name = 'ai_session'
  ) THEN
    ALTER TABLE "Job" ADD COLUMN "ai_session" jsonb;
  END IF;
END $$;
