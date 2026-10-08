import * as THREE from 'three';
import { GLTFLoader } from './assets/vendor/GLTFLoader.js';
import { MeshoptDecoder } from './assets/vendor/meshopt_decoder.module.js';

// One renderer and one GLB load are retained when the gift is reopened.
export function createPortrait(stage, settings, callbacks = {}) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 2.5, 6.4);
  camera.lookAt(0, 1.65, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.append(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xfff8f3, 0xb8a2b3, 2.4));
  const keyLight = new THREE.DirectionalLight(0xfff5e9, 3.2);
  keyLight.position.set(3, 6, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  Object.assign(keyLight.shadow.camera, { left: -3, right: 3, top: 5, bottom: -3 });
  keyLight.shadow.bias = -0.001;
  keyLight.shadow.normalBias = 0.025;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xe8d8ff, 1.8);
  fillLight.position.set(-4, 3, 2);
  scene.add(fillLight);
  const backLight = new THREE.DirectionalLight(0xffffff, 2);
  backLight.position.set(1, 4, -4);
  scene.add(backLight);

  const turntable = new THREE.Group();
  scene.add(turntable);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.08, 0.17, 80), new THREE.MeshStandardMaterial({ color: 0xe2e5d9, roughness: 0.65 }));
  pedestal.position.y = 0.085;
  pedestal.receiveShadow = true;
  pedestal.castShadow = true;
  turntable.add(pedestal);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.026, 0.016, 10, 90), new THREE.MeshStandardMaterial({ color: 0xd3a68b, metalness: 0.25, roughness: 0.45 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.12;
  turntable.add(rim);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.13 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.005;
  ground.receiveShadow = true;
  scene.add(ground);

  let active = false;
  let loaded = false;
  let dragging = false;
  let lastX = 0;
  let capturedPointer = null;
  let model = null;
  let loadPromise = null;
  let mixer = null;
  const frontAngle = THREE.MathUtils.degToRad(settings.frontAngle || 0);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the model in frame on narrow phones and wide screens alike.
    camera.fov = width / height < 0.95 ? 42 : 34;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(stage);

  function releasePointer(event) {
    if (event.pointerId !== capturedPointer) return;
    dragging = false;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    capturedPointer = null;
  }
  stage.addEventListener('pointerdown', event => {
    if (!loaded || (event.pointerType === 'mouse' && event.button !== 0)) return;
    dragging = true;
    capturedPointer = event.pointerId;
    lastX = event.clientX;
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== capturedPointer) return;
    turntable.rotation.y += (event.clientX - lastX) * 0.012;
    lastX = event.clientX;
  });
  stage.addEventListener('pointerup', releasePointer);
  stage.addEventListener('pointercancel', releasePointer);
  stage.addEventListener('lostpointercapture', () => { dragging = false; capturedPointer = null; });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    active = false;
    callbacks.onError?.('Đồ họa 3D đã bị gián đoạn. Hãy tải lại trang để xem nhân vật.');
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);
    if (!active || document.hidden) return;
    if (!reducedMotion && !dragging && loaded) {
      turntable.rotation.y += delta * (settings.autoRotateSpeed ?? 0.5);
    }
    mixer?.update(delta);
    renderer.render(scene, camera);
  });

  function load() {
    if (loadPromise) return loadPromise;
    callbacks.onLoading?.(0);
    loadPromise = new Promise((resolve, reject) => {
      loader.load(settings.model, gltf => {
        model = gltf.scene;
        model.rotation.y = frontAngle;
        model.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        if (!Number.isFinite(size.y) || size.y <= 0) {
          reject(new Error('Mô hình không có kích thước hợp lệ.'));
          return;
        }
        model.scale.multiplyScalar((settings.height || 2.8) / size.y);
        model.updateMatrixWorld(true);
        const fittedBounds = new THREE.Box3().setFromObject(model);
        const center = fittedBounds.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y += 0.17 - fittedBounds.min.y;
        // Keep the GLB's base color and transparency, without lighting or exposure.
        const unlitMaterials = new Map();
        function toUnlit(source) {
          if (unlitMaterials.has(source)) return unlitMaterials.get(source);
          const material = new THREE.MeshBasicMaterial({
            name: source.name,
            color: source.color?.clone() ?? new THREE.Color(0xffffff),
            map: source.map ?? null,
            alphaMap: source.alphaMap ?? null,
            transparent: source.transparent,
            opacity: source.opacity,
            alphaTest: source.alphaTest,
            side: source.side,
            vertexColors: source.vertexColors,
            depthTest: source.depthTest,
            depthWrite: source.depthWrite,
            toneMapped: false
          });
          if (material.map) material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
          unlitMaterials.set(source, material);
          return material;
        }
        model.traverse(object => {
          if (!object.isMesh) return;
          object.castShadow = true;
          object.receiveShadow = false;
          object.material = Array.isArray(object.material)
            ? object.material.map(toUnlit)
            : toUnlit(object.material);
        });
        for (const source of unlitMaterials.keys()) source.dispose();
        turntable.add(model);
        if (gltf.animations.length) {
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach(clip => mixer.clipAction(clip).play());
        }
        loaded = true;
        resize();
        callbacks.onReady?.();
        resolve(model);
      }, progress => {
        if (progress.lengthComputable) callbacks.onLoading?.(Math.round(progress.loaded / progress.total * 100));
      }, reject);
    }).catch(error => {
      console.error('Không thể tải GLB:', error);
      loadPromise = null; // Allow another attempt when the gift is reopened.
      callbacks.onError?.('Chưa tải được nhân vật 3D. Hãy chạy START.bat rồi mở địa chỉ localhost; bạn vẫn có thể xem ảnh và lời chúc.');
      return null;
    });
    return loadPromise;
  }

  return {
    show() { active = true; resize(); return load(); },
    hide() { active = false; dragging = false; },
    reset() { turntable.rotation.y = 0; },
    get loaded() { return loaded; }
  };
}
