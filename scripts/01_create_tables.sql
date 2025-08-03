-- Enable Row Level Security
-- ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sex CHAR(1) CHECK (sex IN ('M', 'F')) NOT NULL,
    skill CHAR(1) CHECK (skill IN ('A', 'B', 'C')) NOT NULL,
    is_guest BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_attendance BOOLEAN DEFAULT FALSE,
    admin_authority BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courts table
CREATE TABLE IF NOT EXISTS courts (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    court_id INTEGER REFERENCES courts(id),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) CHECK (status IN ('waiting', 'playing', 'finished')) DEFAULT 'waiting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_game_relations table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_game_relations (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
);

-- Create config table
CREATE TABLE IF NOT EXISTS config (
    id SERIAL PRIMARY KEY,
    show_sex BOOLEAN DEFAULT TRUE,
    show_skill BOOLEAN DEFAULT TRUE,
    enable_vs BOOLEAN DEFAULT TRUE,
    enable_undo_game_by_user BOOLEAN DEFAULT FALSE,
    enable_change_game_by_user BOOLEAN DEFAULT FALSE,
    enable_add_user_auto BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_is_attendance ON users(is_attendance);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_court_id ON games(court_id);
CREATE INDEX IF NOT EXISTS idx_user_game_relations_user_id ON user_game_relations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_relations_game_id ON user_game_relations(game_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courts_updated_at BEFORE UPDATE ON courts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
