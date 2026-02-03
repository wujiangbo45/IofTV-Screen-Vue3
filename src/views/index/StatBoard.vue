<template>
    <div class="stat-board">
      <!-- 左侧凹槽箭头 -->
      <div class="edge-arrow left">
        <span class="icon">›</span>
      </div>
  
      <!-- 中间指标 -->
      <div
        class="stat-item"
        v-for="item in statList"
        :key="item.title"
      >
        <div class="title">
          {{ item.title }}
          <span class="unit">（{{ item.unit }}）</span>
        </div>
  
        <div class="digits">
          <div
            class="digit"
            v-for="(d, i) in item.displayDigits"
            :key="i"
          >
            <div
              class="digit-inner"
              :style="{ transform: `translateY(-${d * 56}px)` }"
            >
              <span v-for="n in 10" :key="n">{{ n - 1 }}</span>
            </div>
          </div>
        </div>
      </div>
  
      <!-- 右侧凹槽箭头 -->
      <div class="edge-arrow right">
        <span class="icon">›</span>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  
  const rawList = [
    { title: '抚顺市昨日利润', unit: '万元', value: 103 },
    { title: '抚顺市昨日安装数', unit: '辆', value: 316 },
    { title: '抚顺市昨日签约企业数', unit: '个', value: 424 }
  ]
  
  const statList = ref(
    rawList.map(item => ({
      ...item,
      displayDigits: Array(5).fill(0),
      targetDigits: format(item.value)
    }))
  )
  
  function format(num) {
    return num.toString().padStart(5, '0').split('').map(Number)
  }
  
  function startFlip() {
    statList.value.forEach(item => {
      item.targetDigits.forEach((target, index) => {
        let cur = 0
        setTimeout(() => {
          const timer = setInterval(() => {
            if (cur >= target) {
              cur = target
              clearInterval(timer)
            } else {
              cur++
            }
            item.displayDigits[index] = cur
          }, 40)
        }, index * 120)
      })
    })
  }
  
  onMounted(startFlip)
  </script>
  
  <style scoped lang="scss">
  /* ===== 外框 ===== */
  .stat-board {
    display: flex;
    align-items: center;
    padding: 18px 30px;
    background: linear-gradient(180deg, #0b2c5f, #071c3a);
    border-radius: 10px;
    box-shadow:
      inset 0 0 30px rgba(0, 180, 255, 0.35),
      0 0 40px rgba(0, 120, 255, 0.35);
  }
  
  /* ===== 凹槽发光箭头 ===== */
  .edge-arrow {
    width: 36px;
    height: 72px;
    position: relative;
    border-radius: 6px;
    background: linear-gradient(180deg, #071a33, #0b2c5f);
    box-shadow:
      inset 2px 0 6px rgba(0, 0, 0, 0.6),
      inset -2px 0 6px rgba(0, 0, 0, 0.6);
  }
  
  .edge-arrow::before,
  .edge-arrow::after {
    content: '';
    position: absolute;
    top: 6px;
    bottom: 6px;
    width: 2px;
    background: linear-gradient(
      180deg,
      transparent,
      #00eaff,
      transparent
    );
    filter: blur(1px);
  }
  
  .edge-arrow::before { left: 0 }
  .edge-arrow::after { right: 0 }
  
  .edge-arrow .icon {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: bold;
    color: #dfffff;
    text-shadow:
      0 0 6px rgba(0, 234, 255, 0.9),
      0 0 12px rgba(0, 234, 255, 0.6);
  }
  
  .edge-arrow.right {
    transform: rotate(180deg);
  }
  
  /* ===== 指标 ===== */
  .stat-item {
    flex: 1;
    text-align: center;
    color: #d6f2ff;
  }
  
  .title {
    font-size: 16px;
    margin-bottom: 12px;
    color: #e6f6ff;
  
    .unit {
      font-size: 13px;
      opacity: 0.7;
    }
  }
  
  /* ===== 数字翻牌 ===== */
  .digits {
    display: flex;
    justify-content: center;
    gap: 8px;
  }
  
  .digit {
    width: 42px;
    height: 56px;
    overflow: hidden;
    border-radius: 6px;
    background: linear-gradient(180deg, #1b63ff, #0a2e8a);
    box-shadow:
      inset 0 0 10px rgba(0, 200, 255, 0.9),
      0 0 14px rgba(0, 120, 255, 0.7);
  }
  
  .digit-inner {
    transition: transform 0.6s cubic-bezier(.22,.61,.36,1);
  }
  
  .digit-inner span {
    display: block;
    height: 56px;
    line-height: 56px;
    font-size: 30px;
    font-weight: bold;
    color: #ffffff;
    text-align: center;
    text-shadow: 0 0 6px rgba(0, 200, 255, 0.8);
  }
  </style>
  