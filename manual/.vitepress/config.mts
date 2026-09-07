import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: '排班系统操作手册',
  description: '值班排班系统的用户使用与管理员操作手册',
  base: '/workschedule/',
  head: [['link', { rel: 'icon', href: '/favicon.svg' }]],
  themeConfig: {
    nav: [
      { text: '开始使用', link: '/guide/login' },
      { text: '员工功能', link: '/guide/my-schedule' },
      { text: '管理员功能', link: '/admin/users' },
      { text: '常见问题', link: '/faq' },
    ],
    sidebar: [
      {
        text: '开始使用',
        items: [
          { text: '登录与首次使用', link: '/guide/login' },
          { text: '首页', link: '/guide/dashboard' },
        ],
      },
      {
        text: '员工功能',
        items: [
          { text: '我的排班', link: '/guide/my-schedule' },
          { text: '总排班', link: '/guide/all-schedule' },
          { text: '换班', link: '/guide/swap' },
          { text: '个人中心', link: '/guide/profile' },
        ],
      },
      {
        text: '管理员功能',
        items: [
          { text: '人员管理', link: '/admin/users' },
          { text: '角色管理', link: '/admin/roles' },
          { text: '值班类型管理', link: '/admin/shift-types' },
          { text: '排班规则与时间窗', link: '/admin/schedule-rules' },
        ],
      },
      {
        text: '其他',
        items: [
          { text: '常见问题', link: '/faq' },
          { text: '手册部署', link: '/deploy' },
        ],
      },
    ],
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            placeholder: '搜索手册内容',
            translations: {
              button: { buttonText: '搜索', buttonAriaLabel: '搜索手册内容' },
              modal: {
                displayDetails: '查看详细信息',
                resetButtonTitle: '重置搜索',
                backButtonTitle: '关闭搜索',
                noResultsText: '没有找到相关内容',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },
    outline: { label: '本页目录', level: [2, 3] },
    docFooter: { prev: '上一页', next: '下一页' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '深色模式',
    lastUpdated: {
      text: '最后更新',
      formatOptions: { dateStyle: 'short', timeStyle: 'medium' },
    },
  },
})
