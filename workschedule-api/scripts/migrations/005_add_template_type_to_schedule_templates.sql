-- 为 schedule_templates 增加模板类型和随机模板替换字段（PostgreSQL / CloudBase 版本）

ALTER TABLE schedule_templates
  ADD COLUMN IF NOT EXISTS template_type INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS replace_shift_type_id BIGINT,
  ADD COLUMN IF NOT EXISTS replaced_shift_type_id BIGINT;
