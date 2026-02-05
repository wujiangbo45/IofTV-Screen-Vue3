import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import * as d3 from "d3";
const mapTextureUrl = new URL("../../assets/img/image2.png", import.meta.url).href;

export interface MapdataType {
  name: string;
  value: [number, number] | [number, number, number] | number[];
  total?: number;
  rate?: string;
}

export interface ThreeMapInstance {
  init: (geojson: any, mapData: MapdataType[]) => void;
  update: (geojson: any, mapData: MapdataType[]) => void;
  dispose: () => void;
}

/**
 * 三维地图创建函数
 * 负责初始化场景、绘制地图、画数据标记、监听事件并维护相关状态
 * 方法：init/update/dispose
 */
/**
 */
export const createThreeMap = (
  container: HTMLElement,
  options?: {
    onRegionClick?: (name: string) => void;
    onLabelClick?: (data: MapdataType) => void;
  }
): ThreeMapInstance => {
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let labelRenderer: CSS2DRenderer | null = null;
  let controls: OrbitControls | null = null;
  let animationId = 0;
  let resizeObserver: ResizeObserver | null = null;
  let mapGroup: THREE.Group | null = null;
  let markerGroup: THREE.Group | null = null;
  let pulseMeshes: THREE.Object3D[] = [];
  let labelObjects: CSS2DObject[] = [];
  let activeLabelObject: CSS2DObject | null = null;
  let glowPathMaterials: THREE.ShaderMaterial[] = [];
  let regionMeshes: THREE.Mesh[] = [];
  let lastGeojson: any = null;
  let lastData: MapdataType[] = [];
  let hoveredMesh: THREE.Mesh | null = null;
  let hoveredRegionKey: string | null = null;
  let hoveredRegionMeshes: THREE.Mesh[] = [];
  let selectedRegionKey: string | null = null;
  let selectedRegionMeshes: THREE.Mesh[] = [];
  let regionMeshMap: Record<string, THREE.Mesh[]> = {};

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // 纹理加载器：用于地图顶面纹理贴图
const textureLoader = new THREE.TextureLoader();
  // 提取地图外边线：用于画直边菜单光晕
type EdgeRecord = {
  a: THREE.Vector3;
  b: THREE.Vector3;
  aKey: string;
  bKey: string;
};
  // 点三维坐标去重用的 key，减少浮动误差
const pointKey = (x: number, y: number) => `${x.toFixed(5)},${y.toFixed(5)}`;
  // 收集边线，内部重合线会被抛出，最终只保留外边线
const accumulateEdge = (collector: Map<string, EdgeRecord>, a: THREE.Vector3, b: THREE.Vector3) => {
  const aKey = pointKey(a.x, a.y);
  const bKey = pointKey(b.x, b.y);
  const edgeKey = aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
  if (collector.has(edgeKey)) {
    collector.delete(edgeKey);
    return;
  }
  collector.set(edgeKey, { a: a.clone(), b: b.clone(), aKey, bKey });
};
  // 将边线有序串起来，组成一条或多条封闭較线（辨别最大外圈用）
const buildBoundaryLoops = (collector: Map<string, EdgeRecord>) => {
  const adjacency = new Map<string, { point: THREE.Vector3; neighbors: Set<string> }>();
  collector.forEach(({ a, b, aKey, bKey }) => {
    if (!adjacency.has(aKey)) adjacency.set(aKey, { point: a.clone(), neighbors: new Set() });
    if (!adjacency.has(bKey)) adjacency.set(bKey, { point: b.clone(), neighbors: new Set() });
    adjacency.get(aKey)!.neighbors.add(bKey);
    adjacency.get(bKey)!.neighbors.add(aKey);
  });
  const loops: THREE.Vector3[][] = [];
  const pickStart = () => {
    for (const [key, node] of adjacency.entries()) {
      if (node.neighbors.size > 0) return key;
    }
    return null;
  };
  let startKey = pickStart();
  while (startKey) {
    const loop: THREE.Vector3[] = [];
    let currentKey = startKey;
    let previousKey: string | null = null;
    while (true) {
      const currentNode = adjacency.get(currentKey);
      if (!currentNode) break;
      loop.push(currentNode.point.clone());
      const nextKey = [...currentNode.neighbors].find((candidate) => candidate !== previousKey);
      if (!nextKey) break;
      currentNode.neighbors.delete(nextKey);
      adjacency.get(nextKey)?.neighbors.delete(currentKey);
      previousKey = currentKey;
      currentKey = nextKey;
      if (currentKey === startKey) {
        loop.push(adjacency.get(startKey)!.point.clone());
        break;
      }
    }
    if (loop.length > 3) loops.push(loop);
    startKey = pickStart();
  }
  return loops;
};
  // 发光管道材质：使用 shader 作软边明暗衔接
const createGlowPathMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      uPrimary: { value: new THREE.Color("#2bc4ff") },
      uSecondary: { value: new THREE.Color("#0f5a9b") },
      uOpacity: { value: 1.0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uPrimary;
      uniform vec3 uSecondary;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float radial = 1.0 - abs(vUv.y - 0.5) * 2.0;
        radial = smoothstep(0.0, 0.7, radial);
        float soft = smoothstep(0.0, 0.3, 1.0 - abs(vUv.x - 0.5));
        float intensity = radial * 0.35 + soft * 0.2;
        vec3 color = mix(uSecondary, uPrimary, radial);
        float alpha = intensity * 0.6 * uOpacity;
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
// const mapTexture = textureLoader.load(mapTextureUrl);
  // mapTexture.colorSpace = THREE.SRGBColorSpace;
  // mapTexture.wrapS = THREE.ClampToEdgeWrapping;  // 避免重�
  // mapTexture.wrapT = THREE.ClampToEdgeWrapping;
  // mapTexture.repeat.set(1, 1);                  // 整张图片覆盖
  // mapTexture.offset.set(0, 0);
  const disposeGroup = (group: THREE.Group | null) => {
    if (!group) return;
    group.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose?.());
        else obj.material.dispose?.();
      }
    });
  };

  /**
   * 基于 geojson 和数据构建场景元素
   * 1) 投影线坐标
   * 2) 挤出地图面并绘制边线
   * 3) 绘制外圈光晕及数据标记
   */
  /**
   */
  const buildMap = (geojson: any, mapData: MapdataType[], width: number, height: number) => {
    if (!scene) return;

    if (mapGroup) {
      scene.remove(mapGroup);
      disposeGroup(mapGroup);
    }
    if (markerGroup) {
      scene.remove(markerGroup);
      disposeGroup(markerGroup);
    }

    mapGroup = new THREE.Group();
    markerGroup = new THREE.Group();
    if (labelRenderer) {
      labelRenderer.domElement.innerHTML = "";
    }
    labelObjects = [];
    activeLabelObject = null;
    pulseMeshes = [];
    const boundaryEdgeMap = new Map<string, EdgeRecord>();
    regionMeshes = [];
    glowPathMaterials = [];
    hoveredMesh = null;
    hoveredRegionKey = null;
    hoveredRegionMeshes = [];
    regionMeshMap = {};
    selectedRegionKey = null;
    selectedRegionMeshes = [];

    // 使用 d3 将地理坐标投影到屏幕坐标系
    const projection = d3.geoMercator().fitSize([width *30, height * 30], geojson);

    const projectPoint = (lng: number, lat: number) => {
      const p = projection([lng, lat]);
      if (!p) return null;
      const x = p[0] - width / 2;
      const y = -(p[1] - height / 2);
      return [x, y];
    };

    // 挤出配置：提升三维厚度
    const extrudeSettings = {
      depth: 20,
      bevelEnabled: false,
    };

    // 遍历每一个地区，构建地图面、顶面和边线
    geojson.features.forEach((feature: any) => {
      const geom = feature.geometry;
      const name = feature.properties?.name || "";
      const polygons = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;

      polygons.forEach((polygon: number[][][]) => {
        const shape = new THREE.Shape();
        const outlinePoints: THREE.Vector3[] = [];
        polygon[0].forEach((pt: number[], idx: number) => {
          const projected = projectPoint(pt[0], pt[1]);
          if (!projected) return;
          if (idx === 0) shape.moveTo(projected[0], projected[1]);
          else shape.lineTo(projected[0], projected[1]);
          outlinePoints.push(
            new THREE.Vector3(projected[0], projected[1], extrudeSettings.depth + 0.3)
          );
        });
        if (outlinePoints.length > 1) {
          for (let i = 0; i < outlinePoints.length; i++) {
            const current = outlinePoints[i];
            const next = outlinePoints[(i + 1) % outlinePoints.length];
            accumulateEdge(boundaryEdgeMap, current, next);
          }
        }

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const sideMat = new THREE.MeshStandardMaterial({
          color: "#083a86",
          metalness: 0.2,
          roughness: 0.4,
          emissive: new THREE.Color("#1cc7ff"),
          emissiveIntensity: 0.6,
        });
        const mesh = new THREE.Mesh(geometry, sideMat);
        mesh.userData = {
          name,
          baseColor: sideMat.color.clone(),
          baseEmissive: sideMat.emissive.clone(),
          baseEmissiveIntensity: sideMat.emissiveIntensity,
        };
        mapGroup?.add(mesh);
        regionMeshes.push(mesh);
        if (name) {
          if (!regionMeshMap[name]) regionMeshMap[name] = [];
          regionMeshMap[name].push(mesh);
        }

        // Top textured surface
        // 生成顶面几何并手动计算 UV，防止纹理拉伸变形
        const topGeometry = new THREE.ShapeGeometry(shape);
        topGeometry.computeBoundingBox();
        const bbox = topGeometry.boundingBox;
        if (bbox) {
          const sizeX = bbox.max.x - bbox.min.x || 1;
          const sizeY = bbox.max.y - bbox.min.y || 1;
          const pos = topGeometry.getAttribute("position");
          const uvs = new Float32Array(pos.count * 2);
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            uvs[i * 2] = (x - bbox.min.x) / sizeX;
            uvs[i * 2 + 1] = (y - bbox.min.y) / sizeY;
          }
          topGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
        }
        const mapTexture = textureLoader.load(mapTextureUrl);
        const topMat = new THREE.MeshBasicMaterial({
          color: "rgb(29, 95, 162)",
          map: mapTexture,
          transparent: true,
          opacity: 0.95,
        });
        const topMesh = new THREE.Mesh(topGeometry, topMat);
        topMesh.position.set(0, 0, extrudeSettings.depth + 0.05);
        topMesh.userData = { baseOpacity: topMat.opacity ?? 1, baseColor: topMat.color.clone() };
        mesh.userData.topMesh = topMesh;
        mapGroup?.add(topMesh);

        // Draw boundary lines on the top surface to highlight city borders
        if (outlinePoints.length > 1) {
          // 画出顶面边线，强化城市边界
        const boundaryGeometry = new THREE.BufferGeometry().setFromPoints([
            ...outlinePoints.map((pt) =>
              new THREE.Vector3(pt.x, pt.y, extrudeSettings.depth + 0.1)
            ),
            new THREE.Vector3(
              outlinePoints[0].x,
              outlinePoints[0].y,
              extrudeSettings.depth + 0.1
            ),
          ]);
          const boundaryMaterial = new THREE.LineBasicMaterial({
            color: "#9ee4ff",
            transparent: true,
            opacity: 0.9,
          });
          const boundaryLine = new THREE.Line(boundaryGeometry, boundaryMaterial);
          mapGroup?.add(boundaryLine);
        }
        // 画出挤出的立体造型边线
        const edgeGeo = new THREE.EdgesGeometry(geometry);
        const edgeMat = new THREE.LineBasicMaterial({
          color: "#1ad5ff",
          transparent: true,
          opacity: 0.8,
        });
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        mapGroup?.add(edges);
      });
    });

    // 最大外边线光晕：画出地图外围发光管道
    const boundaryLoops = buildBoundaryLoops(boundaryEdgeMap);
    if (boundaryLoops.length) {
      const lengthOf = (loop: THREE.Vector3[]) =>
        loop.reduce((sum, point, idx) => {
          if (idx === 0) return sum;
          return sum + point.distanceTo(loop[idx - 1]);
        }, 0);
      let selectLoop = boundaryLoops[0];
      let longestLength = lengthOf(selectLoop);
      for (let i = 1; i < boundaryLoops.length; i++) {
        const loop = boundaryLoops[i];
        const len = lengthOf(loop);
        if (len > longestLength) {
          selectLoop = loop;
          longestLength = len;
        }
      }
      if (selectLoop && selectLoop.length > 3) {
        const glowCurve = new THREE.CatmullRomCurve3(selectLoop, true, "centripetal", 0.8);
        const tubeGeo = new THREE.TubeGeometry(
          glowCurve,
          Math.max(selectLoop.length * 6, 240),
          1.4,
          32,
          true
        );
        // 原始外圈发光，贴合地图边线
        const glowMat = createGlowPathMaterial();
        glowMat.uniforms.uOpacity.value = 0.9;
        (glowMat as any).userData = { baseOpacity: 0.9 };
        const glowTube = new THREE.Mesh(tubeGeo, glowMat);
        glowTube.renderOrder = 8;
        mapGroup?.add(glowTube);
        glowPathMaterials.push(glowMat);

        // 外圈柔光，宽于原始边线，创造模糊边界
        const outerTubeGeo = new THREE.TubeGeometry(
          glowCurve,
          Math.max(selectLoop.length * 5, 220),
          3.4,
          32,
          true
        );
        const outerGlowMat = createGlowPathMaterial();
        outerGlowMat.uniforms.uOpacity.value = 0.55;
        (outerGlowMat as any).userData = { baseOpacity: 0.55 };
        outerGlowMat.uniforms.uPrimary.value.set("#74f1ff");
        outerGlowMat.uniforms.uSecondary.value.set("#1a6fb6");
        const outerGlowTube = new THREE.Mesh(outerTubeGeo, outerGlowMat);
        outerGlowTube.renderOrder = 7;
        mapGroup?.add(outerGlowTube);
        glowPathMaterials.push(outerGlowMat);

        // 地图底部光圈，目的是让地图像被光圈包围
        const bottomBlurGeo = new THREE.TubeGeometry(
          glowCurve,
          Math.max(selectLoop.length * 4, 180),
          1.6,
          24,
          true
        );
        const bottomBlurMat = createGlowPathMaterial();
        bottomBlurMat.uniforms.uOpacity.value = 0.28;
        (bottomBlurMat as any).userData = { baseOpacity: 0.28 };
        bottomBlurMat.uniforms.uPrimary.value.set("#5ee6ff");
        bottomBlurMat.uniforms.uSecondary.value.set("#0d3b73");
        const bottomBlurTube = new THREE.Mesh(bottomBlurGeo, bottomBlurMat);
        bottomBlurTube.position.z = -1.2;
        bottomBlurTube.renderOrder = 4;
        mapGroup?.add(bottomBlurTube);
        glowPathMaterials.push(bottomBlurMat);
      }
    }

    // 标记数据：根据 total 按比例绘制柱状、光束及波纹
    const maxVal = Math.max(
      1,
      ...mapData.map((d) => Number(d.total ?? 0)).filter((v) => Number.isFinite(v))
    );

    // 为每个城市绘制标记：标柱、光束、圆环、标签标细分件
    mapData.forEach((d) => {
      const lng = d.value[0];
      const lat = d.value[1];
      const projected = projectPoint(lng, lat);
      if (!projected) return;
      const heightScale = 0.55;
      const heightValue = Number(d.total ?? 0);
      const barHeight = (heightValue / maxVal) * 30 * heightScale + 2;

      // 数据柱：高度按比例映射
      const barGeo = new THREE.CylinderGeometry(2.8, 2.8, barHeight, 16, 1, false);
      const barMat = new THREE.MeshStandardMaterial({
        color: "#00eaff",
        opacity: 0.85,
        transparent: true,
      });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(projected[0], projected[1], barHeight / 2 + 2);
      markerGroup?.add(bar);

      // 向上的光束，增强立体感
      const beamGeo = new THREE.CylinderGeometry(0.5, 0.5, barHeight + 24, 18, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: "#00ffff",
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.rotation.x = Math.PI / 2;
      beam.position.set(projected[0], projected[1], (barHeight + 24) / 2 + 2);
      markerGroup?.add(beam);

      // 圆环波纹，配合呼吸动画
      const ringGeo = new THREE.RingGeometry(7.8, 9.0, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: "#00ffff",
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(projected[0], projected[1], 4.6);
      ring.renderOrder = 10;
      markerGroup?.add(ring);
      pulseMeshes.push(ring);

      // 外层光晕圆环，更柔和
      const haloGeo = new THREE.RingGeometry(10.5, 12.5, 64);
      const haloMat = new THREE.MeshBasicMaterial({
        color: "#6affff",
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(projected[0], projected[1], 4.8);
      halo.renderOrder = 9;
      markerGroup?.add(halo);
      pulseMeshes.push(halo);

      // 底部圆盘，稳定视觉中心
      const baseDiskGeo = new THREE.CircleGeometry(4.6, 48);
      const baseDiskMat = new THREE.MeshBasicMaterial({
        color: "rgb(197, 217, 236)",
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const baseDisk = new THREE.Mesh(baseDiskGeo, baseDiskMat);
      baseDisk.position.set(projected[0], projected[1], 4.7);
      baseDisk.renderOrder = 11;
      markerGroup?.add(baseDisk);

      // 内核小球，增强亮点
      const coreGeo = new THREE.SphereGeometry(2.2, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({ color: "#7ffcff" });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(projected[0], projected[1], barHeight + 6);
      markerGroup?.add(core);

      // 构建标签的 DOM 结构，用 CSS2DRenderer 浮在三维场景上方
      const label = document.createElement("div");
      label.className = "map-label";
      label.style.pointerEvents = "auto";
      label.style.cursor = "pointer";
      const elevateLabel = (active: boolean) => {
        const el = label as HTMLDivElement;
        if (active) {
          el.style.zIndex = "20";
          el.style.transform = "translateY(-2px)";
        } else {
          el.style.zIndex = "";
          el.style.transform = "";
        }
      };
      label.addEventListener("mouseenter", () => elevateLabel(true));
      label.addEventListener("mouseleave", () => elevateLabel(false));
      label.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (d.name) {
          const meshes = regionMeshMap[d.name] ?? [];
          setSelectedRegion(d.name, meshes);
        }
        options?.onLabelClick?.(d);
      });
      // 标题与数据行，按方例水平对齐
      const title = document.createElement("div");
      title.className = "map-label__title";
      title.textContent = d.name;
      const row1 = document.createElement("div");
      row1.className = "map-label__row";
      row1.textContent = `签约企业数: ${d.total ?? "-"}`;
      const row2 = document.createElement("div");
      row2.className = "map-label__row";
      row2.textContent = `签约企业占比: ${d.rate ?? "-"}`;
      label.appendChild(title);
      label.appendChild(row1);
      label.appendChild(row2);

      const labelObj = new CSS2DObject(label);
      // Label height offset (increase to raise the sign)
      labelObj.position.set(projected[0], projected[1], barHeight + 58);
      labelObj.userData.basePosition = labelObj.position.clone();
      labelObj.userData.baseZ = labelObj.position.z;
      markerGroup?.add(labelObj);
      labelObjects.push(labelObj);
    });
    
    scene.add(mapGroup);
    scene.add(markerGroup);

    const box = new THREE.Box3().setFromObject(mapGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    mapGroup.position.sub(center);
    markerGroup.position.sub(center);
    // Move map upward (adjust this offset as needed)
    mapGroup.position.y += 100;
    markerGroup.position.y += 100;
  };

  // 容器尺寸变化时，重置相机并重新构建地图
  const handleResize = () => {
    if (!container || !camera || !renderer || !labelRenderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    if (lastGeojson) buildMap(lastGeojson, lastData, w, h);
  };

  // 选中/悬停状态分离：避免交互时彼此冲突
  const isSelected = (mesh: THREE.Mesh) => selectedRegionMeshes.includes(mesh);

  const resetMeshAppearance = (mesh: THREE.Mesh) => {
    const base = (mesh.userData?.baseColor as THREE.Color | undefined);
    if (base && (mesh.material as any).color) {
      (mesh.material as THREE.MeshStandardMaterial).color.copy(base);
    }
    const baseEmissive = mesh.userData?.baseEmissive as THREE.Color | undefined;
    const baseEmissiveIntensity =
      mesh.userData?.baseEmissiveIntensity as number | undefined;
    if (baseEmissive && (mesh.material as any).emissive) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.copy(baseEmissive);
      mat.emissiveIntensity = baseEmissiveIntensity ?? mat.emissiveIntensity;
    }
    const topMesh = mesh.userData?.topMesh as THREE.Mesh | undefined;
    if (topMesh) {
      const baseOpacity = (topMesh.userData?.baseOpacity as number | undefined) ?? 1;
      const baseColor = topMesh.userData?.baseColor as THREE.Color | undefined;
      const topMat = topMesh.material as THREE.MeshBasicMaterial;
      if (baseColor) topMat.color.copy(baseColor);
      topMat.opacity = baseOpacity;
    }
    const glow = mesh.userData?.glowMesh as THREE.Mesh | undefined;
    if (glow && mapGroup) {
      mapGroup.remove(glow);
    }
  };

  const applyHover = (mesh: THREE.Mesh) => {
    if (isSelected(mesh)) return;
    const topMesh = mesh.userData?.topMesh as THREE.Mesh | undefined;
    if (topMesh) {
      const topMat = topMesh.material as THREE.MeshBasicMaterial;
      topMat.color.set("#8fc6ff");
      topMat.opacity = 1;
    }
  };

  const applySelect = (mesh: THREE.Mesh) => {
    const topMesh = mesh.userData?.topMesh as THREE.Mesh | undefined;
    if (topMesh) {
      const topMat = topMesh.material as THREE.MeshBasicMaterial;
      topMat.color.set("#b5e6ff");
      topMat.opacity = 1;
    }
    if ((mesh.material as any).emissive) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.set("#2bd4ff");
      mat.emissiveIntensity = 1.1;
    }
  };

  const clearHover = (mesh: THREE.Mesh) => {
    if (isSelected(mesh)) return;
    resetMeshAppearance(mesh);
  };

  const clearSelect = (mesh: THREE.Mesh) => {
    resetMeshAppearance(mesh);
  };

  // 设置选中区域：先推出旧选中，再应用新选中
  const setSelectedRegion = (key: string | null, meshes: THREE.Mesh[] = []) => {
    if (selectedRegionKey === key) return;
    selectedRegionMeshes.forEach(clearSelect);
    selectedRegionKey = key;
    selectedRegionMeshes = meshes;
    selectedRegionMeshes.forEach(applySelect);
  };

  // 清空选中：回到默认显示状态
  const clearSelection = () => {
    if (!selectedRegionKey) return;
    selectedRegionMeshes.forEach(clearSelect);
    selectedRegionKey = null;
    selectedRegionMeshes = [];
  };

    // 查询当前指针是否在标签上，防止误触地图
  const isPointerOnLabel = (event: MouseEvent) => {
    const el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    return Boolean(el && el.closest && el.closest(".map-label"));
  };

  // 鼠标滑动高亮：使用射线投影命中地图面

  const handleLabelHover = (event: MouseEvent) => {
    if (!camera || !container || labelObjects.length === 0) return;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const w = rect.width || 1;
    const h = rect.height || 1;
    const temp = new THREE.Vector3();

    let hit: CSS2DObject | null = null;
    for (const obj of labelObjects) {
      const el = obj.element as HTMLElement;
      const rectW = el.offsetWidth || 140;
      const rectH = el.offsetHeight || 50;
      obj.getWorldPosition(temp);
      temp.project(camera);
      const sx = (temp.x * 0.5 + 0.5) * w;
      const sy = (-temp.y * 0.5 + 0.5) * h;
      const left = sx - rectW / 2;
      const top = sy - rectH / 2;
      if (x >= left && x <= left + rectW && y >= top && y <= top + rectH) {
        hit = obj;
        break;
      }
    }

    if (hit !== activeLabelObject) {
      activeLabelObject = hit;
    }
  };

  const onCanvasMove = (event: MouseEvent) => {
    if (!container || !camera) return;
    if (isPointerOnLabel(event)) {
      if (hoveredRegionKey) {
        hoveredRegionMeshes.forEach(clearHover);
        hoveredRegionMeshes = [];
        hoveredRegionKey = null;
        hoveredMesh = null;
      }
      return;
    }
    const rect = container.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(regionMeshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const name = (mesh.userData?.name as string | undefined) ?? "";
      const key = name || mesh.uuid;
      const nextMeshes = name && regionMeshMap[name] ? regionMeshMap[name] : [mesh];

      if (hoveredRegionKey && hoveredRegionKey !== key) {
        hoveredRegionMeshes.forEach(clearHover);
        hoveredRegionMeshes = [];
      }

      if (hoveredRegionKey !== key) {
        hoveredRegionKey = key;
        hoveredRegionMeshes = nextMeshes;
      }

      hoveredRegionMeshes.forEach(applyHover);
      hoveredMesh = mesh;
    } else if (hoveredRegionKey) {
      hoveredRegionMeshes.forEach(clearHover);
      hoveredRegionMeshes = [];
      hoveredRegionKey = null;
      hoveredMesh = null;
    }
  };

  // 鼠标点击：地图问题回调与选中取消逻辑
  const onCanvasClick = (event: MouseEvent) => {
    if (!container || !camera) return;
    if (isPointerOnLabel(event)) return;
    const rect = container.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(regionMeshes);
    if (intersects.length > 0) {
      const name = (intersects[0].object as any).userData?.name;
      if (name && options?.onRegionClick) {
        options.onRegionClick(name);
      }
      return;
    }
    clearSelection();
  };

  // 渲染循环：波纹及光晕呼吸效果
  const applyActiveLabelZ = () => {
    if (!labelRenderer) return;
    // ????? hover ? label???????????
    if (activeLabelObject) {
      const el = activeLabelObject.element as HTMLElement;
      el.style.zIndex = "999";
    }
  };

  const startRenderLoop = () => {
    const animate = (time: number) => {
      pulseMeshes.forEach((mesh, idx) => {
        const scale = 1 + Math.sin(time * 0.002 + idx) * 0.12;
        mesh.scale.set(scale, scale, scale);
      });
      glowPathMaterials.forEach((mat, idx) => {
        const base = (mat as any).userData?.baseOpacity ?? 1;
        const breath = 0.92 + Math.sin(time * 0.0015 + idx) * 1.08;
        mat.uniforms.uOpacity.value = base * breath;
      });
      renderer?.render(scene!, camera!);
      labelRenderer?.render(scene!, camera!);
      applyActiveLabelZ();
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
  };

  /**
   * 初始化：建立场景、相机、渲染器以及事件监听
   */
  /**
   */
  const init = (geojson: any, mapData: MapdataType[]) => {
    lastGeojson = geojson;
    lastData = mapData;
    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(0, -330, 450);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0";
    labelRenderer.domElement.style.left = "0";
    labelRenderer.domElement.style.pointerEvents = "none";

    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    container.appendChild(labelRenderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.6;

    const ambient = new THREE.AmbientLight(0x6fe7ff, 0.35);
    const dir = new THREE.DirectionalLight(0xa8f7ff, 0.8);
    dir.position.set(200, 200, 300);
    scene.add(ambient);
    scene.add(dir);

    buildMap(geojson, mapData, width, height);
    startRenderLoop();

    renderer.domElement.addEventListener("click", onCanvasClick);
    renderer.domElement.addEventListener("mousemove", onCanvasMove);
    container.addEventListener("mousemove", handleLabelHover, true);

    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
  };

  // 更新地图：当区域或数据发生变化时重新构建
  const update = (geojson: any, mapData: MapdataType[]) => {
    lastGeojson = geojson;
    lastData = mapData;

    if (!scene || !camera || !renderer || !labelRenderer) {
      init(geojson, mapData);
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    buildMap(geojson, mapData, width, height);
  };

  // 释放资源：清理事件、渲染器和几何/材质
  const dispose = () => {
    cancelAnimationFrame(animationId);
    if (renderer?.domElement) {
      renderer.domElement.removeEventListener("click", onCanvasClick);
      renderer.domElement.removeEventListener("mousemove", onCanvasMove);
      container.removeEventListener("mousemove", handleLabelHover, true);
    }
    resizeObserver?.disconnect();
    resizeObserver = null;

    if (scene) {
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose?.());
          else obj.material.dispose?.();
        }
      });
    }

    renderer?.dispose();
    renderer = null;
    labelRenderer = null;
    controls?.dispose();
    controls = null;
    scene = null;
    camera = null;
    mapGroup = null;
    markerGroup = null;
    pulseMeshes = [];
    regionMeshes = [];
    hoveredMesh = null;
    hoveredRegionKey = null;
    hoveredRegionMeshes = [];
    regionMeshMap = {};
    selectedRegionKey = null;
    selectedRegionMeshes = [];
    lastGeojson = null;
    lastData = [];
  };

  return { init, update, dispose };
};

export const regionCodes: any = {

  辽宁省: {
    adcode: "210000",
    level: "province",
    name: "辽宁省",
  },
}
