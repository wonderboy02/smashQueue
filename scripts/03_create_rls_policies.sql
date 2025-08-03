-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view all active users" ON users
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can do everything on users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND admin_authority = TRUE
        )
    );

-- Create policies for courts table
CREATE POLICY "Everyone can view courts" ON courts
    FOR SELECT USING (TRUE);

CREATE POLICY "Only admins can modify courts" ON courts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND admin_authority = TRUE
        )
    );

-- Create policies for games table
CREATE POLICY "Everyone can view games" ON games
    FOR SELECT USING (TRUE);

CREATE POLICY "Everyone can create games" ON games
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can update games they're part of or admins can update any" ON games
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_game_relations ugr
            JOIN users u ON u.id = ugr.user_id
            WHERE ugr.game_id = games.id 
            AND u.id::text = auth.uid()::text
        ) OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND admin_authority = TRUE
        )
    );

-- Create policies for user_game_relations table
CREATE POLICY "Everyone can view user game relations" ON user_game_relations
    FOR SELECT USING (TRUE);

CREATE POLICY "Everyone can create user game relations" ON user_game_relations
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can delete their own relations or admins can delete any" ON user_game_relations
    FOR DELETE USING (
        user_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND admin_authority = TRUE
        )
    );

-- Create policies for config table
CREATE POLICY "Everyone can view config" ON config
    FOR SELECT USING (TRUE);

CREATE POLICY "Only admins can modify config" ON config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND admin_authority = TRUE
        )
    );
