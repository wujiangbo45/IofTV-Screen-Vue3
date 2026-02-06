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
        <div class="corner c1"></div>
        <div class="corner c2"></div>
        <div class="corner c3"></div>
        <div class="corner c4"></div>
        <div class="corner c5"></div>
        <div class="corner c6"></div>
        <div class="corner c7"></div>
        <div class="corner c8"></div>
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
    percent: number| undefined
    label: string |undefined
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
    color: #7ae9ff;
    margin-bottom: 6px;
    text-shadow: 0 0 12px rgba(80, 210, 255, 0.9);
  }
  
  /* 能量光柱 */
  .energy-beam {
    width: calc(var(--cube-size) * 0.5);
    height: calc(var(--cube-size) * 0.35);
    margin-bottom: -8px;
    background: linear-gradient(
      to bottom,
      rgba(120, 240, 255, 0.95),
      rgba(50, 140, 255, 0)
    );
    filter: blur(7px);
  }
  
  /* 立方体 */
  .cube {
    width: calc(var(--cube-size) * 0.6);
    height: calc(var(--cube-size) * 0.6);
    --half: calc(var(--cube-size) * 0.3);
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
    background: linear-gradient(135deg, rgba(18, 78, 180, 0.55), rgba(14, 180, 255, 0.2));
    border: 1px solid rgba(90, 210, 255, 0.55);
    box-shadow:
      inset 0 0 18px rgba(80, 190, 255, 0.45),
      0 0 10px rgba(40, 120, 255, 0.2);
  }
  
  /* hover 变色 */
  .cube-percent:hover .face {
    background: linear-gradient(135deg, rgba(0, 130, 150, 0.65), rgba(0, 230, 210, 0.35));
    box-shadow:
      inset 0 0 28px rgba(90, 255, 235, 0.75),
      0 0 18px rgba(80, 240, 220, 0.7);
  }
  
  /* 顶面 */
  .top {
    transform: rotateX(90deg) translateZ(calc(var(--cube-size) * 0.3));
    background: linear-gradient(135deg, #8ff2ff 0%, #2fd6ff 45%, #1aa2ff 100%);
    box-shadow:
      inset 0 0 18px rgba(120, 240, 255, 0.8),
      0 0 18px rgba(80, 210, 255, 0.6);
  }
  
  /* 底面 */
  .bottom {
    transform: rotateX(-90deg) translateZ(calc(var(--cube-size) * 0.3));
    background: rgba(8, 40, 120, 0.55);
  }
  
  /* 四侧 */
  .front { transform: translateZ(calc(var(--cube-size) * 0.3)); }
  .back { transform: rotateY(180deg) translateZ(calc(var(--cube-size) * 0.3)); }
  .left { transform: rotateY(-90deg) translateZ(calc(var(--cube-size) * 0.3)); }
  .right { transform: rotateY(90deg) translateZ(calc(var(--cube-size) * 0.3)); }

  .corner {
    position: absolute;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 0 10px rgba(140, 255, 255, 0.9);
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 2;
    left: 50%;
    top: 50%;
    transform: translate3d(var(--x), var(--y), var(--z)) translate(-50%, -50%);
  }
  .c1 { --x: calc(-1 * var(--half)); --y: calc(-1 * var(--half)); --z: var(--half); }
  .c2 { --x: var(--half); --y: calc(-1 * var(--half)); --z: var(--half); }
  .c3 { --x: calc(-1 * var(--half)); --y: var(--half); --z: var(--half); }
  .c4 { --x: var(--half); --y: var(--half); --z: var(--half); }
  .c5 { --x: calc(-1 * var(--half)); --y: calc(-1 * var(--half)); --z: calc(-1 * var(--half)); }
  .c6 { --x: var(--half); --y: calc(-1 * var(--half)); --z: calc(-1 * var(--half)); }
  .c7 { --x: calc(-1 * var(--half)); --y: var(--half); --z: calc(-1 * var(--half)); }
  .c8 { --x: var(--half); --y: var(--half); --z: calc(-1 * var(--half)); }

  .cube-percent:hover .corner {
    opacity: 1;
  }
  
  /* 底部文字 */
  .cube-label {
    margin-top: 28px;
    font-size: calc(var(--cube-size) * 0.18);
    color: #c6f2ff;
    text-align: center;
    text-shadow: 0 0 10px rgba(80, 210, 255, 0.45);
  }
  
  .cube-percent:hover .cube-label {
    color: #e8ffff;
    text-shadow: 0 0 12px rgba(90, 255, 235, 0.55);
  }
  </style>
  
