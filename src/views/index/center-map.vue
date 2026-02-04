<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from "vue";
import { centerMap, GETNOBASE } from "@/api";
import { ElMessage } from "element-plus";
import { createThreeMap, regionCodes } from "./center.map";
import type { MapdataType, ThreeMapInstance } from "./center.map";
import StatBoard from "./StatBoard.vue";
import SearchPane from "./SearchPane.vue";
const code = ref("210000");
const containerRef = ref<HTMLDivElement | null>(null);
let mapInstance: ThreeMapInstance | null = null;

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

const dataSetHandle = async (regionCode: string, list: object[]) => {
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
      console.log(cityCenter);
      mapData.push({
        name: item.name,
        value: cityCenter[item.name],
        total: item.total,
        rate: item.rate,
      });
    }
  });

  await nextTick();
  mapInstance?.update(geojson, mapData);
};

const getData = async (regionCode: string) => {
  centerMap({ regionCode })
    .then((res) => {
      if (res.success) {
        code.value = res.data.regionCode;
        dataSetHandle(res.data.regionCode, res.data.dataList);
      } else {
        ElMessage.error(res.msg);
      }
    })
    .catch((err) => {
      ElMessage.error(err);
    });
};

onMounted(() => {
  if (containerRef.value) {
    mapInstance = createThreeMap(containerRef.value, {
      onRegionClick: (name) => {
        const xzqData = (regionCodes as any)[name];
        if (xzqData) {
          getData(xzqData.adcode);
        } else {
          window["$message"].warning("暂无地市");
        }
      },
      onLabelClick: (data) => {
        console.log("label clicked:", data);
      },
    });
  }
  getData('210000');
});

onBeforeUnmount(() => {
  mapInstance?.dispose();
  mapInstance = null;
});
</script>

<template>
  <div class="centermap">
    <div class="mapwrap">
      <StatBoard/>
      <SearchPane class="search-pane-pos" />
      <!-- <div class="quanguo" @click="getData('china')" v-if="code !== 'china'">中国</div> -->
      <div class="three-map" ref="containerRef"></div>
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
    }

    .search-pane-pos {
      position: absolute;
      right: 0px;
      bottom: 24px;
      z-index: 12;
    }
  }
}

:deep(.map-label) {
    cursor: pointer;
    min-width: 150px;
    padding: 10px 14px;
    border-radius: 10px;
    background: linear-gradient(180deg, rgba(16, 56, 110, 0.92), rgba(8, 28, 60, 0.92));
    border: 1px solid rgba(120, 230, 255, 0.7);
    color: #d8f2ff;
    font-size: 12px;
    letter-spacing: 0.2px;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35), 0 0 14px rgba(60, 210, 255, 0.45);
    backdrop-filter: blur(6px);
    pointer-events: auto;
    position: relative;
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
    color: #7ff7ff;
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 6px;
  }

  :deep(.map-label__row) {
    line-height: 18px;
    color: #cfe9ff;
  }
</style>
