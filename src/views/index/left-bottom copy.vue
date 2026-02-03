<template>
  <div class="panel">
    <!-- 上方 cube -->
    <div class="cube-row">
      <CubePercent
        v-for="item in cubes"
        :key="item.id"
        :id="item.id"
        :percent="item.percent"
        :label="item.label"
        :size="80"
        @hover="onHover"
        @leave="onLeave"
      />
    </div>

    <!-- 下方箭头数据条 -->
    <div class="arrow-panel" v-if="active">
      <div
        class="arrow-row"
        v-for="row in active.rows"
        :key="row.label"
      >
        <div
          class="arrow-bg"
          :class="{ 'is-active': true }"
        >
          <span class="label">{{ row.label }}</span>
          <span class="value">{{ format(row.value) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import CubePercent from "./CubePercent.vue"

const cubes = [
  {
    id: "a",
    label: "安装占比",
    percent: 78,
    rows: [
      { label: "总签单保费", value: 895000 },
      { label: "已申请未安装车均保费", value: 895000 },
      { label: "已安装车均保费", value: 895000 },
    ],
  },
  {
    id: "b",
    label: "设备安装率",
    percent: 78,
    rows: [
      { label: "总签单保费", value: 812000 },
      { label: "已申请未安装车均保费", value: 765000 },
      { label: "已安装车均保费", value: 699000 },
    ],
  },
  {
    id: "c",
    label: "满期赔付率",
    percent: 78,
    rows: [
      { label: "总签单保费", value: 812000 },
      { label: "已申请未安装车均保费", value: 765000 },
      { label: "已安装车均保费", value: 699000 },
    ],
  },
  {
    id: "d",
    label: "利润占比",
    percent: 71,
    rows: [
      { label: "总签单保费", value: 812000 },
      { label: "已申请未安装车均保费", value: 765000 },
      { label: "已安装车均保费", value: 699000 },
    ],
  },
]

const activeId = ref<string | null>(null)

const active = computed(() =>
  cubes.find(i => i.id === activeId.value)
)

const onHover = (id: string) => {
  activeId.value = id
}

const onLeave = () => {
  activeId.value = null
}

const format = (num: number) =>
  num.toLocaleString()
</script>

<style scoped lang="scss">
.panel {
  width: 100%;
}

.cube-row {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 40px;
}

/* 箭头区域 */
.arrow-panel {
  margin-top: 36px;
}

.arrow-row {
  margin-bottom: 10px;
}

.arrow-bg {
  width: 460px;
  height: 34px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0 32px 0 48px;

  background: linear-gradient(
    to right,
    rgba(10, 60, 120, 0.9),
    rgba(5, 30, 80, 0.95)
  );

  clip-path: polygon(
    7% 50%,
    20px 0,
    100% 0,
    100% 100%,
    20px 100%
  );

  border: 1px solid rgba(0, 200, 255, 0.35);

  transition:
    background 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

/* 激活态 */
.arrow-bg.is-active {
  background: linear-gradient(
    to right,
    rgba(0, 180, 255, 0.95),
    rgba(0, 120, 200, 0.9)
  );

  border-color: rgba(0, 255, 255, 0.8);

  box-shadow:
    0 0 12px rgba(0, 255, 255, 0.45),
    inset 0 0 10px rgba(0, 255, 255, 0.35);
}

.label {
  font-size: 14px;
  color: #e6f6ff;
}

.value {
  font-size: 18px;
  font-weight: 600;
  color: #00f7ff;
}
</style>
