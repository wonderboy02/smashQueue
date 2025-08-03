-- 기존 데이터가 있는 경우를 위한 안전한 업데이트 스크립트

-- 기존 사용자들의 username과 password가 NULL인 경우에만 업데이트
UPDATE users SET 
  username = 'admin',
  password = 'admin123'
WHERE name = '김철수' AND username IS NULL;

UPDATE users SET 
  username = 'younghee',
  password = 'password123'
WHERE name = '이영희' AND username IS NULL;

UPDATE users SET 
  username = 'minsu',
  password = 'password123'
WHERE name = '박민수' AND username IS NULL;

UPDATE users SET 
  username = 'sujin',
  password = 'password123'
WHERE name = '정수진' AND username IS NULL;

UPDATE users SET 
  username = 'dongwook',
  password = 'password123'
WHERE name = '최동욱' AND username IS NULL;

UPDATE users SET 
  username = 'jimin',
  password = 'password123'
WHERE name = '한지민' AND username IS NULL;

UPDATE users SET 
  username = 'seojun',
  password = 'password123'
WHERE name = '윤서준' AND username IS NULL;

UPDATE users SET 
  username = 'mirae',
  password = 'password123'
WHERE name = '강미래' AND username IS NULL;

UPDATE users SET 
  username = 'hyunwoo',
  password = 'password123'
WHERE name = '조현우' AND username IS NULL;

UPDATE users SET 
  username = 'yerin',
  password = 'password123'
WHERE name = '신예린' AND username IS NULL;

UPDATE users SET 
  username = 'taehyun',
  password = 'password123'
WHERE name = '임태현' AND username IS NULL;

UPDATE users SET 
  username = 'haneul',
  password = 'password123'
WHERE name = '송하늘' AND username IS NULL;

UPDATE users SET 
  username = 'jihoon',
  password = 'password123'
WHERE name = '오지훈' AND username IS NULL;

UPDATE users SET 
  username = 'soyoung',
  password = 'password123'
WHERE name = '배소영' AND username IS NULL;

-- 혹시 누락된 사용자가 있다면 기본값으로 설정
UPDATE users SET 
  username = LOWER(REPLACE(name, ' ', '')),
  password = 'password123'
WHERE username IS NULL;
