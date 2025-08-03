-- 현재 사용자 데이터 확인
SELECT 
    id,
    name,
    is_active,
    is_attendance,
    admin_authority,
    is_guest
FROM users 
ORDER BY id;

-- 출석한 활성 사용자 수 확인
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN is_attendance = true THEN 1 END) as attending_users,
    COUNT(CASE WHEN is_active = true AND is_attendance = true THEN 1 END) as active_and_attending
FROM users;

-- 만약 출석 데이터가 없다면 일부 사용자를 출석으로 업데이트
UPDATE users 
SET is_attendance = true 
WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14);
