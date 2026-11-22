-- Safe migration: keeps all existing data intact and separates lecture numbering
-- between 'theory' and 'practical' within (subject_id, academic_year_id, semester).

DO $$
DECLARE
  r RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lectures'
      AND column_name = 'category'
  ) THEN
    ALTER TABLE public.lectures
      ADD COLUMN category text NOT NULL DEFAULT 'theory'
      CHECK (category IN ('theory', 'practical'));
  END IF;

  UPDATE public.lectures l
  SET category = sub_cat.cat
  FROM (
    SELECT DISTINCT ON (lf.lecture_id) lf.lecture_id, lf.category AS cat
    FROM public.lecture_files lf
    WHERE lf.category IN ('theory', 'practical')
    ORDER BY lf.lecture_id, (lf.status = 'ready') DESC, lf.sort_order ASC, lf.created_at ASC
  ) sub_cat
  WHERE l.id = sub_cat.lecture_id;

  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'lectures'
      AND con.contype = 'u'
      AND EXISTS (
        SELECT 1
        FROM pg_attribute att
        WHERE att.attrelid = rel.oid
          AND att.attnum = ANY(con.conkey)
          AND att.attname = 'lecture_number'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.lectures DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;

  FOR r IN
    SELECT idx.relname AS index_name
    FROM pg_index ix
    JOIN pg_class idx ON idx.oid = ix.indexrelid
    JOIN pg_class tbl ON tbl.oid = ix.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tbl.relnamespace
    WHERE nsp.nspname = 'public'
      AND tbl.relname = 'lectures'
      AND ix.indisunique = true
      AND EXISTS (
        SELECT 1
        FROM pg_attribute att
        WHERE att.attrelid = tbl.oid
          AND att.attnum = ANY(ix.indkey)
          AND att.attname = 'lecture_number'
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.index_name);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS lectures_subject_year_sem_cat_num_uidx
  ON public.lectures (subject_id, academic_year_id, semester, category, lecture_number);

CREATE INDEX IF NOT EXISTS lectures_category_idx
  ON public.lectures (category);
