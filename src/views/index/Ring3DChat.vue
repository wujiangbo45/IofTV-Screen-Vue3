<template>
    <div ref="containerRef" class="pie-3d-wrap">
      <!-- tooltip -->
      <div
        v-show="tooltip.visible"
        class="tooltip"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
      >
      <div class="name">{{ tooltip.name }}</div>
      <div class="divider"></div>
      <div class="profit">利润：{{ tooltip.value }}</div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, reactive, onMounted, onBeforeUnmount } from "vue";
  import * as THREE from "three";
  
  /* ================= DOM ================= */
  const containerRef = ref<HTMLDivElement | null>(null);
  
  /* ================= three ================= */
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let group: THREE.Group;
  let baseGroup: THREE.Group;
  let raf = 0;
  const ringOffsetY = 4.2;
  const sliceLiftHeight = 0;
  
  /* ================= raycaster ================= */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let currentMesh: THREE.Mesh | null = null;
  
  /* ================= tooltip ================= */
  const tooltip = reactive({
    visible: false,
    x: 0,
    y: 0,
    name: "",
    value: ""
  });
  
  /* ================= 数据（偏暖蓝） ================= */
  const palette = [
    "#ff7404",
    "#0089e6",
    "#4ff8ff",
    "#048aff"
  ];
  const data = [
    { name: "中国人民财产保险有限公司", value: 1048, color: palette[0] },
    { name: "平安", value: 735,  color: palette[1] },
    { name: "太平洋", value: 580, color: palette[2] },
    { name: "中意", value: 484,  color: palette[3] }
  ];
  const total = data.reduce((s, d) => s + d.value, 0);
  
  /* ================= 中心文字 ================= */
  let centerSprite: THREE.Sprite;

  function createGlowTexture() {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grd = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.25,
      size / 2,
      size / 2,
      size * 0.5
    );
    grd.addColorStop(0, "rgba(255,255,255,0.0)");
    grd.addColorStop(0.45, "rgba(255,255,255,0.15)");
    grd.addColorStop(0.7, "rgba(255,255,255,0.55)");
    grd.addColorStop(1, "rgba(255,255,255,0.0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  function updateCenterText(text: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 512, 512);
  
    ctx.fillStyle = "#8fdcff";
    ctx.font = "bold 96px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 256);
  
    const texture = new THREE.CanvasTexture(canvas);
    centerSprite.material.map?.dispose();
    centerSprite.material.map = texture;
    centerSprite.material.needsUpdate = true;
  }
  
  /* ================= 初始化 ================= */
  function init() {
    const el = containerRef.value!;
    scene = new THREE.Scene();
  
    camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 1000);
    camera.position.set(0, 12, 20);
    camera.lookAt(0, 0, 0);
  
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true // 背景透明
    });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);
    scene.background = null;
    scene.add(new THREE.AmbientLight(0xbfefff, 0.85));
    const light = new THREE.DirectionalLight(0xdff5ff, 5.25);
    light.position.set(6, 52, 8);
    scene.add(light);
  }
  
  /* ================= 中心数值 ================= */
  function createCenterText() {
    const material = new THREE.SpriteMaterial({ transparent: true });
    centerSprite = new THREE.Sprite(material);
    centerSprite.scale.set(7, 7, 1);
    centerSprite.position.y = ringOffsetY + 0.02;
    scene.add(centerSprite);
  
    updateCenterText(String(total));
  }
  
  /* ================= 真·掏空饼环 ================= */
  function createRing() {
    group = new THREE.Group();
  
    const outerRadius = 6;
    const innerRadius = 4.3;
    const height = 2.6; // ✔ 高度加厚
  
    let startAngle = 0;
  
    data.forEach(d => {
      const angle = (d.value / total) * Math.PI * 2;
      const a0 = startAngle;
      const a1 = startAngle + angle;
  
      const shape = new THREE.Shape();
      shape.moveTo(Math.cos(a0) * outerRadius, Math.sin(a0) * outerRadius);
      shape.absarc(0, 0, outerRadius, a0, a1, false);
      shape.absarc(0, 0, innerRadius, a1, a0, true);
      shape.closePath();
  
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: false
      });
      geo.rotateX(-Math.PI / 2);
  
      const mat = new THREE.MeshStandardMaterial({
        color: d.color,
        metalness: 0.35,
        roughness: 0.35,
        emissive: new THREE.Color(d.color),
        emissiveIntensity: 0.18
      });
  
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = d;
      mesh.userData.liftTarget = 0;
      mesh.userData.liftCurrent = 0;
      group.add(mesh);
  
      startAngle += angle;
    });
  
    group.rotation.x = -3.15;
    group.position.y = ringOffsetY;
    scene.add(group);
  }

  /* ================= 底座 ================= */
  function createBase() {
    baseGroup = new THREE.Group();
    const glowTexture = createGlowTexture();

    const planeGeo = new THREE.CircleGeometry(8.2, 96);
    const planeMat = new THREE.MeshStandardMaterial({
      color: "#1b4a6b",
      metalness: 0.15,
      roughness: 0.55,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = ringOffsetY - 1.45;
    baseGroup.add(plane);

    const glow = new THREE.Mesh(
      new THREE.RingGeometry(7.0, 8.8, 128),
      new THREE.MeshBasicMaterial({
        color: "#88cbe6",
        transparent: true,
        opacity: 0.48,
        map: glowTexture,
        alphaMap: glowTexture,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = ringOffsetY - 1.42;
    baseGroup.add(glow);

    const glow2 = new THREE.Mesh(
      new THREE.RingGeometry(5.8, 7.5, 128),
      new THREE.MeshBasicMaterial({
        color: "#7fc2dc",
        transparent: true,
        opacity: 0.4,
        map: glowTexture,
        alphaMap: glowTexture,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending
      })
    );
    glow2.rotation.x = -Math.PI / 2;
    glow2.position.y = ringOffsetY - 1.41;
    baseGroup.add(glow2);

    const halo1 = new THREE.Mesh(
      new THREE.RingGeometry(8.2, 9.8, 128),
      new THREE.MeshBasicMaterial({
        color: "#9ad7ee",
        transparent: true,
        opacity: 0.3,
        map: glowTexture,
        alphaMap: glowTexture,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending
      })
    );
    halo1.rotation.x = -Math.PI / 2;
    halo1.position.y = ringOffsetY - 1.43;
    baseGroup.add(halo1);

    const halo2 = new THREE.Mesh(
      new THREE.RingGeometry(5.0, 6.8, 128),
      new THREE.MeshBasicMaterial({
        color: "#76b9d6",
        transparent: true,
        opacity: 1.58,
        map: glowTexture,
        alphaMap: glowTexture,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending
      })
    );
    halo2.rotation.x = -Math.PI / 2;
    halo2.position.y = ringOffsetY - 1.42;
    baseGroup.add(halo2);

    scene.add(baseGroup);
  }
  
  /* ================= hover 逻辑 ================= */
  function onMouseMove(e: MouseEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(group.children);
  
    if (intersects.length) {
      const mesh = intersects[0].object as THREE.Mesh;
      if (currentMesh && currentMesh !== mesh) {
        (currentMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.18;
        currentMesh.userData.liftTarget = 0;
      }
      currentMesh = mesh;
  
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.45;
  
      const d = mesh.userData;
      tooltip.visible = true;
      tooltip.name = d.name;
      tooltip.value = d.value;
      const rect = containerRef.value!.getBoundingClientRect();
  
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const offsetX = 38;
      const offsetY = 38;
      tooltip.x = localX + offsetX;
      tooltip.y = localY + offsetY;
  
      updateCenterText(String(d.value));
      mesh.userData.liftTarget = sliceLiftHeight;
    } else {
      tooltip.visible = false;
      if (currentMesh) {
        (currentMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.18;
        currentMesh.userData.liftTarget = 0;
        currentMesh = null;
      }
      updateCenterText(String(total));
    }
  }
  
  /* ================= 动画 ================= */
  function animate() {
    raf = requestAnimationFrame(animate);
    group.rotation.y += 0.002;
    group.children.forEach((obj) => {
      const mesh = obj as THREE.Mesh;
      const target = mesh.userData?.liftTarget ?? 0;
      const current = mesh.userData?.liftCurrent ?? 0;
      const next = current + (target - current) * 0.12;
      mesh.userData.liftCurrent = next;
      mesh.position.y = -next;
    });
    renderer.render(scene, camera);
  }
  
  /* ================= 生命周期 ================= */
  onMounted(() => {
    init();
    createBase();
    createRing();
    createCenterText();
    animate();
  
    containerRef.value!.addEventListener("mousemove", onMouseMove);
  });
  
  onBeforeUnmount(() => {
    cancelAnimationFrame(raf);
    renderer.dispose();
    scene.clear();
  });
  </script>
  
  <style scoped>
  .pie-3d-wrap {
    width: 100%;
    height: 100%;
    position: relative;
    background: transparent;
  }
  
  /* tooltip 取消背景*/
  .tooltip {
    position: absolute;
    pointer-events: none;
    background: linear-gradient(135deg, rgba(180, 230, 255, 0.18), rgba(90, 170, 220, 0.12));
    border: 1px solid rgba(180, 230, 255, 0.35);
    padding: 10px 12px;
    border-radius: 8px;
    color: #e9f7ff;
    font-size: 16px;
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.28), inset 0 0 16px rgba(180, 230, 255, 0.18);
    backdrop-filter: blur(12px) saturate(140%);
    -webkit-backdrop-filter: blur(12px) saturate(140%);
    min-width: 120px;
  }
  .tooltip .name {
    font-weight: 600;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
    text-align: center;
    display: block;
    padding: 4px 6px;
    border-radius: 6px;
    background: rgba(180, 230, 255, 0.18);
    color: #d6f3ff;
    border: 1px solid rgba(180, 230, 255, 0.25);
  }
  .tooltip .divider {
    height: 1px;
    margin: 6px 0 8px;
    background: linear-gradient(90deg, rgba(180, 230, 255, 0.1), rgba(180, 230, 255, 0.6), rgba(180, 230, 255, 0.1));
  }
  .tooltip .value {
    color: #7fe2ff;
    font-weight: 700;
    font-size: 18px;
  }
  .tooltip .profit {
    margin-top: 6px;
    font-size: 16px;
    color: #d6f3ff;
  }
  </style>
