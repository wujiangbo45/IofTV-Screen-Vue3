<script setup lang="ts">
import { onBeforeUnmount, reactive } from "vue";
import { useRouter } from "vue-router";
import dayjs from "dayjs";
import type { DateDataType } from "./index.d";
import { useSettingStore } from "@/stores/index";

const dateData = reactive<DateDataType>({
  dateDay: "",
  dateYear: "",
  dateWeek: "",
  timing: null,
});

const { setSettingShow } = useSettingStore();
const router = useRouter();
const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const updateTime = () => {
  dateData.dateYear = dayjs().format("YYYY-MM-DD");
  dateData.dateDay = dayjs().format("HH:mm:ss");
  dateData.dateWeek = weekday[dayjs().day()];
};

const timeFn = () => {
  updateTime();
  dateData.timing = setInterval(updateTime, 1000);
};

timeFn();

onBeforeUnmount(() => {
  if (dateData.timing) clearInterval(dateData.timing);
});
</script>


<template>
  <div class="d-flex jc-center title_wrap">
    <svg class="top-glow-svg" viewBox="0 0 1920 120" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="topGlow" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stop-color="rgba(0, 120, 220, 0)" />
          <stop offset="35%" stop-color="rgba(120, 230, 255, 0.9)" />
          <stop offset="65%" stop-color="rgba(120, 230, 255, 0.9)" />
          <stop offset="100%" stop-color="rgba(0, 120, 220, 0)" />
        </linearGradient>
        <radialGradient id="topGlowSoft" cx="50%" cy="0%" r="70%">
          <stop offset="0%" stop-color="rgba(120, 230, 255, 0.55)" />
          <stop offset="100%" stop-color="rgba(0, 80, 160, 0)" />
        </radialGradient>
        <filter id="topGlowBlur" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <rect x="0" y="0" width="1920" height="120" fill="url(#topGlowSoft)" filter="url(#topGlowBlur)" />
      <rect x="0" y="92" width="1920" height="6" rx="3" fill="url(#topGlow)" filter="url(#topGlowBlur)" />
      <line
        x1="0"
        y1="95"
        x2="1920"
        y2="95"
        stroke="rgba(120, 230, 255, 0.9)"
        stroke-width="4"
        stroke-linecap="round"
        stroke-dasharray="120 1800"
        filter="url(#topGlowBlur)"
      >
        <animate attributeName="stroke-dashoffset" from="0" to="-1920" dur="2.4s" repeatCount="indefinite" />
      </line>
    </svg>
    <div class="zuojuxing"></div>
    <div class="youjuxing"></div>
    <div class="guang"></div>
    <div class="d-flex jc-center">
      <div class="title">
        <span class="title-text">保险核算统计大屏</span>
      </div>
    </div>
    <div class="timers">
      <div class="home_icon" title="返回系统" @click="router.push('/')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.5 3 11h2v8h5v-5h4v5h5v-8h2L12 3.5z" fill="currentColor" />
        </svg>
      </div>
      <div class="time-panel">
        <div class="time-meta">
          <span class="time-date">{{ dateData.dateYear }}</span>
          <span class="time-week">{{ dateData.dateWeek }}</span>
        </div>
        <div class="time-roller">
          <span
            v-for="(ch, idx) in dateData.dateDay.split('')"
            :key="idx"
            class="time-char"
            :class="{ 'is-sep': ch === ':' }"
          >
            <span v-if="ch === ':'" class="time-sep">:</span>
            <span v-else class="digit">
              <span class="digit-strip" :style="{ transform: 'translateY(-' + Number(ch) * 10 + '%)' }">
                <span v-for="n in 10" :key="n" class="digit-item">{{ n - 1 }}</span>
              </span>
            </span>
          </span>
        </div>
      </div>

      <div class="setting_icon" title="设置" @click="setSettingShow(true)">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.06 7.06 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.title_wrap {
  height: 60px;
  background-image: url("../assets/img/top.png");
  background-size: cover;
  background-position: center center;
  position: relative;
  margin-bottom: 4px;
  .top-glow-svg {
    position: absolute;
    inset: -20px 0 auto 0;
    height: 100px;
    width: 100%;
    pointer-events: none;
    opacity: 0.9;
    mix-blend-mode: screen;
  }
  .guang {
    position: absolute;
    bottom: -26px;
    background-image: url("../assets/img/guang.png");
    background-position: 80px center;
    width: 100%;
    height: 56px;
  }

  .zuojuxing,
  .youjuxing {
    position: absolute;
    top: -2px;
    width: 140px;
    height: 6px;
    background-image: url("../assets/img/headers/juxing1.png");
  }

  .zuojuxing {
    left: 11%;
  }

  .youjuxing {
    right: 11%;
    transform: rotate(180deg);
  }

  .timers {
    position: absolute;
    right: 13px;
    top: 11px;
    display: flex;
    align-items: center;
    gap: 10px;

    .home_icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #7feaff;
      background: rgba(8, 26, 54, 0.85);
      border: 1px solid rgba(120, 230, 255, 0.3);
      box-shadow: inset 0 0 8px rgba(70, 210, 255, 0.15);
      cursor: pointer;

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .home_icon:hover,
    .setting_icon:hover {
      border-color: rgba(140, 240, 255, 0.7);
      box-shadow:
        inset 0 0 10px rgba(90, 230, 255, 0.25),
        0 4px 10px rgba(30, 160, 220, 0.35);
      transform: translateY(-1px);
      transition: all 0.2s ease;
    }

    .time-panel {
      padding: 6px 12px;
      border-radius: 10px;
      border: 1px solid rgba(120, 230, 255, 0.35);
      background: linear-gradient(180deg, rgba(8, 26, 54, 0.85), rgba(5, 14, 28, 0.9));
      box-shadow: inset 0 0 0 1px rgba(70, 200, 255, 0.15), 0 6px 16px rgba(0, 0, 0, 0.35);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .time-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: #bfe9ff;
      letter-spacing: 0.4px;
    }

    .time-week {
      padding: 2px 6px;
      border-radius: 6px;
      background: rgba(40, 160, 210, 0.18);
      color: #7feaff;
    }

    .time-roller {
      display: flex;
      align-items: center;
      gap: 2px;
      font-family: "DIN Alternate", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }

    .time-char {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 28px;
      border-radius: 6px;
      background: rgba(10, 34, 68, 0.65);
      box-shadow: inset 0 0 8px rgba(70, 210, 255, 0.12);
      overflow: hidden;
    }

    .time-char.is-sep {
      width: 8px;
      background: transparent;
      box-shadow: none;
    }

    .time-sep {
      color: #9be8ff;
      font-weight: 700;
      font-size: 16px;
      line-height: 1;
    }

    .digit {
      width: 100%;
      height: 100%;
      display: block;
      position: relative;
    }

    .digit-strip {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      transition: transform 0.45s ease;
    }

    .digit-item {
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      color: #7ff7ff;
      text-shadow: 0 0 6px rgba(100, 240, 255, 0.35);
    }

    .setting_icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #7feaff;
      background: rgba(8, 26, 54, 0.85);
      border: 1px solid rgba(120, 230, 255, 0.3);
      box-shadow: inset 0 0 8px rgba(70, 210, 255, 0.15);
      cursor: pointer;

      svg {
        width: 18px;
        height: 18px;
        filter: drop-shadow(0 0 6px rgba(100, 240, 255, 0.35));
      }
    }
  }

}
.title {
  position: relative;
  // width: 500px;
  text-align: center;
  background-size: cover;
  color: transparent;
  height: 60px;
  line-height: 46px;
  padding-bottom: 8px;

  &::after {
    content: "";
    position: absolute;
    left: 50%;
    bottom: 6px;
    width: 320px;
    height: 2px;
    transform: translateX(-50%);
    background: linear-gradient(90deg, transparent, rgba(120, 230, 255, 0.95), transparent);
    box-shadow: 0 0 10px rgba(80, 200, 255, 0.5);
    opacity: 0.9;
  }

  &::before {
    content: "";
    position: absolute;
    left: calc(50% - 160px);
    bottom: 4px;
    width: 320px;
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(90deg, transparent, rgba(160, 255, 255, 0.95), transparent);
    background-size: 200% 100%;
    background-position: 0% 50%;
    filter: blur(0.4px);
    animation: title-sweep 2.8s ease-in-out infinite;
  }

  .title-text {
    font-size: 38px;
    font-weight: 900;
    letter-spacing: 6px;
    width: 100%;
    background: linear-gradient(
      92deg,
      #0072ff 0%,
      #00eaff 48.8525390625%,
      #01aaff 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}

@keyframes title-sweep {
  0% {
    background-position: 0% 50%;
    opacity: 0.2;
  }
  45% {
    opacity: 1;
  }
  100% {
    background-position: 100% 50%;
    opacity: 0.2;
  }
}
</style>
