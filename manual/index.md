---
layout: home

hero:
  name: 排班系统操作手册
  text: 值班排班 · 一站式指南
  tagline: 面向员工与管理员的分角色操作说明，覆盖每个功能的使用流程
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/login
    - theme: alt
      text: 管理员入门
      link: /admin/users

features:
  - icon: 📅
    title: 我的排班
    details: 在月历上自助填写值班计划，受管理员配置的时间窗与排班规则约束，点一天存一天。
    link: /guide/my-schedule
  - icon: 👥
    title: 总排班
    details: 全员排班一览表，管理员可直接调整任何人的排班，并导出 Excel。
    link: /guide/all-schedule
  - icon: 🔁
    title: 换班
    details: 与同事相互换班：发起申请、对方同意后自动交换，规则实时校验。
    link: /guide/swap
  - icon: ⚙️
    title: 管理后台
    details: 人员、角色、值班类型、排班规则与时间窗，全部按月份灵活配置。
    link: /admin/schedule-rules
---

## 系统简介

排班系统是一个面向值班团队的在线排班工具，支持手机浏览器访问，采用「管理员配置 + 员工自助排班」模式：

- **管理员**：维护值班类型、角色、人员，按月配置排班时间窗和排班规则，查看/调整总排班并导出 Excel。
- **员工**：在开放时间内填写自己的值班计划，与同事发起换班，随时查看总排班和自己的排班。

## 阅读指引

- **员工**：从 [登录与首次使用](guide/login.md) 开始，重点阅读「员工功能」章节。
- **管理员**：建议通读全部章节，「管理员功能」章节包含完整的配置流程。

> 手册中的截图为占位图，后续请替换 `images/` 目录下的同名文件（见 [手册部署](deploy.md)）。
