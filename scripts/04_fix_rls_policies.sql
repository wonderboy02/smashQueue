-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all active users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can do everything on users" ON users;
DROP POLICY IF EXISTS "Everyone can view courts" ON courts;
DROP POLICY IF EXISTS "Only admins can modify courts" ON courts;
DROP POLICY IF EXISTS "Everyone can view games" ON games;
DROP POLICY IF EXISTS "Everyone can create games" ON games;
DROP POLICY IF EXISTS "Users can update games they're part of or admins can update any" ON games;
DROP POLICY IF EXISTS "Everyone can view user game relations" ON user_game_relations;
DROP POLICY IF EXISTS "Everyone can create user game relations" ON user_game_relations;
DROP POLICY IF EXISTS "Users can delete their own relations or admins can delete any" ON user_game_relations;
DROP POLICY IF EXISTS "Everyone can view config" ON config;
DROP POLICY IF EXISTS "Only admins can modify config" ON config;

-- Disable RLS temporarily for easier development
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE courts DISABLE ROW LEVEL SECURITY;
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_relations DISABLE ROW LEVEL SECURITY;
ALTER TABLE config DISABLE ROW LEVEL SECURITY;

-- Create simple policies that don't cause recursion
-- We'll enable RLS later when we implement proper authentication

-- For now, allow all operations for development
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for development" ON users FOR ALL USING (true);

-- ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for development" ON courts FOR ALL USING (true);

-- ALTER TABLE games ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for development" ON games FOR ALL USING (true);

-- ALTER TABLE user_game_relations ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for development" ON user_game_relations FOR ALL USING (true);

-- ALTER TABLE config ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for development" ON config FOR ALL USING (true);
