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
            v-for="(digit, i) in item.displayDigits"
            :key="i"
          >
            <div class="card">
              <div class="card-upper">
                <span>{{ digit.current }}</span>
              </div>
              <div class="card-lower">
                <span>{{ digit.current }}</span>
              </div>
              <div class="flip-upper" :class="{ flipping: digit.flipping }">
                <span>{{ digit.current }}</span>
              </div>
              <div class="flip-lower" :class="{ flipping: digit.flipping }">
                <span>{{ digit.next }}</span>
              </div>
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
      displayDigits: format(0).map(d => ({
        current: d,
        next: d,
        flipping: false
      })),
      targetDigits: format(item.value)
    }))
  )
  
  function format(num) {
    return num.toString().padStart(5, '0').split('').map(Number)
  }
  
  const flipDuration = 320
  const tickInterval = 380

  function flipDigit(item, index, to) {
    const digit = item.displayDigits[index]
    if (digit.current === to) return
    digit.next = to
    digit.flipping = true
    setTimeout(() => {
      digit.current = to
      digit.flipping = false
    }, flipDuration)
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
            flipDigit(item, index, cur)
          }, tickInterval)
        }, index * 140)
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
    position: relative;
    transform: perspective(900px) rotateX(0deg);
    transform-style: preserve-3d;
    box-shadow:
      inset 0 0 30px rgba(0, 180, 255, 0.35),
      0 12px 24px rgba(2, 10, 28, 0.6),
      0 0 40px rgba(0, 120, 255, 0.35);
  }

  .stat-board::before {
    content: '';
    position: absolute;
    inset: 6px;
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 45%);
    transform: translateZ(6px);
    pointer-events: none;
  }

  .stat-board::after {
    content: '';
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: -12px;
    height: 12px;
    border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(0, 200, 255, 0.35), transparent 70%);
    filter: blur(6px);
    transform: translateZ(-10px);
    pointer-events: none;
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
    position: relative;
    transform: translateZ(8px);
    perspective: 600px;
  }

  .card {
    position: absolute;
    inset: 0;
    --digit-height: 56px;
    --digit-offset: 14px;
    --split-gap: 1px;
    border-radius: 6px;
    background: linear-gradient(
      180deg,
      #1b63ff 0%,
      #0a2e8a 46%,
      rgba(2, 8, 18, 0.65) 50%,
      #0a2e8a 54%,
      #0a2e8a 100%
    );
    box-shadow:
      inset 0 0 10px rgba(0, 200, 255, 0.9),
      0 6px 12px rgba(5, 20, 40, 0.6),
      0 0 14px rgba(0, 120, 255, 0.7);
    overflow: hidden;
    z-index: 0;
  }

  .card::before,
  .card::after {
    content: '';
    position: absolute;
    left: -2px;
    right: -2px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    z-index: 3;
  }

  .card::before {
    height: calc(var(--split-gap) + 4px);
    background: radial-gradient(circle, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.1) 70%);
    filter: blur(2px);
    opacity: 0.9;
  }

  .card::after {
    height: calc(var(--split-gap) + 1px);
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0),
      rgba(0, 0, 0, 0.9) 40%,
      rgba(0, 0, 0, 0)
    );
    box-shadow:
      0 -1px 0 rgba(255, 255, 255, 0.15) inset,
      0 1px 0 rgba(0, 0, 0, 0.65) inset;
    filter: blur(0.6px);
  }

  .card-upper,
  .card-lower,
  .flip-upper,
  .flip-lower {
    position: absolute;
    left: 0;
    right: 0;
    height: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 34px;
    font-weight: bold;
    color: #ffffff;
    text-shadow: 0 0 6px rgba(0, 200, 255, 0.8);
    backface-visibility: hidden;
    background: transparent;
    z-index: 1;
  }

  .card-upper,
  .flip-upper {
    top: 0;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
  }

  .card-lower,
  .flip-lower {
    bottom: 0;
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
  }

  .card-upper span,
  .card-lower span,
  .flip-upper span,
  .flip-lower span {
    line-height: var(--digit-height);
    display: block;
    height: var(--digit-height);
    position: relative;
    width: 100%;
    text-align: center;
  }

  .card-upper span,
  .flip-upper span {
    top: var(--digit-offset);
  }

  .card-lower span,
  .flip-lower span {
    top: calc(-0.5 * var(--digit-height) + var(--digit-offset));
  }


  .flip-upper {
    transform-origin: bottom;
    transform: rotateX(0deg);
  }

  .flip-lower {
    transform-origin: top;
    transform: rotateX(90deg);
  }

  .flip-upper.flipping {
    animation: flipUpper 0.32s ease-in forwards;
  }

  .flip-lower.flipping {
    animation: flipLower 0.32s ease-out forwards;
    animation-delay: 0.16s;
  }

  @keyframes flipUpper {
    0% { transform: rotateX(0deg); }
    100% { transform: rotateX(-90deg); }
  }

  @keyframes flipLower {
    0% { transform: rotateX(90deg); }
    100% { transform: rotateX(0deg); }
  }
  </style>
  
