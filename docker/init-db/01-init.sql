-- ============================================
-- Initial Database Setup for OMR System
-- ============================================

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types/enums
DO $$ BEGIN
    CREATE TYPE exam_status AS ENUM ('draft', 'active', 'processing', 'completed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'needs_review');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE student_status AS ENUM ('registered', 'submitted', 'graded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE answer_status AS ENUM ('detected', 'ambiguous', 'blank', 'multiple', 'invalid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Grant permissions (if needed for specific users)
-- GRANT ALL PRIVILEGES ON DATABASE omr_db TO postgres;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'OMR Database initialized successfully at %', NOW();
END $$;
