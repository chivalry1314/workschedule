import { chromium } from '@playwright/test'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const API = 'http://localhost:3000/api/v1'
const APP = 'http://localhost:5173'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = resolve(__dirname, '../images')

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth() + 1
const monthKey = `${year}-${String(month).padStart(2, '0')}`
const SUFFIX = String(Date.now()).slice(-6)
const TEST_USER = `screenshot-test-${SUFFIX}`
const TEST2_USER = `screenshot-test2-${SUFFIX}`
const ADMIN2_USER = `screenshot-admin2-${SUFFIX}`
const CHANGEPWD_USER = `screenshot-changepwd-${SUFFIX}`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function cleanupPreviousTestData(token) {
  try {
    const users = await api('/users', { token })
    const userList = Array.isArray(users) ? users : users?.list || []
    for (const u of userList) {
      if (String(u.username).startsWith('screenshot-')) {
        await api(`/users/${u.id}`, { method: 'DELETE', token }).catch(() => {})
      }
    }
    const roles = await api('/roles', { token })
    const roleList = Array.isArray(roles) ? roles : []
    for (const r of roleList) {
      if (String(r.name).startsWith('测试角色-截图')) {
        await api(`/roles/${r.id}`, { method: 'DELETE', token }).catch(() => {})
      }
    }
    const shifts = await api('/shift-types', { token })
    const shiftList = Array.isArray(shifts) ? shifts : []
    for (const s of shiftList) {
      if (String(s.code).startsWith('TEST-')) {
        await api(`/shift-types/${s.id}`, { method: 'DELETE', token }).catch(() => {})
      }
    }
    console.log('previous test data cleaned')
  } catch (e) {
    console.log('cleanup previous data skipped', e.message)
  }
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    console.error('API error', path, data)
    throw new Error(JSON.stringify(data) || res.statusText)
  }
  // 后端成功响应格式：{ code: 0, data: ... }
  return data && typeof data === 'object' && 'data' in data ? data.data : data
}

async function login(username, password) {
  return api('/auth/login', { method: 'POST', body: { username, password } })
}

async function changePassword(token, oldPassword, newPassword) {
  return api('/auth/password', {
    method: 'POST',
    token,
    body: { oldPassword, newPassword },
  })
}

async function waitNetwork(page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await sleep(600)
}

async function screenshot(page, name) {
  const file = `${OUT}/${name}.png`
  await page.screenshot({ path: file, fullPage: false })
  console.log('screenshot', file)
}

async function loginUI(page, username, password) {
  await page.goto(`${APP}/#/login`)
  await page.getByPlaceholder('请输入用户名').fill(username)
  await page.getByPlaceholder('请输入密码').fill(password)
  await page.getByRole('button', { name: '登录' }).click()
  await waitNetwork(page)
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

  // 1. 管理员登录并准备测试数据
  const admin = await login('admin', 'Admin1234')
  const adminToken = admin.access_token
  console.log('admin login ok')

  await cleanupPreviousTestData(adminToken)

  const aShift = await api('/shift-types', {
    method: 'POST',
    token: adminToken,
    body: { name: '测试A班', code: `TEST-A-${SUFFIX}`, color: '#F44336', remark: '' },
  })
  const bShift = await api('/shift-types', {
    method: 'POST',
    token: adminToken,
    body: { name: '测试B班', code: `TEST-B-${SUFFIX}`, color: '#2196F3', remark: '' },
  })
  const restShift = await api('/shift-types', {
    method: 'POST',
    token: adminToken,
    body: { name: '测试休息', code: `TEST-休-${SUFFIX}`, color: '#FFC107', remark: '' },
  })
  const shiftIds = [aShift.id, bShift.id, restShift.id]
  console.log('shift types ok', shiftIds)

  const role = await api('/roles', {
    method: 'POST',
    token: adminToken,
    body: { name: `测试角色-截图-${SUFFIX}`, remark: '仅供截图使用', shiftTypeIds: shiftIds },
  })
  console.log('role ok', role.id)

  const roleId = role.id

  const testUser = await api('/users', {
    method: 'POST',
    token: adminToken,
    body: { username: TEST_USER, initialPassword: 'Test1234', realName: '测试员工', roleId },
  })
  const test2User = await api('/users', {
    method: 'POST',
    token: adminToken,
    body: { username: TEST2_USER, initialPassword: 'Test1234', realName: '小李', roleId },
  })
  const admin2User = await api('/users', {
    method: 'POST',
    token: adminToken,
    body: { username: ADMIN2_USER, initialPassword: 'Admin1234', realName: '截图管理员', roleId, isAdmin: true },
  })
  const changePwdUser = await api('/users', {
    method: 'POST',
    token: adminToken,
    body: { username: CHANGEPWD_USER, initialPassword: 'Test1234', realName: '待改密员工', roleId },
  })

  // 改密以跳过首次登录强制改密
  const testLogin = await login(TEST_USER, 'Test1234')
  await changePassword(testLogin.access_token, 'Test1234', 'Test1234')
  const test2Login = await login(TEST2_USER, 'Test1234')
  await changePassword(test2Login.access_token, 'Test1234', 'Test1234')
  const admin2Login = await login(ADMIN2_USER, 'Admin1234')
  await changePassword(admin2Login.access_token, 'Admin1234', 'Admin5678')
  console.log('users ready')

  // 排班时间窗：当月整月
  const startAt = new Date(year, month - 1, 1, 0, 0, 0).toISOString()
  const endAt = new Date(year, month, 0, 23, 59, 59).toISOString()
  await api('/schedule-windows', {
    method: 'PUT',
    token: adminToken,
    body: { monthKey, startAt, endAt },
  })
  console.log('window ok')

  // 给测试员工排班
  const daysInMonth = new Date(year, month, 0).getDate()
  function makeItems(userPrefix, patternFn) {
    const items = []
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${monthKey}-${String(d).padStart(2, '0')}`
      const st = patternFn(d)
      if (st) items.push({ workDate: date, shiftTypeId: st })
    }
    return items
  }

  const testItems = makeItems('test', (d) => {
    if (d % 7 === 0 || d % 7 === 6) return restShift.id
    if (d % 3 === 0) return bShift.id
    return aShift.id
  })
  const test2Items = makeItems('test2', (d) => {
    if (d % 7 === 0) return restShift.id
    if (d % 4 === 0) return bShift.id
    return aShift.id
  })

  await api('/schedules/mine', {
    method: 'POST',
    token: testLogin.access_token,
    body: { year, month, items: testItems },
  })
  await api('/schedules/mine', {
    method: 'POST',
    token: test2Login.access_token,
    body: { year, month, items: test2Items },
  })
  console.log('schedules ok')

  // 获取 test / test2 的某条排班 ID，发起换班
  const testMine = await api(`/schedules/mine?year=${year}&month=${month}`, { token: testLogin.access_token })
  const test2Mine = await api(`/schedules/mine?year=${year}&month=${month}`, { token: test2Login.access_token })
  const appSched = testMine.schedules.find((s) => s.shiftType?.id === aShift.id)
  const tgtSched = test2Mine.schedules.find((s) => s.shiftType?.id === aShift.id && s.workDate !== appSched.workDate)
  if (appSched && tgtSched) {
    await api('/swaps', {
      method: 'POST',
      token: testLogin.access_token,
      body: {
        applicantScheduleId: appSched.id,
        targetUserId: test2User.id,
        targetScheduleId: tgtSched.id,
        swapType: 1,
        reason: '家中有事，想换个班',
      },
    })
    console.log('swap ok')
  }

  // 2. 启动 Playwright 截图
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
  })

  const capture = async (name, fn) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true })
    const page = await context.newPage()
    try {
      await fn(page)
      await screenshot(page, name)
    } finally {
      await context.close()
    }
  }

  await capture('login', async (page) => {
    await page.goto(`${APP}/#/login`)
    await waitNetwork(page)
  })

  await capture('change-password', async (page) => {
    await loginUI(page, CHANGEPWD_USER, 'Test1234')
    // 首次登录会被重定向到修改密码页；直接访问也可确保停在正确页面
    await page.goto(`${APP}/#/change-password`)
    await waitNetwork(page)
  })

  await capture('dashboard', async (page) => {
    await loginUI(page, TEST_USER, 'Test1234')
    await page.goto(`${APP}/#/dashboard`)
    await waitNetwork(page)
  })

  await capture('my-schedule', async (page) => {
    await loginUI(page, TEST_USER, 'Test1234')
    await page.goto(`${APP}/#/my-schedule`)
    await waitNetwork(page)
  })

  await capture('my-schedule-picker', async (page) => {
    await loginUI(page, TEST_USER, 'Test1234')
    await page.goto(`${APP}/#/my-schedule`)
    await waitNetwork(page)
    // 点击第 15 天（确保有数据）
    await page.locator('.days-grid .day-cell').nth(14).click()
    await sleep(500)
  })

  await capture('all-schedule', async (page) => {
    await loginUI(page, ADMIN2_USER, 'Admin5678')
    await page.goto(`${APP}/#/all-schedule`)
    await waitNetwork(page)
  })

  await capture('all-schedule-admin', async (page) => {
    await loginUI(page, ADMIN2_USER, 'Admin5678')
    await page.goto(`${APP}/#/all-schedule`)
    await waitNetwork(page)
    // 点击第一个非表头的 shift-cell
    await page.locator('.shift-cell').first().click()
    await sleep(500)
  })

  await capture('all-schedule-export', async (page) => {
    await loginUI(page, ADMIN2_USER, 'Admin5678')
    await page.goto(`${APP}/#/all-schedule`)
    await waitNetwork(page)
  })

  await capture('swap-list', async (page) => {
    await loginUI(page, TEST_USER, 'Test1234')
    await page.goto(`${APP}/#/swaps`)
    await waitNetwork(page)
  })

  await capture('swap-create', async (page) => {
    await loginUI(page, TEST_USER, 'Test1234')
    await page.goto(`${APP}/#/swaps`)
    await waitNetwork(page)
    await page.getByRole('button', { name: '发起换班' }).click()
    await sleep(500)
  })

  await capture('profile', async (page) => {
    await loginUI(page, TEST_USER, 'Test1234')
    await page.goto(`${APP}/#/profile`)
    await waitNetwork(page)
  })

  await capture('admin-users', async (page) => {
    await loginUI(page, ADMIN2_USER, 'Admin5678')
    await page.goto(`${APP}/#/admin/users`)
    await waitNetwork(page)
  })

  await capture('admin-users-form', async (page) => {
    await loginUI(page, ADMIN2_USER, 'Admin5678')
    await page.goto(`${APP}/#/admin/users`)
    await waitNetwork(page)
    await page.locator('.toolbar .van-button').first().click()
    await sleep(500)
  })

  await capture('admin-roles', async (page) => {
    await loginUI(page, ADMIN2_USER, 'Admin5678')
    await page.goto(`${APP}/#/admin/roles`)
    await waitNetwork(page)
  })

  await capture('admin-roles-form', async (page) => {
    await loginUI(page, ADMIN2_USER, 'Admin5678')
    await page.goto(`${APP}/#/admin/roles`)
    await waitNetwork(page)
    await page.locator('.toolbar .van-button').first().click()
    await sleep(500)
  })

  await capture('admin-shift-types', async (page) => {
    await loginUI(page, ADMIN2_USER, 'Admin5678')
    await page.goto(`${APP}/#/admin/shift-types`)
    await waitNetwork(page)
  })

  await capture('admin-shift-types-form', async (page) => {
    await loginUI(page, ADMIN2_USER, 'Admin5678')
    await page.goto(`${APP}/#/admin/shift-types`)
    await waitNetwork(page)
    await page.locator('.toolbar .van-button').first().click()
    await sleep(500)
  })

  await capture('admin-rules', async (page) => {
    await loginUI(page, ADMIN2_USER, 'Admin5678')
    await page.goto(`${APP}/#/admin/schedule-rules`)
    await waitNetwork(page)
  })

  await browser.close()
  console.log('all screenshots done')

  // 3. 清理测试数据（尽量删除，schedule 表中的历史空记录可后续在数据库手动清理）
  try {
    await api(`/users/${testUser.id}`, { method: 'DELETE', token: adminToken })
    await api(`/users/${test2User.id}`, { method: 'DELETE', token: adminToken })
    await api(`/users/${admin2User.id}`, { method: 'DELETE', token: adminToken })
    await api(`/users/${changePwdUser.id}`, { method: 'DELETE', token: adminToken })
    await api(`/roles/${role.id}`, { method: 'DELETE', token: adminToken })
    await api(`/shift-types/${aShift.id}`, { method: 'DELETE', token: adminToken })
    await api(`/shift-types/${bShift.id}`, { method: 'DELETE', token: adminToken })
    await api(`/shift-types/${restShift.id}`, { method: 'DELETE', token: adminToken })
    console.log('cleanup done')
  } catch (e) {
    console.error('cleanup failed', e.message)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
