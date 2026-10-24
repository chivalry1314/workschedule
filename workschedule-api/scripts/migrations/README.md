# 数据库增量迁移

本目录存放面向已部署数据库的增量迁移脚本，按编号顺序执行即可。

## 使用方式

1. 打开 CloudBase 控制台 PostgreSQL 执行器。
2. 按编号从小到大依次执行 `.sql` 文件。
3. 每条迁移脚本都是幂等的，可重复执行，不会破坏已有数据。

## 迁移列表

| 编号 | 文件 | 说明 |
|---|---|---|
| 001 | `001_add_attendance_type_to_shift_types.sql` | 为 `shift_types` 增加 `attendance_type` 字段，并将默认休息班次标记为休息 |
| 002 | `002_add_attendance_type_to_schedule_rules.sql` | 为 `schedule_rules` 增加 `attendance_type` 字段，允许 `shift_type_id` 为空，并重建唯一索引 |

## 注意事项

- 若数据库是全新创建，可直接执行上级目录的 `schema.sql`，无需再单独执行本目录脚本。
- 已部署数据库升级时，只需执行编号大于上次已执行最大编号的脚本。
