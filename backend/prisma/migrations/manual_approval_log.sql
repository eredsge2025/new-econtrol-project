-- Drop existing problematic types
DROP TYPE IF EXISTS "UserRole_new" CASCADE;

-- Create ApprovalAction enum
DO $$ BEGIN
    CREATE TYPE "ApprovalAction" AS ENUM ('APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create approval_logs table
CREATE TABLE IF NOT EXISTS "approval_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "reason" TEXT,
    "requested_lan_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "approval_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "approval_logs_admin_id_idx" ON "approval_logs"("admin_id");
CREATE INDEX IF NOT EXISTS "approval_logs_target_user_id_idx" ON "approval_logs"("target_user_id");
CREATE INDEX IF NOT EXISTS "approval_logs_action_idx" ON "approval_logs"("action");
CREATE INDEX IF NOT EXISTS "approval_logs_created_at_idx" ON "approval_logs"("created_at");

-- Add foreign keys
ALTER TABLE "approval_logs" 
ADD CONSTRAINT "approval_logs_admin_id_fkey" 
FOREIGN KEY ("admin_id") REFERENCES "users"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "approval_logs" 
ADD CONSTRAINT "approval_logs_target_user_id_fkey" 
FOREIGN KEY ("target_user_id") REFERENCES "users"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;
