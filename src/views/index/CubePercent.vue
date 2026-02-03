<template>
    <div
      class="cube-percent"
      :style="styleVars"
      @mouseenter="emit('hover', id)"
      @mouseleave="emit('leave')"
    >
      <div class="percent-text">{{ percent }}%</div>
      <div class="energy-beam"></div>
  
      <div class="cube">
        <div class="face top"></div>
        <div class="face bottom"></div>
        <div class="face front"></div>
        <div class="face back"></div>
        <div class="face left"></div>
        <div class="face right"></div>
      </div>
  
      <div class="cube-label">{{ label }}</div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { computed } from "vue";
  
  const emit = defineEmits<{
    (e: "hover", id: string): void
    (e: "leave"): void
  }>()
  
  const props = withDefaults(defineProps<{
    id: string
    percent: number
    label: string
    size?: number
  }>(), {
    size: 80
  })
  
  const styleVars = computed(() => ({
    "--cube-size": `${props.size}px`,
  }))
  </script>
  
  <style scoped lang="scss">
  .cube-percent {
    width: var(--cube-size);
    height: calc(var(--cube-size) * 2);
    display: flex;
    flex-direction: column;
    align-items: center;
    perspective: 800px;
    cursor: pointer;
  
    transition: transform 0.3s ease;
  }
  
  .cube-percent:hover {
    transform: scale(1.15) translateY(-6px);
  }
  
  /* 百分比 */
  .percent-text {
    font-size: calc(var(--cube-size) * 0.2);
    font-weight: 700;
    color: #7ffcff;
    margin-bottom: 6px;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
  }
  
  /* 能量光柱 */
  .energy-beam {
    width: calc(var(--cube-size) * 0.5);
    height: calc(var(--cube-size) * 0.35);
    margin-bottom: -8px;
    background: linear-gradient(
      to bottom,
      rgba(0, 255, 255, 0.9),
      rgba(0, 255, 255, 0)
    );
    filter: blur(6px);
  }
  
  /* 立方体 */
  .cube {
    width: calc(var(--cube-size) * 0.6);
    height: calc(var(--cube-size) * 0.6);
    position: relative;
    transform-style: preserve-3d;
    transform: rotateX(-25deg) rotateY(45deg);
    transition: transform 0.3s ease;
  }
  
  .cube-percent:hover .cube {
    transform: rotateX(-25deg) rotateY(45deg) scale(1.05);
  }
  
  /* 公共面 */
  .face {
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(0, 180, 255, 0.25);
    border: 1px solid rgba(0, 255, 255, 0.5);
    box-shadow: inset 0 0 20px rgba(0, 255, 255, 0.4);
  }
  
  /* hover 变色 */
  .cube-percent:hover .face {
    background: rgba(0, 220, 255, 0.35);
    box-shadow:
      inset 0 0 24px rgba(0, 255, 255, 0.5),
      0 0 12px rgba(0, 255, 255, 0.4);
  }
  
  /* 顶面 */
  .top {
    transform: rotateX(90deg) translateZ(calc(var(--cube-size) * 0.3));
    background: linear-gradient(135deg, #7ffcff, #00c8ff);
  }
  
  /* 底面 */
  .bottom {
    transform: rotateX(-90deg) translateZ(calc(var(--cube-size) * 0.3));
    background: rgba(0, 120, 180, 0.3);
  }
  
  /* 四侧 */
  .front { transform: translateZ(calc(var(--cube-size) * 0.3)); }
  .back { transform: rotateY(180deg) translateZ(calc(var(--cube-size) * 0.3)); }
  .left { transform: rotateY(-90deg) translateZ(calc(var(--cube-size) * 0.3)); }
  .right { transform: rotateY(90deg) translateZ(calc(var(--cube-size) * 0.3)); }
  
  /* 底部文字 */
  .cube-label {
    margin-top: 28px;
    font-size: calc(var(--cube-size) * 0.18);
    color: #baf6ff;
    text-align: center;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
  }
  
  .cube-percent:hover .cube-label {
    color: #ffffff;
  }
  </style>
  