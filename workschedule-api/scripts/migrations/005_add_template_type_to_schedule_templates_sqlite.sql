-- 为 schedule_templates 增加模板类型和随机模板替换字段（SQLite 版本）

ALTER TABLE schedule_templates ADD COLUMN template_type INTEGER DEFAULT 1;
ALTER TABLE schedule_templates ADD COLUMN replace_shift_type_id INTEGER;
ALTER TABLE schedule_templates ADD COLUMN replaced_shift_type_id INTEGER;
