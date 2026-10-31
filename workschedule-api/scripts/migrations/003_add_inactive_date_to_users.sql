-- 为 users 表增加失效日期字段（PostgreSQL / CloudBase 版本）
-- IF NOT EXISTS 保证幂等执行，已有数据不会受影响

ALTER TABLE users ADD COLUMN IF NOT EXISTS inactive_date DATE;
