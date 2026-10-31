# 数据库增量迁移

本目录存放面向已部署数据库的增量迁移脚本，按编号顺序执行即可。

## 使用方式

### PostgreSQL / CloudBase

1. 打开 CloudBase 控制台 PostgreSQL 执行器。
2. 按编号从小到大依次执行文件名不含 `_sqlite` 后缀的 `.sql` 文件。
3. 这些脚本都带 `IF NOT EXISTS`，可重复执行，不会破坏已有数据。

### SQLite（阿里云等本地 SQLite 部署）

1. 按编号从小到大依次执行文件名带 `_sqlite` 后缀的 `.sql` 文件。
2. SQLite 脚本未使用 `IF NOT EXISTS`，请确认目标字段不存在后再执行；建议由应用启动时先检测列是否存在，再决定是否执行。

## 迁移列表

| 编号 | 文件 | 说明 |
|---|---|---|
| 001 | `001_add_attendance_type_to_shift_types.sql` | 为 `shift_types` 增加 `attendance_type` 字段，并将默认休息班次标记为休息 |
| 002 | `002_add_attendance_type_to_schedule_rules.sql` | 为 `schedule_rules` 增加 `attendance_type` 字段，允许 `shift_type_id` 为空，并重建唯一索引 |
| 003 | `003_add_inactive_date_to_users.sql` | 为 `users` 增加 `inactive_date` 字段，用于标记人员失效日期（PostgreSQL / CloudBase） |
| 003 | `003_add_inactive_date_to_users_sqlite.sql` | 同上，SQLite 版本 |
| 004 | `004_add_schedule_templates.sql` | 新增 `schedule_templates` 和 `schedule_template_items` 表，支持初始化模板（PostgreSQL / CloudBase） |
| 004 | `004_add_schedule_templates_sqlite.sql` | 同上，SQLite 版本 |
| 005 | `005_add_template_type_to_schedule_templates.sql` | 为 `schedule_templates` 增加 `template_type`、`replace_shift_type_id`、`replaced_shift_type_id` 字段（PostgreSQL / CloudBase） |
| 005 | `005_add_template_type_to_schedule_templates_sqlite.sql` | 同上，SQLite 版本 |
| 006 | `006_add_schedule_template_target_users.sql` | 新增 `schedule_template_target_users` 表，支持随机模板适用用户组（PostgreSQL / CloudBase） |
| 006 | `006_add_schedule_template_target_users_sqlite.sql` | 同上，SQLite 版本 |

## 注意事项

- 若数据库是全新创建，可直接执行上级目录对应数据库的 schema 文件（`schema.sql` 用于 PostgreSQL，`schema-sqlite.sql` 用于 SQLite），无需再单独执行本目录脚本。
- 已部署数据库升级时，只需执行编号大于上次已执行最大编号的脚本。
- 003 号及以后的迁移会同时提供 PostgreSQL 和 SQLite 两个版本，请根据实际部署环境选择执行。
