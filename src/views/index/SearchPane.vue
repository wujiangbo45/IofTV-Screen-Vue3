<template>
  <div class="search-pane" :class="{ open: isOpen }" ref="rootRef">
    <button class="toggle" type="button" @click="toggle">
      <span class="gear">⚙</span>
      <span class="title">Stats Dimension Settings</span>
      <span class="chev" :class="{ up: isOpen }">▴</span>
    </button>

    <transition name="pane">
      <div v-show="isOpen" class="panel">
        <div class="panel-inner">
          <div class="panel-title">Map Display Data</div>
        <div class="tabs">
          <button
            class="tab"
            type="button"
            :class="{ active: filters.metric === 'contract' }"
            @click="toggleMetric('contract')"
          >
            Contracted Companies
          </button>
          <button
            class="tab"
            type="button"
            :class="{ active: filters.metric === 'install' }"
            @click="toggleMetric('install')"
          >
            Installed Vehicles
          </button>
        </div>

        <div class="section-title">Statistics Range</div>
        <div class="filters">
          <div class="field">
            <label>Year</label>
            <el-select v-model="filters.year" size="small" class="select">
              <el-option v-for="y in years" :key="y" :label="y" :value="y" />
            </el-select>
          </div>
          <div class="field">
            <label>Month</label>
            <el-select v-model="filters.month" size="small" class="select">
              <el-option v-for="m in months" :key="m" :label="m" :value="m" />
            </el-select>
          </div>
          <div class="field">
            <label>Day</label>
            <el-select v-model="filters.day" size="small" class="select">
              <el-option v-for="d in days" :key="d" :label="d" :value="d" />
            </el-select>
          </div>
          <div class="field">
            <label>Region</label>
            <el-select v-model="filters.region" size="small" class="select">
              <el-option v-for="r in regions" :key="r" :label="r" :value="r" />
            </el-select>
          </div>
          <div class="field">
            <label>Usage</label>
            <el-select v-model="filters.type" size="small" class="select">
              <el-option v-for="t in types" :key="t" :label="t" :value="t" />
            </el-select>
          </div>
          <div class="field">
            <label>Vehicle</label>
            <el-select v-model="filters.car" size="small" class="select">
              <el-option v-for="c in cars" :key="c" :label="c" :value="c" />
            </el-select>
          </div>
        </div>

        <div class="actions">
          <button class="btn primary" type="button" @click="onSearch">Search</button>
          <button class="btn ghost" type="button" @click="onReset">Reset</button>
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
  if (event.target instanceof Node && !root.contains(event.target)) {
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

:deep(.el-select .el-input__wrapper) {
  background: rgba(10, 30, 60, 0.8);
  border-color: rgba(60, 200, 255, 0.4);
  box-shadow: none;
}

:deep(.el-select .el-input__inner) {
  color: #e6f7ff;
}
</style>
