-- Add user_status column to users table
DO $$ 
BEGIN
    -- Add user_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_status') THEN
        ALTER TABLE users ADD COLUMN user_status VARCHAR(20) DEFAULT 'ready' CHECK (user_status IN ('ready', 'waiting', 'gaming'));
    END IF;
END $$;

-- Update all existing users to 'ready' status
UPDATE users SET user_status = 'ready' WHERE user_status IS NULL;

-- Make user_status NOT NULL
ALTER TABLE users ALTER COLUMN user_status SET NOT NULL;

-- Create index for faster status lookups
CREATE INDEX IF NOT EXISTS idx_users_status ON users(user_status);

-- Update users who are currently in games to 'gaming' status
UPDATE users SET user_status = 'gaming' 
WHERE id IN (
    SELECT DISTINCT ugr.user_id 
    FROM user_game_relations ugr 
    JOIN games g ON g.id = ugr.game_id 
    WHERE g.status = 'playing'
);

-- Update users who are currently in waiting queue to 'waiting' status
UPDATE users SET user_status = 'waiting' 
WHERE id IN (
    SELECT DISTINCT ugr.user_id 
    FROM user_game_relations ugr 
    JOIN games g ON g.id = ugr.game_id 
    WHERE g.status = 'waiting'
);
