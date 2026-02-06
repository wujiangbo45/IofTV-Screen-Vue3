<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from "vue";
import { centerMap, GETNOBASE } from "@/api";
import { ElMessage } from "element-plus";
import { createThreeMap, regionCodes } from "./center.map";
import type { MapdataType, ThreeMapInstance } from "./center.map";
import StatBoard from "./StatBoard.vue";
import SearchPane from "./SearchPane.vue";

type SearchFilters = {
  metric: string;
  year: string;
  month: string;
  day: string;
  quarter: string;
  region: string;
  type: string;
  car: string;
};

const code = ref("210000");
const containerRef = ref<HTMLDivElement | null>(null);
let mapInstance: ThreeMapInstance | null = null;
let hasMapInitialized = false;
const isMapVisible = ref(false);
const isMapAnimating = ref(false);
const areLabelsVisible = ref(false);
const currentFilters = ref<SearchFilters | null>(null);
let revealTimer: number | null = null;
let labelRevealTimer: number | null = null;
let autoRefreshTimer: number | null = null;

const clearRevealTimer = () => {
  if (revealTimer !== null && typeof window !== "undefined") {
    window.clearTimeout(revealTimer);
    revealTimer = null;
  }
};

const clearLabelRevealTimer = () => {
  if (labelRevealTimer !== null && typeof window !== "undefined") {
    window.clearTimeout(labelRevealTimer);
    labelRevealTimer = null;
  }
};

const hideLabelsImmediately = () => {
  clearLabelRevealTimer();
  areLabelsVisible.value = false;
};

const showLabelsWithoutSequence = () => {
  clearLabelRevealTimer();
  areLabelsVisible.value = true;
};

const startLabelRevealSequence = (options?: { skipMarkerAnimation?: boolean }) => {
  const runSequence = () => {
    areLabelsVisible.value = true;
    if (!options?.skipMarkerAnimation) {
      mapInstance?.revealMarkers();
    }
  };

  if (typeof window === "undefined") {
    runSequence();
    return;
  }

  clearLabelRevealTimer();
  labelRevealTimer = window.setTimeout(() => {
    runSequence();
    labelRevealTimer = null;
  }, 560);
};

const prepareMapEntrance = () => {
  isMapVisible.value = false;
  isMapAnimating.value = true;
  clearRevealTimer();
  hideLabelsImmediately();
};

const finalizeMapEntrance = () => {
  const showMapWhenReady = () => {
    isMapVisible.value = true;
    startLabelRevealSequence();
  };

  if (!isMapAnimating.value) {
    showMapWhenReady();
    return;
  }

  if (typeof window === "undefined") {
    isMapAnimating.value = false;
    showMapWhenReady();
    return;
  }

  clearRevealTimer();
  revealTimer = window.setTimeout(() => {
    showMapWhenReady();
    isMapAnimating.value = false;
    revealTimer = null;
  }, 32);
};

const cancelMapEntrance = () => {
  clearRevealTimer();
  isMapAnimating.value = false;
  isMapVisible.value = true;
  showLabelsWithoutSequence();
};

const startAutoRefresh = () => {
  if (typeof window === "undefined") return;
  stopAutoRefresh();
  autoRefreshTimer = window.setInterval(() => {
    getData(code.value, { labelsOnly: true, params: currentFilters.value ?? undefined });
  }, 5000);
};

const stopAutoRefresh = () => {
  if (autoRefreshTimer !== null && typeof window !== "undefined") {
    window.clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
};

withDefaults(
  defineProps<{
    title: number | string;
  }>(),
  {
    title: "??",
  }
);

const getGeometryCenter = (geometry: any) => {
  if (!geometry || !geometry.coordinates) return null;
  const points: number[][] = [];
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0] || [];
    ring.forEach((pt: number[]) => points.push(pt));
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((poly: number[][][]) => {
      const ring = poly[0] || [];
      ring.forEach((pt: number[]) => points.push(pt));
    });
  }
  if (points.length === 0) return null;
  let sumX = 0;
  let sumY = 0;
  points.forEach((pt) => {
    sumX += pt[0];
    sumY += pt[1];
  });
  return [sumX / points.length, sumY / points.length];
};

const getGeojson = async (regionCode: string) => {
  const mapjson = await GETNOBASE(`./map-geojson/${regionCode}.json`).then((data) => data);
  return mapjson as any;
};

const buildMapData = async (regionCode: string, list: object[]) => {
  const geojson: any = await getGeojson(regionCode);
  const cityCenter: Record<string, number[]> = {};
  const mapData: MapdataType[] = [];

  geojson.features.forEach((element: any) => {
    const center =
      element.properties.centroid ||
      element.properties.center ||
      getGeometryCenter(element.geometry);
    if (center) {
      cityCenter[element.properties.name] = center;
    }
  });

  list.forEach((item: any) => {
    if (cityCenter[item.name]) {
      mapData.push({
        name: item.name,
        value: cityCenter[item.name],
        total: item.total,
        rate: item.rate,
      });
    }
  });

  return { geojson, mapData };
};

const applyMapUpdate = async (regionCode: string, list: object[]) => {
  const { geojson, mapData } = await buildMapData(regionCode, list);
  await nextTick();
  mapInstance?.update(geojson, mapData);
  finalizeMapEntrance();
  hasMapInitialized = true;
};

const rebuildMarkersOnly = async (
  regionCode: string,
  list: object[],
  options?: { revealLabels?: boolean }
) => {
  const { mapData } = await buildMapData(regionCode, list);
  await nextTick();
  mapInstance?.replaceMarkers(mapData);
  if (options?.revealLabels) {
    hideLabelsImmediately();
    startLabelRevealSequence();
  }
};

const refreshLabelsOnly = (list: object[], options?: { reveal?: boolean }) => {
  if (!Array.isArray(list) || list.length === 0) return;
  const payload = list
    .filter((item: any) => item && item.name)
    .map((item: any) => ({
      name: item.name,
      total: item.total,
      rate: item.rate,
    }));
  if (payload.length === 0) return;
  mapInstance?.updateLabels(payload);
  if (options?.reveal) {
    hideLabelsImmediately();
    startLabelRevealSequence({ skipMarkerAnimation: true });
  }
};

const getData = (
  regionCode: string,
  options?: {
    animate?: boolean;
    labelsOnly?: boolean;
    params?: Record<string, any> | null;
    revealLabels?: boolean;
    forceMapReload?: boolean;
    reloadMarkers?: boolean;
  }
) => {
  const {
    animate = false,
    labelsOnly = false,
    params,
    revealLabels = false,
    forceMapReload = false,
    reloadMarkers = false,
  } = options || {};

  const fallbackParams = params ?? currentFilters.value ?? undefined;
  const requestPayload = fallbackParams ? { ...fallbackParams, regionCode } : { regionCode };

  return centerMap(requestPayload)
    .then(async (res) => {
      if (!res.success) {
        ElMessage.error(res.msg);
        if (forceMapReload) {
          cancelMapEntrance();
        }
        return;
      }

      const incomingRegion = res.data.regionCode;
      const regionChanged = code.value !== incomingRegion;
      code.value = incomingRegion;
      const shouldUpdateMap = forceMapReload || regionChanged || !hasMapInitialized;

      if (shouldUpdateMap) {
        hideLabelsImmediately();
        if (animate) {
          prepareMapEntrance();
        }
        await applyMapUpdate(incomingRegion, res.data.dataList);
        return;
      }

      if (reloadMarkers) {
        await rebuildMarkersOnly(incomingRegion, res.data.dataList, { revealLabels: true });
        return;
      }

      if (labelsOnly) {
        refreshLabelsOnly(res.data.dataList, { reveal: revealLabels });
        return;
      }

      refreshLabelsOnly(res.data.dataList, { reveal: revealLabels });
    })
    .catch((err) => {
      ElMessage.error(err);
      if (forceMapReload) {
        cancelMapEntrance();
      }
    });
};

const applyFiltersAndReload = (filters: SearchFilters) => {
  currentFilters.value = { ...filters };
  stopAutoRefresh();
  getData(code.value, {
    reloadMarkers: true,
    params: currentFilters.value,
  }).finally(() => {
    startAutoRefresh();
  });
};

const handleSearch = (filters: SearchFilters) => {
  applyFiltersAndReload(filters);
};

const handleReset = (filters: SearchFilters) => {
  applyFiltersAndReload(filters);
};

onMounted(() => {
  if (containerRef.value) {
    mapInstance = createThreeMap(containerRef.value, {
      onRegionClick: (name) => {
        const xzqData = (regionCodes as any)[name];
        if (xzqData) {
          getData(xzqData.adcode, { animate: true, params: currentFilters.value ?? undefined });
        } else {
          // window["$message"].warning("暂无地市");
        }
      },
      onLabelClick: (data) => {
        console.log("label clicked:", data);
      },
    });
  }
  getData('210000', { animate: true, params: currentFilters.value ?? undefined });
  startAutoRefresh();
});

onBeforeUnmount(() => {
  mapInstance?.dispose();
  mapInstance = null;
  hasMapInitialized = false;
  cancelMapEntrance();
  hideLabelsImmediately();
  stopAutoRefresh();
});
</script>

<template>
  <div class="centermap">
    <div
      class="mapwrap"
      :class="{
        'mapwrap--visible': isMapVisible,
        'mapwrap--animating': isMapAnimating,
      }"
    >
      <div class="map-ring ring-1"></div>
      <div class="map-ring ring-2"></div>
      <div class="map-ring ring-3"></div>
      <StatBoard class="stat-board-pos"/>
      <SearchPane class="search-pane-pos" @search="handleSearch" @reset="handleReset" />
      <!-- <div class="quanguo" @click="getData('china')" v-if="code !== 'china'">中国</div> -->
      <div
        class="three-map"
        ref="containerRef"
        :class="{
          'three-map--hidden': !isMapVisible,
          'three-map--entering': isMapAnimating,
          'three-map--labels-visible': areLabelsVisible,
        }"
      ></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.centermap {
  margin-bottom: 10px;

  .mapwrap {
    height: 980px;
    width: 100%;
    padding-top: 25px;
    box-sizing: border-box;
    position: relative;
    border-radius: 24px;
    overflow: hidden;
    opacity: 0;
    transform: translateY(26px) scale(0.95);
    transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: opacity, transform;
    filter: none;

    &::before {
      content: "";
      position: absolute;
      inset: 10px;
      border-radius: 30px;
      background: radial-gradient(circle, rgba(0, 214, 255, 0.24) 0%, rgba(0, 85, 131, 0.05) 65%, transparent 100%);
      filter: blur(24px);
      z-index: 1;
      pointer-events: none;
    }

    &::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 32px;
      box-shadow: 0 0 45px rgba(0, 189, 255, 0.45), 0 0 120px rgba(0, 114, 255, 0.25);
      opacity: 0.8;
      z-index: 0;
      pointer-events: none;
    }

    .quanguo {
      position: absolute;
      right: 20px;
      top: 56px;
      width: 80px;
      height: 28px;
      border: 1px solid #00eded;
      border-radius: 10px;
      color: #00f7f6;
      text-align: center;
      line-height: 26px;
      letter-spacing: 6px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 237, 237, 0.5), 0 0 6px rgba(0, 237, 237, 0.4);
      z-index: 10;
    }

    .three-map {
      width: 100%;
      height: 100%;
      position: relative;
      z-index: 2;
      opacity: 1;
      transform: scale(1) translateY(0);
      transition: opacity 0.7s ease, transform 0.7s ease;
    }

    &.mapwrap--visible {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    &.mapwrap--animating {
      filter: drop-shadow(0 0 22px rgba(90, 220, 255, 0.35));
    }

    .three-map--hidden {
      opacity: 0;
      transform: scale(0.88) translateY(30px);
    }

    .three-map--entering {
      filter: drop-shadow(0 0 18px rgba(90, 220, 255, 0.5));
    }

    .three-map :deep(.map-label) {
      opacity: 0;
      transform: translateY(18px) scale(0.94);
      transition: opacity 0.55s ease;
      transition-delay: 0s;
      will-change: opacity;
    }

    .three-map--labels-visible :deep(.map-label) {
      opacity: 1;
      transform: translateY(0) scale(1);
      transition-delay: 0.2s;
    }

    .map-ring {
      position: absolute;
      left: 50%;
      top: 55%;
      width: 920px;
      height: 920px;
      transform: translate(-50%, -50%) rotateX(64deg) rotateZ(6deg);
      transform-style: preserve-3d;
      border-radius: 50%;
      background:
        repeating-radial-gradient(
          circle,
          rgba(120, 220, 255, 0.38) 0,
          rgba(120, 220, 255, 0.38) 1.2px,
          transparent 1.2px,
          transparent 14px
        );
      -webkit-mask: radial-gradient(circle, transparent 58%, #000 59%, #000 74%, transparent 75%);
      mask: radial-gradient(circle, transparent 58%, #000 59%, #000 74%, transparent 75%);
      filter: blur(0.3px);
      opacity: 0.65;
      z-index: 1;
      pointer-events: none;
      animation: map-ring-rotate 28s linear infinite;
    }

    .map-ring::after {
      content: "";
      position: absolute;
      inset: 10%;
      border-radius: 50%;
      border: 1.5px dashed rgba(160, 245, 255, 0.8);
      opacity: 0.9;
      box-shadow: 0 0 18px rgba(90, 220, 255, 0.45);
      animation: map-ring-rotate 40s linear infinite reverse;
    }

    .map-ring::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background:
        radial-gradient(circle, rgba(140, 230, 255, 0.9) 0 1.5px, transparent 2.5px) 18% 30% / 160px 160px,
        radial-gradient(circle, rgba(120, 220, 255, 0.7) 0 1px, transparent 2px) 72% 58% / 180px 180px,
        radial-gradient(circle, rgba(110, 210, 255, 0.6) 0 1px, transparent 2px) 42% 82% / 200px 200px;
      opacity: 0.7;
      filter: blur(0.4px);
      pointer-events: none;
      animation: map-ring-rotate 30s linear infinite;
    }

    .ring-2 {
      width: 760px;
      height: 760px;
      opacity: 0.6;
      filter: blur(0.4px);
      animation-duration: 34s;
      -webkit-mask: radial-gradient(circle, transparent 60%, #000 61%, #000 70%, transparent 71%);
      mask: radial-gradient(circle, transparent 60%, #000 61%, #000 70%, transparent 71%);
    }

    .ring-3 {
      width: 1120px;
      height: 1120px;
      opacity: 0.48;
      filter: blur(0.6px);
      animation-duration: 44s;
      -webkit-mask: radial-gradient(circle, transparent 66%, #000 67%, #000 74%, transparent 75%);
      mask: radial-gradient(circle, transparent 66%, #000 67%, #000 74%, transparent 75%);
    }

    .search-pane-pos {
      position: absolute;
      right: 0px;
      bottom: 24px;
      z-index: 12;
    }

    .stat-board-pos {
      position: relative;
      z-index: 10;
      margin-top: -2px;
    }
  }
}

@keyframes map-ring-rotate {
  to {
    transform: translate(-50%, -50%) rotateX(62deg) rotateZ(368deg);
  }
}

:deep(.map-label) {
    cursor: pointer;
    min-width: 168px;
    padding: 12px 16px;
    border-radius: 12px;
    background: linear-gradient(160deg, rgba(18, 64, 125, 0.95), rgba(6, 22, 48, 0.92));
    border: 1px solid rgba(130, 235, 255, 0.6);
    box-shadow:
      inset 0 0 0 1px rgba(120, 210, 255, 0.18),
      inset 0 0 16px rgba(60, 190, 255, 0.15),
      0 10px 24px rgba(0, 0, 0, 0.35),
      0 0 20px rgba(80, 220, 255, 0.35);
    color: #e6f7ff;
    font-family: "DIN Alternate", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 12px;
    letter-spacing: 0.3px;
    text-align: left;
    backdrop-filter: blur(8px);
    pointer-events: auto;
    position: relative;
    transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  }

  :deep(.map-label:hover) {
    border-color: rgba(160, 245, 255, 0.85);
    box-shadow:
      inset 0 0 0 1px rgba(120, 220, 255, 0.45),
      inset 0 0 22px rgba(80, 210, 255, 0.35),
      0 10px 24px rgba(0, 0, 0, 0.35),
      0 0 28px rgba(80, 220, 255, 0.85),
      0 0 46px rgba(80, 220, 255, 0.55);
    transform: translateY(-1px);
  }
  :deep(.map-label--active) {
    z-index: 999;
    border-color: rgba(170, 250, 255, 0.95);
    box-shadow:
      inset 0 0 0 1px rgba(150, 235, 255, 0.6),
      inset 0 0 26px rgba(90, 220, 255, 0.45),
      0 12px 26px rgba(0, 0, 0, 0.38),
      0 0 32px rgba(90, 230, 255, 0.95),
      0 0 56px rgba(90, 230, 255, 0.65);
    transform: translateY(-1px);
  }
  :deep(.map-label)::after {
    content: "";
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #6fe7ff, transparent);
    opacity: 0.8;
  }

  :deep(.map-label__title) {
    color: #88f7ff;
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 8px;
    letter-spacing: 0.6px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(120, 230, 255, 0.35);
  }

  :deep(.map-label__row) {
    line-height: 18px;
    color: #cfe9ff;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }
</style>
