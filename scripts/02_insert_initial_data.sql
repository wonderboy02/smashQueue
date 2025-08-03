-- Insert initial courts
INSERT INTO courts (id, is_active) VALUES 
(1, TRUE),
(2, TRUE),
(3, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Insert initial config
INSERT INTO config (
    show_sex, 
    show_skill, 
    enable_vs, 
    enable_undo_game_by_user, 
    enable_change_game_by_user, 
    enable_add_user_auto
) VALUES (
    TRUE, 
    TRUE, 
    TRUE, 
    FALSE, 
    FALSE, 
    FALSE
) ON CONFLICT (id) DO NOTHING;

-- Insert sample users with username and password
INSERT INTO users (username, password, name, sex, skill, is_guest, is_active, is_attendance, admin_authority) VALUES
('admin', 'admin123', '김철수', 'M', 'A', FALSE, TRUE, TRUE, TRUE),
('younghee', 'password123', '이영희', 'F', 'B', FALSE, TRUE, TRUE, FALSE),
('minsu', 'password123', '박민수', 'M', 'A', FALSE, TRUE, TRUE, FALSE),
('sujin', 'password123', '정수진', 'F', 'C', FALSE, TRUE, TRUE, FALSE),
('dongwook', 'password123', '최동욱', 'M', 'B', FALSE, TRUE, TRUE, FALSE),
('jimin', 'password123', '한지민', 'F', 'A', FALSE, TRUE, TRUE, FALSE),
('seojun', 'password123', '윤서준', 'M', 'B', FALSE, TRUE, TRUE, FALSE),
('mirae', 'password123', '강미래', 'F', 'C', FALSE, TRUE, TRUE, FALSE),
('hyunwoo', 'password123', '조현우', 'M', 'A', FALSE, TRUE, TRUE, FALSE),
('yerin', 'password123', '신예린', 'F', 'B', FALSE, TRUE, TRUE, FALSE),
('taehyun', 'password123', '임태현', 'M', 'C', TRUE, TRUE, TRUE, FALSE),
('haneul', 'password123', '송하늘', 'F', 'B', FALSE, TRUE, TRUE, FALSE),
('jihoon', 'password123', '오지훈', 'M', 'A', FALSE, TRUE, FALSE, FALSE),
('soyoung', 'password123', '배소영', 'F', 'C', FALSE, TRUE, TRUE, FALSE)
ON CONFLICT (username) DO NOTHING;
