// 禁用截图过程中残留的测试账号、班次，避免在真实系统中显示
const API = 'http://localhost:3000/api/v1'

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
  return data && typeof data === 'object' && 'data' in data ? data.data : data
}

async function login(username, password) {
  return api('/auth/login', { method: 'POST', body: { username, password } })
}

async function main() {
  const admin = await login('admin', 'Admin1234')
  const token = admin.access_token

  const users = await api('/users', { token })
  const userList = Array.isArray(users) ? users : users?.list || []
  for (const u of userList) {
    if (String(u.username).startsWith('screenshot-')) {
      await api(`/users/${u.id}`, {
        method: 'PUT',
        token,
        body: { status: 0 },
      }).catch((e) => console.log('disable user fail', u.username, e.message))
      console.log('disabled user', u.username)
    }
  }

  const shifts = await api('/shift-types', { token })
  const shiftList = Array.isArray(shifts) ? shifts : []
  for (const s of shiftList) {
    if (String(s.code).startsWith('TEST-') && s.status === 1) {
      await api(`/shift-types/${s.id}/status`, {
        method: 'PATCH',
        token,
      }).catch((e) => console.log('disable shift fail', s.code, e.message))
      console.log('disabled shift type', s.code)
    }
  }

  console.log('cleanup done')
}

main().catch(console.error)
