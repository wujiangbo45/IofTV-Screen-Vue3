<template>
    <div class="chart-wrap">
      <div ref="chartRef" class="chart"></div>
  
      <!-- 中心数字 -->
      <div class="center-text">
        <div class="value">3343</div>
        <div class="label">总数量</div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { onMounted, ref } from "vue";
  import * as echarts from "echarts";
  
  const chartRef = ref<HTMLDivElement>();
  
  const data = [
    { name: "人保", value: 33, color: "#4fc3ff" },
    { name: "太平洋", value: 33, color: "#4fffdf" },
    { name: "平安", value: 33, color: "#ffd15c" },
    { name: "国寿财", value: 19, color: "#6c8cff" }
  ];
  
  const buildSeries = () => {
    const baseRadius: [string, string] = ["46%", "66%"];
  
    return [
      // ===== 底部阴影层 =====
      {
        type: "pie",
        radius: baseRadius,
        center: ["50%", "65%"],
        silent: true,
        label: { show: false },
        data: data.map(d => ({
          value: d.value,
          itemStyle: { color: "rgba(0,0,0,0.35)" }
        }))
      },
  
      // ===== 中间厚度层 =====
      {
        type: "pie",
        radius: baseRadius,
        center: ["50%", "60%"],
        silent: true,
        label: { show: false },
        data: data.map(d => ({
          value: d.value,
          itemStyle: {
            color: echarts.color.lift(d.color, -0.35)
          }
        }))
      },
  
      // ===== 顶部数据层 =====
      {
        type: "pie",
        radius: ["45%", "65%"],
        center: ["50%", "60%"],
        label: { show: false },
        data: data.map(d => ({
          name: d.name,
          value: d.value,
          itemStyle: {
            color: d.color,
            shadowBlur: 20,
            shadowColor: d.color
          }
        }))
      }
    ];
  };
  
  onMounted(() => {
    const chart = echarts.init(chartRef.value!);
    chart.setOption({
      backgroundColor: "transparent",
      tooltip: { show: false },
      series: buildSeries()
    });
  });
  </script>
  
  <style scoped>
  .chart-wrap {
    position: relative;
    width: 420px;
    height: 320px;
    margin: 0 auto;
  }
  
  /* 关键：假 3D 透视 */
  .chart {
    width: 100%;
    height: 100%;
    transform: rotateX(60deg) translateY(-10px);
    transform-origin: center;
  }
  
  /* 中心文字 */
  .center-text {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
  }
  
  .center-text .value {
    font-size: 28px;
    font-weight: 700;
    color: #ffffff;
    text-shadow: 0 0 12px rgba(0, 255, 255, 0.8);
  }
  
  .center-text .label {
    margin-top: 4px;
    font-size: 12px;
    color: #8fdfff;
  }
  </style>
  