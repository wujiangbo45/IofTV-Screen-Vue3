<template>
  <div class="search-pane" :class="{ open: isOpen }" ref="rootRef">
    <button class="toggle" type="button" @click="toggle">
      <span class="gear">⚙</span>
      <span class="title">统计搜索设置</span>
      <span class="chev" :class="{ up: isOpen }">▴</span>
    </button>

    <transition name="pane">
      <div v-show="isOpen" class="panel">
        <div class="panel-inner">
          <div class="panel-title">地图展示数据</div>
        <div class="tabs">
          <button
            class="tab"
            type="button"
            :class="{ active: filters.metric === 'contract' }"
            @click="toggleMetric('contract')"
          >
            签约公司
          </button>
          <button
            class="tab"
            type="button"
            :class="{ active: filters.metric === 'install' }"
            @click="toggleMetric('install')"
          >
            安装车辆
          </button>
        </div>

        <div class="section-title">统计维度</div>
        <div class="filters stat-filters">
          <div class="field">
            <label>年</label>
            <el-select v-model="filters.year" size="small" class="select" popper-class="stat-select-popper">
              <el-option v-for="y in years" :key="y" :label="y" :value="y" />
            </el-select>
          </div>
          <div class="field">
            <label>月</label>
            <el-select v-model="filters.month" size="small" class="select" popper-class="stat-select-popper">
              <el-option v-for="m in months" :key="m" :label="m" :value="m" />
            </el-select>
          </div>
          <div class="field">
            <label>日</label>
            <el-select v-model="filters.day" size="small" class="select" popper-class="stat-select-popper">
              <el-option v-for="d in days" :key="d" :label="d" :value="d" />
            </el-select>
          </div>
          <div class="field">
            <label>使用性质</label>
            <el-select v-model="filters.type" size="small" class="select" popper-class="stat-select-popper">
              <el-option v-for="t in types" :key="t" :label="t" :value="t" />
            </el-select>
          </div>
          <div class="field">
            <label>车型</label>
            <el-select v-model="filters.car" size="small" class="select" popper-class="stat-select-popper">
              <el-option v-for="c in cars" :key="c" :label="c" :value="c" />
            </el-select>
          </div>
        </div>

        <div class="actions">
          <button class="btn primary" type="button" @click="onSearch">搜索</button>
          <button class="btn ghost" type="button" @click="onReset">重置</button>
        </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watchEffect } from "vue";

type Filters = {
  metric: "contract" | "install" | "";
  year: string;
  month: string;
  day: string;
  quarter: string;
  region: string;
  type: string;
  car: string;
};

const emit = defineEmits<{
  (e: "search", payload: Filters): void;
  (e: "reset", payload: Filters): void;
}>();

const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const toggle = () => {
  isOpen.value = !isOpen.value;
};

const years = Array.from({ length: 11 }, (_, i) => String(2025 + i));
const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const days = ref<string[]>([]);
const quarters = ["Q1", "Q2", "Q3", "Q4"];
const regions = ["All Insurers", "North", "East", "South", "Southwest", "Northwest"];
const types = ["All Usage Types", "Commercial", "Non-commercial"];
const cars = ["All Vehicles", "Passenger", "Commercial", "New Energy"];

const filters = reactive<Filters>({
  metric: "",
  year: "2025",
  month: "02",
  day: "01",
  quarter: "Q1",
  region: "All Insurers",
  type: "All Usage Types",
  car: "All Vehicles",
});

const updateDays = () => {
  const year = Number(filters.year);
  const month = Number(filters.month);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    days.value = [];
    return;
  }
  const maxDay = new Date(year, month, 0).getDate();
  days.value = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, "0"));
  if (!days.value.includes(filters.day)) {
    filters.day = days.value[0] ?? "01";
  }
};

updateDays();
watchEffect(updateDays);

const toggleMetric = (value: Filters['metric']) => {
  filters.metric = filters.metric == value ? '' : value;
};

const onSearch = () => {
  emit("search", { ...filters });
};

const onReset = () => {
  filters.metric = "";
  filters.year = "2025";
  filters.month = "02";
  filters.day = "01";
  filters.quarter = "Q1";
  filters.region = "All Insurers";
  filters.type = "All Usage Types";
  filters.car = "All Vehicles";
  updateDays();
  emit("reset", { ...filters });
};

const handleOutsideClick = (event: MouseEvent) => {
  if (!isOpen.value) return;
  const root = rootRef.value;
  if (!root) return;
  const target = event.target as HTMLElement | null;
  const inDropdown = !!target?.closest?.(".el-select-dropdown, .el-popper");
  if (event.target instanceof Node && !root.contains(event.target) && !inDropdown) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("mousedown", handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleOutsideClick);
});
</script>

<style scoped lang="scss">
.search-pane {
  width: 350px;
  color: #dff6ff;
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
}

.toggle {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid #1be2ff;
  border-radius: 4px;
  color: #eaf8ff;
  background: linear-gradient(180deg, rgba(0, 90, 170, 0.35), rgba(0, 40, 90, 0.85));
  box-shadow: inset 0 0 10px rgba(0, 220, 255, 0.3), 0 0 12px rgba(0, 120, 255, 0.25);
  cursor: pointer;
}

.toggle .gear {
  font-size: 18px;
}

.toggle .title {
  flex: 1;
  text-align: left;
  font-size: 15px;
  letter-spacing: 1px;
}

.toggle .chev {
  transition: transform 0.2s ease;
}

.toggle .chev.up {
  transform: rotate(180deg);
}

.pane-enter-active,
.pane-leave-active {
  transition: max-height 0.28s ease, transform 0.28s ease;
  overflow: hidden;
}

.pane-enter-from,
.pane-leave-to {
  max-height: 0;
  transform: translateY(-6px);
}

.pane-enter-to,
.pane-leave-from {
  max-height: 520px;
  transform: translateY(0);
}

.panel {
  margin-top: 6px;
  border: 1px solid rgba(40, 220, 255, 0.7);
  background: linear-gradient(180deg, rgba(2, 20, 45, 0.9), rgba(5, 35, 80, 0.95));
  box-shadow: inset 0 0 14px rgba(0, 180, 255, 0.35), 0 0 16px rgba(0, 120, 255, 0.3);
  overflow: hidden;
}

.panel-inner {
  padding: 12px 14px 14px;
}

.panel-title {
  font-size: 14px;
  color: #7de6ff;
  margin-bottom: 8px;
}

.tabs {
  display: flex;
  gap: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(80, 200, 255, 0.25);
  margin-bottom: 12px;
}

.tab {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  color: #a7e9ff;
  position: relative;
  cursor: pointer;
}

.tab.active {
  color: #ffffff;
}

.tab.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -8px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #7ff7ff, transparent);
  box-shadow: 0 0 10px rgba(80, 240, 255, 0.55);
}

.tab.active {
  text-shadow: 0 0 8px rgba(120, 230, 255, 0.6);
}

.section-title {
  font-size: 13px;
  color: #b9f0ff;
  margin-bottom: 10px;
}

.filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 10px;
}

.field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field label {
  width: 60px;
  font-size: 12px;
  color: #cfefff;
}

.select {
  flex: 1;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.btn {
  min-width: 66px;
  height: 28px;
  border-radius: 3px;
  border: 1px solid rgba(60, 200, 255, 0.4);
  background: rgba(6, 30, 60, 0.6);
  color: #e6f7ff;
  cursor: pointer;
}

.btn.primary {
  background: linear-gradient(180deg, rgba(0, 160, 255, 0.7), rgba(0, 90, 200, 0.8));
  border-color: rgba(0, 220, 255, 0.6);
  box-shadow: 0 0 10px rgba(0, 160, 255, 0.45);
}

.btn.ghost {
  opacity: 0.7;
}

/* 统计维度下拉框（年/月/日/使用性质/车型） */
:global(.stat-filters .el-select) {
  --el-input-bg-color: rgba(4, 10, 24, 1);
  --el-fill-color-blank: rgba(4, 10, 24, 1);
  --el-input-border-color: rgba(60, 170, 255, 0.35);
  --el-input-text-color: #d8f2ff;
  --el-input-hover-border-color: rgba(110, 220, 255, 0.7);
  --el-input-focus-border-color: rgba(110, 220, 255, 0.85);
  --el-border-color: rgba(60, 170, 255, 0.35);
  --el-text-color-regular: #d8f2ff;
}

:global(.stat-filters .el-select .el-input__wrapper) {
  background: linear-gradient(180deg, rgba(4, 14, 30, 0.98), rgba(4, 10, 24, 1)) !important;
  border: 1px solid rgba(60, 170, 255, 0.35) !important;
  box-shadow: inset 0 0 8px rgba(40, 140, 220, 0.18) !important;
}

:global(.stat-filters .el-select .el-input__inner) {
  color: #d8f2ff !important;
  font-size: 12px;
}

:global(.stat-filters .el-select .el-select__caret) {
  color: #6fdcff !important;
}

:global(.stat-filters .el-select .el-input__wrapper.is-focus) {
  border-color: rgba(110, 220, 255, 0.75) !important;
  box-shadow: inset 0 0 10px rgba(60, 180, 255, 0.28), 0 0 10px rgba(0, 120, 220, 0.28) !important;
}

/* 下拉面板样式（通过 popper-class 指定） */
:global(.stat-select-popper) {
  background: rgba(5, 16, 34, 0.98) !important;
  border: 1px solid rgba(60, 200, 255, 0.35) !important;
  box-shadow: 0 10px 20px rgba(2, 10, 28, 0.6), 0 0 12px rgba(0, 120, 220, 0.28) !important;
}

:global(.stat-select-popper .el-select-dropdown__item) {
  color: #cfefff;
}

:global(.stat-select-popper .el-select-dropdown__item.hover),
:global(.stat-select-popper .el-select-dropdown__item:hover) {
  background: rgba(8, 42, 90, 0.75);
  color: #ffffff;
}

:global(.stat-select-popper .el-select-dropdown__item.selected) {
  background: rgba(11, 124, 236, 0.85) !important;
  color: #ffffff !important;
}

:global(.stat-select-popper .el-select-dropdown__item[aria-selected="true"]),
:global(.stat-select-popper .el-select-dropdown__item.is-selected),
:global(.stat-select-popper .el-select-dropdown__item.is-active) {
  background: rgba(11, 125, 240, 0.85) !important;
  color: #ffffff !important;
}

:global(.stat-select-popper .el-select-dropdown) {
  background: rgba(5, 16, 34, 0.98) !important;
  border: 1px solid rgba(60, 200, 255, 0.35) !important;
  box-shadow: 0 10px 20px rgba(2, 10, 28, 0.6), 0 0 12px rgba(0, 120, 220, 0.28) !important;
}

:global(.stat-select-popper .el-select-dropdown__item) {
  color: #cfefff;
  position: relative;
}

:global(.stat-select-popper .el-select-dropdown__item.hover){
  background: rgba(227, 229, 233, 0.75);
  color: #ffffff;
}
:global(.stat-select-popper .el-select-dropdown__item.is-hovering) {
  background: rgba(56, 126, 224, 0.75);
  color: #ffffff;
}

:global(.stat-select-popper .el-select-dropdown__item.selected) {
  background: rgba(10, 90, 170, 0.85) !important;
  color: #ffffff !important;
}

:global(.stat-select-popper .el-select-dropdown__item[aria-selected="true"]),
:global(.stat-select-popper .el-select-dropdown__item.is-selected),
:global(.stat-select-popper .el-select-dropdown__item.is-active) {
  background: rgba(10, 90, 170, 0.85) !important;
  color: #ffffff !important;
}

:global(.stat-select-popper .el-select-dropdown__item[aria-selected="true"])::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(10, 90, 170, 0.85) !important;
  z-index: -1;
}
:deep(.el-select-dropdown__item.is-selected) {
  /* 你的样式 */
  background-color: rgba(199, 18, 172, 0.7) !important;
}
</style>
