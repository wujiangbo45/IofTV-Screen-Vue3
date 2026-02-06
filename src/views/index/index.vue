<script setup lang="ts">
import ItemWrap from "@/components/item-wrap";
import LeftTop from "./left-top.vue";
import LeftCenter from "./left-center.vue";
import LeftBottom from "./left-bottom.vue";
import CenterMap from "./center-map.vue";
import CenterBottom from "./center-bottom.vue";
import RightTop from "./right-top.vue";
import RightCenter from "./right-center.vue";
import HumanBodyView  from "./HumanBodyView.vue";
</script>

<template>
  <div class="index-box">
    <div class="contetn_left">
      <!-- <div class="pagetab">
        <div class="item">实时监测</div>
        <div class="item">统计分析</div>
      </div> -->
      <ItemWrap class="contetn_left-top contetn_lr-item load-item load-1" title="利润总额占比">
        <LeftTop />
      </ItemWrap>
      <ItemWrap
        class="contetn_left-bottom contetn_lr-item load-item load-2"
        title="业务数据统计"
        style="padding: 0 10px 16px 10px"
      >
        <LeftBottom />
      </ItemWrap>
    </div>
    <div class="contetn_center">
      <CenterMap class="contetn_center_top load-item load-3" title="设备分布图" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.index-box {
  width: 100%;
  display: flex;
  min-height: calc(100% - 64px);
  justify-content: space-between;
  position: relative;
}
//左边 右边 结构一样
.contetn_left,
.contetn_right {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  position: relative;
  width: 540px;
  box-sizing: border-box;
  flex-shrink: 0;
}
.contetn_center {
  flex: 1;
  margin: 0 54px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  .contetn_center-bottom {
    height: 315px;
  }
}

.contetn_lr-item {
  height: 450px;
}

.screen-title {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 6px;
  color: #c9f3ff;
  text-shadow: 0 0 12px rgba(90, 220, 255, 0.35);
  opacity: 0;
  pointer-events: none;
  animation: screen-title-fade 2.6s ease forwards;
}

.load-item {
  opacity: 0;
  animation: screen-fade-in 0.9s ease forwards;
}

.load-1 {
  animation-delay: 0.6s;
}

.load-2 {
  animation-delay: 1.1s;
}

.load-3 {
  animation-delay: 1.6s;
  animation-duration: 2s;
  animation-timing-function: ease-in-out;
}

@keyframes screen-title-fade {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-6px);
  }
  20% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes screen-fade-in {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

</style>
