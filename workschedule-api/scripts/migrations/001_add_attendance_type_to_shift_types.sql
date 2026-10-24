-- 迁移 001：为 shift_types 增加考勤类型字段
-- 执行时机：2025-07 增加考勤类型功能时
-- 兼容性：
--   - 幂等，可重复执行；
--   - 已有班次默认设为工作（attendance_type = 1）；
--   - 默认休息班次（code = '休'）设为休息（attendance_type = 0）。

ALTER TABLE shift_types ADD COLUMN IF NOT EXISTS attendance_type INT NOT NULL DEFAULT 1;

-- 将默认休息班次标记为休息；仅当仍为默认值 1 时才更新，避免覆盖管理员手动设置。
UPDATE shift_types
SET attendance_type = 0
WHERE code = '休'
  AND attendance_type = 1;
