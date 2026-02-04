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
  let glowPathMaterials: THREE.ShaderMaterial[] = [];
  let regionMeshes: THREE.Mesh[] = [];
  let lastGeojson: any = null;
  let lastData: MapdataType[] = [];
  let hoveredMesh: THREE.Mesh | null = null;
  let hoveredRegionKey: string | null = null;
  let hoveredRegionMeshes: THREE.Mesh[] = [];
  let regionMeshMap: Record<string, THREE.Mesh[]> = {};

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

const textureLoader = new THREE.TextureLoader();
type EdgeRecord = {
  a: THREE.Vector3;
  b: THREE.Vector3;
  aKey: string;
  bKey: string;
};
const pointKey = (x: number, y: number) => `${x.toFixed(5)},${y.toFixed(5)}`;
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
const createGlowPathMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      uPrimary: { value: new THREE.Color("#2bc4ff") },
      uSecondary: { value: new THREE.Color("#0f5a9b") },
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
      varying vec2 vUv;
      void main() {
        float radial = 1.0 - abs(vUv.y - 0.5) * 2.0;
        radial = smoothstep(0.0, 0.7, radial);
        float soft = smoothstep(0.0, 0.3, 1.0 - abs(vUv.x - 0.5));
        float intensity = radial * 0.35 + soft * 0.2;
        vec3 color = mix(uSecondary, uPrimary, radial);
        float alpha = intensity * 0.6;
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  // const mapTexture = textureLoader.load(mapTextureUrl);
  // mapTexture.colorSpace = THREE.SRGBColorSpace;
  // mapTexture.wrapS = THREE.ClampToEdgeWrapping;  // 避免重复
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
    pulseMeshes = [];
    const boundaryEdgeMap = new Map<string, EdgeRecord>();
    regionMeshes = [];
    glowPathMaterials = [];
    hoveredMesh = null;
    hoveredRegionKey = null;
    hoveredRegionMeshes = [];
    regionMeshMap = {};

    const projection = d3.geoMercator().fitSize([width *30, height * 30], geojson);

    const projectPoint = (lng: number, lat: number) => {
      const p = projection([lng, lat]);
      if (!p) return null;
      const x = p[0] - width / 2;
      const y = -(p[1] - height / 2);
      return [x, y];
    };

    const extrudeSettings = {
      depth: 20,
      bevelEnabled: false,
    };

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
        const glowMat = createGlowPathMaterial();
        const glowTube = new THREE.Mesh(tubeGeo, glowMat);
        glowTube.renderOrder = 8;
        mapGroup?.add(glowTube);
        glowPathMaterials.push(glowMat);
      }
    }

    const maxVal = Math.max(
      1,
      ...mapData.map((d) => Number(d.total ?? 0)).filter((v) => Number.isFinite(v))
    );

    mapData.forEach((d) => {
      const lng = d.value[0];
      const lat = d.value[1];
      const projected = projectPoint(lng, lat);
      if (!projected) return;
      const heightScale = 0.35;
      const heightValue = Number(d.total ?? 0);
      const barHeight = (heightValue / maxVal) * 30 * heightScale + 2;

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

      const coreGeo = new THREE.SphereGeometry(2.2, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({ color: "#7ffcff" });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(projected[0], projected[1], barHeight + 6);
      markerGroup?.add(core);

      const label = document.createElement("div");
      label.className = "map-label";
      label.style.pointerEvents = "auto";
      label.style.cursor = "pointer";
      label.addEventListener("click", (ev) => {
        ev.stopPropagation();
        options?.onLabelClick?.(d);
      });
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
      markerGroup?.add(labelObj);
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

  const applyHover = (mesh: THREE.Mesh) => {
    const topMesh = mesh.userData?.topMesh as THREE.Mesh | undefined;
    if (topMesh) {
      const topMat = topMesh.material as THREE.MeshBasicMaterial;
      topMat.color.set("#8fc6ff");
      topMat.opacity = 1;
    }
  };

  const clearHover = (mesh: THREE.Mesh) => {
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

    const onCanvasMove = (event: MouseEvent) => {
    if (!container || !camera) return;
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

  const onCanvasClick = (event: MouseEvent) => {
    if (!container || !camera) return;
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
    }
  };

  const startRenderLoop = () => {
    const animate = (time: number) => {
      pulseMeshes.forEach((mesh, idx) => {
        const scale = 1 + Math.sin(time * 0.002 + idx) * 0.12;
        mesh.scale.set(scale, scale, scale);
      });
      renderer?.render(scene!, camera!);
      labelRenderer?.render(scene!, camera!);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
  };

  const init = (geojson: any, mapData: MapdataType[]) => {
    lastGeojson = geojson;
    lastData = mapData;
    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(0, -430, 480);
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

    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
  };

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

  const dispose = () => {
    cancelAnimationFrame(animationId);
    if (renderer?.domElement) {
      renderer.domElement.removeEventListener("click", onCanvasClick);
      renderer.domElement.removeEventListener("mousemove", onCanvasMove);
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
    lastGeojson = null;
    lastData = [];
  };

  return { init, update, dispose };
};

export const regionCodes: any = {
  中国: {
    adcode: "100000",
    level: "country",
    name: "中华人民共和国",
  },
  新疆维吾尔自治区: {
    adcode: "650000",
    level: "province",
    name: "新疆维吾尔自治区",
  },
  湖北省: {
    adcode: "420000",
    level: "province",
    name: "湖北省",
  },
  辽宁省: {
    adcode: "210000",
    level: "province",
    name: "辽宁省",
  },
  广东省: {
    adcode: "440000",
    level: "province",
    name: "广东省",
  },
  内蒙古自治区: {
    adcode: "150000",
    level: "province",
    name: "内蒙古自治区",
  },
  黑龙江省: {
    adcode: "230000",
    level: "province",
    name: "黑龙江省",
  },
  河南省: {
    adcode: "410000",
    level: "province",
    name: "河南省",
  },
  山东省: {
    adcode: "370000",
    level: "province",
    name: "山东省",
  },
  陕西省: {
    adcode: "610000",
    level: "province",
    name: "陕西省",
  },
  贵州省: {
    adcode: "520000",
    level: "province",
    name: "贵州省",
  },
  上海市: {
    adcode: "310000",
    level: "province",
    name: "上海市",
  },
  重庆市: {
    adcode: "500000",
    level: "province",
    name: "重庆市",
  },
  西藏自治区: {
    adcode: "540000",
    level: "province",
    name: "西藏自治区",
  },
  安徽省: {
    adcode: "340000",
    level: "province",
    name: "安徽省",
  },
  福建省: {
    adcode: "350000",
    level: "province",
    name: "福建省",
  },
  湖南省: {
    adcode: "430000",
    level: "province",
    name: "湖南省",
  },
  海南省: {
    adcode: "460000",
    level: "province",
    name: "海南省",
  },
  江苏省: {
    adcode: "320000",
    level: "province",
    name: "江苏省",
  },
  青海省: {
    adcode: "630000",
    level: "province",
    name: "青海省",
  },
  广西壮族自治区: {
    adcode: "450000",
    level: "province",
    name: "广西壮族自治区",
  },
  宁夏回族自治区: {
    adcode: "640000",
    level: "province",
    name: "宁夏回族自治区",
  },
  浙江省: {
    adcode: "330000",
    level: "province",
    name: "浙江省",
  },
  河北省: {
    adcode: "130000",
    level: "province",
    name: "河北省",
  },
  香港特别行政区: {
    adcode: "810000",
    level: "province",
    name: "香港特别行政区",
  },
  台湾省: {
    adcode: "710000",
    level: "province",
    name: "台湾省",
  },
  澳门特别行政区: {
    adcode: "820000",
    level: "province",
    name: "澳门特别行政区",
  },
  甘肃省: {
    adcode: "620000",
    level: "province",
    name: "甘肃省",
  },
  四川省: {
    adcode: "510000",
    level: "province",
    name: "四川省",
  },
  天津市: {
    adcode: "120000",
    level: "province",
    name: "天津市",
  },
  江西省: {
    adcode: "360000",
    level: "province",
    name: "江西省",
  },
  云南省: {
    adcode: "530000",
    level: "province",
    name: "云南省",
  },
  山西省: {
    adcode: "140000",
    level: "province",
    name: "山西省",
  },
  北京市: {
    adcode: "110000",
    level: "province",
    name: "北京市",
  },
  吉林省: {
    adcode: "220000",
    level: "province",
    name: "吉林省",
  },
};
