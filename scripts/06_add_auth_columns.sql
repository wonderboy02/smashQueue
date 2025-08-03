-- Add authentication columns to users table
DO $$ 
BEGIN
    -- Add username column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(50);
    END IF;
    
    -- Add password column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password') THEN
        ALTER TABLE users ADD COLUMN password VARCHAR(255);
    END IF;
END $$;

-- Update existing users with default usernames and passwords (only if they don't have them)
UPDATE users SET 
  username = CASE 
    WHEN name = '김철수' THEN 'admin'
    WHEN name = '이영희' THEN 'younghee'
    WHEN name = '박민수' THEN 'minsu'
    WHEN name = '정수진' THEN 'sujin'
    WHEN name = '최동욱' THEN 'dongwook'
    WHEN name = '한지민' THEN 'jimin'
    WHEN name = '윤서준' THEN 'seojun'
    WHEN name = '강미래' THEN 'mirae'
    WHEN name = '조현우' THEN 'hyunwoo'
    WHEN name = '신예린' THEN 'yerin'
    WHEN name = '임태현' THEN 'taehyun'
    WHEN name = '송하늘' THEN 'haneul'
    WHEN name = '오지훈' THEN 'jihoon'
    WHEN name = '배소영' THEN 'soyoung'
    ELSE LOWER(REPLACE(name, ' ', ''))
  END,
  password = CASE 
    WHEN name = '김철수' THEN 'admin123'
    ELSE 'password123'
  END
WHERE username IS NULL OR password IS NULL;

-- Add unique constraint to username if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
END $$;

-- Make username and password required for new users (only if they're not already NOT NULL)
DO $$
BEGIN
    -- Check if username is nullable and make it NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username' AND is_nullable = 'YES') THEN
        ALTER TABLE users ALTER COLUMN username SET NOT NULL;
    END IF;
    
    -- Check if password is nullable and make it NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password' AND is_nullable = 'YES') THEN
        ALTER TABLE users ALTER COLUMN password SET NOT NULL;
    END IF;
END $$;

-- Create index for faster username lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
