-- 迁移 002：让 schedule_rules 支持按考勤类型约束
-- 执行时机：2025-07 增加考勤类型排班规则时
-- 兼容性：
--   - 幂等，可重复执行；
--   - 已有规则均为按班次规则，attendance_type 保持 NULL；
--   - shift_type_id 改为可空，用于按考勤类型规则；
--   - 重建唯一索引以同时支持按班次和按考勤类型规则。

ALTER TABLE schedule_rules ADD COLUMN IF NOT EXISTS attendance_type INT;
ALTER TABLE schedule_rules ALTER COLUMN shift_type_id DROP NOT NULL;

-- 原唯一索引只包含 (month_key, rule_type, shift_type_id)，
-- 新索引加入 attendance_type，使按班次规则和按考勤规则可共存。
-- PostgreSQL 中 NULL 在唯一索引里互不相同，因此允许同时存在 shift_type_id 为 NULL 的多条考勤规则。
DROP INDEX IF EXISTS idx_schedule_rules_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_rules_unique
  ON schedule_rules (month_key, rule_type, shift_type_id, attendance_type);
