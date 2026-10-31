-- 新增初始化模板适用用户组关联表（PostgreSQL / CloudBase 版本）

CREATE TABLE IF NOT EXISTS schedule_template_target_users (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_template_target_users_template ON schedule_template_target_users(template_id);
