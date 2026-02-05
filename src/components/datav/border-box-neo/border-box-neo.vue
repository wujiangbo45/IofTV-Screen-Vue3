<script setup lang="ts">
import { computed, ref } from "vue";
import { merge } from "lodash-es";
import { useElementSize } from "@vueuse/core";
import type { PropType } from "vue";

const props = defineProps({
  color: {
    type: Array as unknown as PropType<[string, string]>,
    default: () => [],
  },
  backgroundColor: {
    type: String,
    default: "transparent",
  },
});

const defaultColor = ["#31d6ff", "#0b6bd6"];
const domRef = ref(null);
const { width, height } = useElementSize(domRef, { width: 0, height: 0 }, { box: "border-box" });
const mergedColor = computed<[string, string]>(() => merge(defaultColor, props.color));
const uid = `neo-${Math.random().toString(36).slice(2, 10)}`;
const gradientId = `border-grad-${uid}`;
const glowId = `border-glow-${uid}`;
</script>

<template>
  <div class="dv-border-box-neo dv-border-box" ref="domRef">
    <svg :width="width" :height="height" class="dv-border-svg-container">
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="mergedColor[0]" stop-opacity="0.9" />
          <stop offset="100%" :stop-color="mergedColor[1]" stop-opacity="0.9" />
        </linearGradient>
        <filter :id="glowId" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        x="6"
        y="6"
        :width="Math.max(0, width - 12)"
        :height="Math.max(0, height - 12)"
        rx="10"
        ry="10"
        :fill="backgroundColor"
        :stroke="`url(#${gradientId})`"
        stroke-width="2"
      />

      <rect
        x="14"
        y="14"
        :width="Math.max(0, width - 28)"
        :height="Math.max(0, height - 28)"
        rx="8"
        ry="8"
        fill="none"
        :stroke="mergedColor[0]"
        stroke-opacity="0.45"
        stroke-width="1"
      />

      <g :stroke="mergedColor[0]" stroke-width="3" stroke-linecap="round" :filter="`url(#${glowId})`">
        <path :d="`M 20 20 L 58 20`" />
        <path :d="`M 20 20 L 20 58`" />
        <path :d="`M ${width - 20} 20 L ${width - 58} 20`" />
        <path :d="`M ${width - 20} 20 L ${width - 20} 58`" />
        <path :d="`M 20 ${height - 20} L 58 ${height - 20}`" />
        <path :d="`M 20 ${height - 20} L 20 ${height - 58}`" />
        <path :d="`M ${width - 20} ${height - 20} L ${width - 58} ${height - 20}`" />
        <path :d="`M ${width - 20} ${height - 20} L ${width - 20} ${height - 58}`" />
      </g>

      <g :stroke="mergedColor[1]" stroke-width="1" stroke-dasharray="6 6" stroke-opacity="0.5">
        <path :d="`M 80 10 L ${width - 80} 10`" />
        <path :d="`M 10 80 L 10 ${height - 80}`" />
        <path :d="`M ${width - 10} 80 L ${width - 10} ${height - 80}`" />
        <path :d="`M 80 ${height - 10} L ${width - 80} ${height - 10}`" />
      </g>
    </svg>

    <div class="dv-border-box-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dv-border-box {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
}
.dv-border-svg-container {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  display: block;
  pointer-events: none;
}
.dv-border-box-content {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
