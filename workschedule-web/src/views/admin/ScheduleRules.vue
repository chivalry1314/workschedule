<template>
  <div class="admin-rules">
    <div class="month-selector">
      <van-button size="small" icon="arrow-left" @click="changeMonth(-1)" />
      <span class="month-text">{{ year }}年{{ month }}月</span>
      <van-button size="small" icon="arrow" @click="changeMonth(1)" />
    </div>

    <div class="window-card">
      <div class="window-title">排班时间窗</div>
      <label class="window-item">
        <span>开始时间</span>
        <input v-model="windowStart" type="datetime-local" />
      </label>
      <label class="window-item">
        <span>结束时间</span>
        <input v-model="windowEnd" type="datetime-local" />
      </label>
      <p class="window-tip">在该时间段内，用户可自行排班和换班；超过结束时间自动锁定。未配置时间窗的月份用户不可排班。</p>
      <div class="window-save">
        <van-button size="small" type="primary" :loading="savingWindow" @click="onSaveWindow">保存时间窗</van-button>
      </div>
    </div>

    <div class="tip">
      <p>规则1：本月每人某值班类型最多可排的天数。</p>
      <p>规则2：本月每天某值班类型最多可安排的人数。</p>
      <p>规则3：本月每天某值班类型至少需要的人数，不满足时最后排班的人必须选择该班次。</p>
      <p>留空表示不限制，规则只对所选月份生效。</p>
    </div>

    <van-empty v-if="shiftTypes.length === 0" description="请先在值班类型中创建班次" />

    <van-cell-group v-else inset>
      <div v-for="type in shiftTypes" :key="type.id" class="rule-row">
        <div class="rule-name">
          <van-tag :color="type.color">{{ type.name }}</van-tag>
        </div>
        <van-field
          v-model="monthlyLimits[type.id]"
          type="number"
          label="每人每月≤"
          placeholder="不限"
        />
        <van-field
          v-model="dailyLimits[type.id]"
          type="number"
          label="每天人数≤"
          placeholder="不限"
        />
        <van-field
          v-model="minDailyLimits[type.id]"
          type="number"
          label="每天人数≥"
          placeholder="不限"
        />
      </div>
    </van-cell-group>

    <div class="save-wrap">
      <van-button round block type="primary" :loading="saving" @click="onSave">保存规则</van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { showToast } from 'vant'
import { getShiftTypes } from '@/api/shiftType'
import { getScheduleRules, saveScheduleRules } from '@/api/scheduleRule'
import { getScheduleWindow, saveScheduleWindow } from '@/api/scheduleWindow'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)

const shiftTypes = ref<any[]>([])
const monthlyLimits = reactive<Record<number, string>>({})
const dailyLimits = reactive<Record<number, string>>({})
const minDailyLimits = reactive<Record<number, string>>({})
const saving = ref(false)
const windowStart = ref('')
const windowEnd = ref('')
const savingWindow = ref(false)

const monthKey = () => `${year.value}-${String(month.value).padStart(2, '0')}`

// 后端返回 ISO 时间，转成 datetime-local 需要的本地格式 YYYY-MM-DDTHH:mm
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const loadWindow = async () => {
  const w = await getScheduleWindow(monthKey())
  windowStart.value = toLocalInput(w?.startAt)
  windowEnd.value = toLocalInput(w?.endAt)
}

const onSaveWindow = async () => {
  savingWindow.value = true
  try {
    await saveScheduleWindow({
      monthKey: monthKey(),
      startAt: windowStart.value ? new Date(windowStart.value).toISOString() : null,
      endAt: windowEnd.value ? new Date(windowEnd.value).toISOString() : null,
    })
    showToast('保存成功')
  } finally {
    savingWindow.value = false
  }
}

const resetLimits = () => {
  for (const key of Object.keys(monthlyLimits)) delete monthlyLimits[Number(key)]
  for (const key of Object.keys(dailyLimits)) delete dailyLimits[Number(key)]
  for (const key of Object.keys(minDailyLimits)) delete minDailyLimits[Number(key)]
}

const loadData = async () => {
  resetLimits()
  const [types, rules] = await Promise.all([
    getShiftTypes(),
    getScheduleRules(monthKey()),
    loadWindow(),
  ])
  shiftTypes.value = (types || []).filter((t: any) => t.status === 1)
  for (const r of rules || []) {
    const stId = Number(r.shiftTypeId)
    if (Number(r.ruleType) === 1) {
      monthlyLimits[stId] = String(r.maxCount)
    } else if (Number(r.ruleType) === 2) {
      dailyLimits[stId] = String(r.maxCount)
    } else if (Number(r.ruleType) === 3) {
      minDailyLimits[stId] = String(r.maxCount)
    }
  }
}

const changeMonth = (delta: number) => {
  const d = new Date(year.value, month.value - 1 + delta, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth() + 1
  loadData()
}

const onSave = async () => {
  const rules: { ruleType: number; shiftTypeId: number; maxCount: number }[] = []
  for (const t of shiftTypes.value) {
    const stId = Number(t.id)
    const monthly = parseInt(monthlyLimits[stId] || '', 10)
    const daily = parseInt(dailyLimits[stId] || '', 10)
    if (!isNaN(monthly) && monthly > 0) {
      rules.push({ ruleType: 1, shiftTypeId: stId, maxCount: monthly })
    }
    if (!isNaN(daily) && daily > 0) {
      rules.push({ ruleType: 2, shiftTypeId: stId, maxCount: daily })
    }
    const minDaily = parseInt(minDailyLimits[stId] || '', 10)
    if (!isNaN(minDaily) && minDaily > 0) {
      rules.push({ ruleType: 3, shiftTypeId: stId, maxCount: minDaily })
    }
  }
  saving.value = true
  try {
    await saveScheduleRules(monthKey(), rules)
    showToast('保存成功')
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.admin-rules {
  padding: 12px;
}

.month-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.month-text {
  font-size: 18px;
  font-weight: bold;
}

.tip {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #666;
}

.window-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.window-title {
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 8px;
}

.window-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.window-item input {
  border: 1px solid #ebedf0;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 14px;
  color: #323233;
}

.window-tip {
  font-size: 12px;
  color: #969799;
  margin: 4px 0 8px;
}

.window-save {
  text-align: right;
}

.tip p {
  margin: 4px 0;
}

.rule-row {
  padding: 8px 0;
}

.rule-name {
  padding: 4px 16px;
}

.save-wrap {
  margin-top: 16px;
}
</style>
