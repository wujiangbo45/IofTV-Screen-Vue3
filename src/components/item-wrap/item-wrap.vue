<script setup lang="ts">
import BorderBoxNeo from "@/components/datav/border-box-neo";
const props = withDefaults(
  defineProps<{
    // 标题
    title: number | string;
  }>(),
  {
    title: "",
  }
);
</script>

<template>
  <BorderBoxNeo>
    <div class="item_title" v-if="title !== ''">
      <div class="zuo"></div>
      <span class="title-inner"> &nbsp;&nbsp;{{ title }}&nbsp;&nbsp; </span>
      <div class="you"></div>
    </div>
    <div
      :class="title !== '' ? 'item_title_content' : 'item_title_content_def'"
    >
      <slot></slot></div
  ></BorderBoxNeo>
</template>

<style scoped lang="scss">
$item-title-height: 38px;
$item_title_content-height: calc(100% - 38px);

.item_title {
  height: $item-title-height;
  line-height: $item-title-height;
  width: 100%;
  color: #8fe9ff;
  text-align: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 8px;
  margin-top: 20px;

  .zuo,
  .you {
    width: 46px;
    height: 2px;
    border-radius: 2px;
    background: linear-gradient(90deg, transparent, #45d7ff, #0a72d9);
    box-shadow: 0 0 10px rgba(80, 220, 255, 0.35);
  }

  .you {
    transform: scaleX(-1);
  }

  .title-inner {
    font-weight: 800;
    letter-spacing: 3px;
    font-size: 16px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid rgba(80, 210, 255, 0.35);
    background: linear-gradient(180deg, rgba(8, 26, 54, 0.75), rgba(5, 14, 28, 0.85));
    box-shadow: inset 0 0 10px rgba(70, 210, 255, 0.18);
    color: #8fe9ff;
  }
}

:deep(.dv-border-box-content)  {
    box-sizing: border-box;
    padding: 6px 16px 0px;
  }

.item_title_content {
  height: $item_title_content-height;
}

.item_title_content_def {
  width: 100%;
  height: 100%;
}
</style>
