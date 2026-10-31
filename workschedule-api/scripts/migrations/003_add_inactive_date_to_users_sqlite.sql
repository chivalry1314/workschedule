-- 为 users 表增加失效日期字段（SQLite 版本）
-- 注意：SQLite 不支持 ADD COLUMN IF NOT EXISTS，请确认该字段不存在后再执行。
-- 若通过应用启动自动执行，建议先检查列是否存在，避免重复执行报错。

ALTER TABLE users ADD COLUMN inactive_date DATE;
