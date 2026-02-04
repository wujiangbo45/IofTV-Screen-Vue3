<template>
  <div class="ring-dashboard">
    <div ref="chartRef" class="chart"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import * as echarts from "echarts";

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;

const option: echarts.EChartsOption = {
  tooltip: {
    trigger: "item",
  },
  legend: {
    top: "5%",
    left: "center",
    textStyle: {
      color: "#d9f1ff",
    },
  },
  series: [
    {
      name: "利润占比",
      type: "pie",
      radius: ["40%", "70%"],
      center: ["50%", "70%"],
      startAngle: 180,
      endAngle: 360,
      data: [
        { value: 1048, name: "人保" },
        { value: 735, name: "平安" },
        { value: 580, name: "太平洋" },
        { value: 484, name: "中意" }
      ],
    },
  ],
};

const renderChart = () => {
  if (!chartRef.value) return;
  if (!chart) chart = echarts.init(chartRef.value);
  chart.setOption(option);
};

const handleResize = () => chart?.resize();

onMounted(() => {
  renderChart();
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  chart?.dispose();
  chart = null;
});
</script>

<style scoped lang="scss">
.ring-dashboard {
  position: relative;
  width: 520px;
  height: 420px;
  margin-left: 10px;
  margin: 0 auto;
}

.chart {
  width: 100%;
  height: 100%;
}
</style>
