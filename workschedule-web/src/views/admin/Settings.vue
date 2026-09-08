<template>
  <div class="admin-settings">
    <div class="setting-card">
      <div class="setting-title">默认排班月份</div>
      <p class="setting-tip">
        设置用户首次进入「我的排班」和「总排班」时默认显示的月份。
        未设置时，将使用用户进入系统当天所属的月份。
      </p>
      <label class="month-input-wrap">
        <span>默认月份</span>
        <input v-model="monthValue" type="month" class="month-input" />
      </label>
      <div v-if="currentValue" class="current-value">
        当前设置：<strong>{{ currentValue }}</strong>
      </div>
      <div v-else class="current-value unset">当前未设置，默认使用本月</div>
    </div>

    <div class="save-wrap">
      <van-button round block type="primary" :loading="saving" @click="onSave">保存设置</van-button>
    </div>
    <div class="clear-wrap">
      <van-button round block plain hairline type="default" :loading="clearing" @click="onClear">恢复默认</van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { getSettings, updateSettings, type SettingItem } from '@/api/settings'
import { withLoading } from '@/utils/loading'

const SETTINGS_KEY = 'defaultScheduleMonth'
const REMARK = '用户进入排班页面默认显示的月份'

const monthValue = ref('')
const currentValue = ref('')
const saving = ref(false)
const clearing = ref(false)

const loadData = async () => {
  const list: SettingItem[] = await getSettings()
  const item = list.find((s) => s.settingKey === SETTINGS_KEY)
  currentValue.value = item?.settingValue || ''
  monthValue.value = currentValue.value
}

const onSave = async () => {
  saving.value = true
  try {
    await updateSettings([
      { settingKey: SETTINGS_KEY, settingValue: monthValue.value, remark: REMARK },
    ])
    currentValue.value = monthValue.value
    showToast('保存成功')
  } finally {
    saving.value = false
  }
}

const onClear = async () => {
  clearing.value = true
  try {
    await updateSettings([{ settingKey: SETTINGS_KEY, settingValue: '', remark: REMARK }])
    monthValue.value = ''
    currentValue.value = ''
    showToast('已恢复默认')
  } finally {
    clearing.value = false
  }
}

onMounted(() => {
  withLoading(loadData)
})
</script>

<style scoped>
.admin-settings {
  padding: 12px;
}

.setting-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.setting-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
}

.setting-tip {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 16px;
}

.month-input-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-top: 1px solid #f5f5f5;
  font-size: 14px;
}

.month-input {
  border: 1px solid #ebedf0;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 14px;
  color: #323233;
  min-width: 160px;
}

.current-value {
  margin-top: 12px;
  font-size: 13px;
  color: #333;
}

.current-value.unset {
  color: #969799;
}

.save-wrap {
  margin-bottom: 12px;
}

.clear-wrap {
  margin-bottom: 12px;
}
</style>
