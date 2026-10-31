<template>
  <div class="schedule-statistics">
    <div class="header">
      <div class="range-info">
        统计范围：{{ startMonth }} 至 {{ endMonth }}
      </div>
      <div v-if="userStore.isAdmin" class="header-actions">
        <van-button size="small" type="primary" @click="openStartPicker">设置起始月份</van-button>
        <van-button size="small" type="primary" @click="openEndPicker">设置结束月份</van-button>
      </div>
    </div>

    <div class="table-wrap">
      <table v-if="users.length > 0" class="statistics-table">
        <thead>
          <tr>
            <th class="name-col">人员</th>
            <th v-for="type in shiftTypes" :key="type.id" class="type-col">
              {{ type.name }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in matrix" :key="row.user.id">
            <td class="name-col">{{ row.user.realName }}</td>
            <td v-for="(count, index) in row.counts" :key="index" class="type-col">
              {{ count }}
            </td>
          </tr>
        </tbody>
      </table>
      <van-empty v-else description="暂无统计数据" />
    </div>

    <van-popup v-model:show="showPicker" position="bottom" round>
      <van-date-picker
        v-model="pickerValue"
        :title="pickerTitle"
        :columns-type="['year', 'month']"
        @confirm="onConfirm"
        @cancel="showPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/user'
import {
  getScheduleStatistics,
  getStatisticsStartMonth,
  setStatisticsStartMonth,
  getStatisticsEndMonth,
  setStatisticsEndMonth,
} from '@/api/scheduleStatistics'
import { withLoading } from '@/utils/loading'

const userStore = useUserStore()
const startMonth = ref('')
const endMonth = ref('')
const users = ref<any[]>([])
const shiftTypes = ref<any[]>([])
const matrix = ref<any[]>([])
const showPicker = ref(false)
const pickerType = ref<'start' | 'end'>('start')
const pickerValue = ref<string[]>([])

const pickerTitle = ref('选择月份')

const loadStatistics = async () => {
  const res = await getScheduleStatistics()
  startMonth.value = res.startMonth
  endMonth.value = res.endMonth
  users.value = res.users || []
  shiftTypes.value = res.shiftTypes || []
  matrix.value = res.matrix || []
}

const openStartPicker = async () => {
  pickerType.value = 'start'
  pickerTitle.value = '选择起始月份'
  const res = await getStatisticsStartMonth()
  pickerValue.value = (typeof res === 'string' ? res : res.startMonth).split('-')
  showPicker.value = true
}

const openEndPicker = async () => {
  pickerType.value = 'end'
  pickerTitle.value = '选择结束月份'
  const res = await getStatisticsEndMonth()
  pickerValue.value = (typeof res === 'string' ? res : res.endMonth).split('-')
  showPicker.value = true
}

const onConfirm = async ({ selectedValues }: any) => {
  const value = selectedValues.join('-')
  showPicker.value = false
  if (pickerType.value === 'start') {
    await withLoading(() => setStatisticsStartMonth(value), '保存中...')
  } else {
    await withLoading(() => setStatisticsEndMonth(value), '保存中...')
  }
  showToast('设置成功')
  loadStatistics()
}

onMounted(() => {
  withLoading(loadStatistics)
})
</script>

<style scoped>
.schedule-statistics {
  padding: 12px;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
  background: #fff;
  padding: 12px;
  border-radius: 8px;
}

.range-info {
  font-size: 14px;
  color: #333;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.table-wrap {
  overflow-x: auto;
  background: #fff;
  border-radius: 8px;
  padding: 8px;
}

.statistics-table {
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 100%;
}

.statistics-table th,
.statistics-table td {
  border: 1px solid #e0e0e0;
  text-align: center;
  padding: 8px 4px;
  font-size: 13px;
}

.statistics-table th {
  background: #fafafa;
  font-weight: bold;
}

.name-col {
  width: 80px;
  min-width: 80px;
  position: sticky;
  left: 0;
  background: #fafafa;
  z-index: 1;
}

.type-col {
  width: 70px;
  min-width: 70px;
}
</style>
