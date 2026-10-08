const coconuts = [
  { file: "coconuts/coconut_1.glb", author: "Meerschaum Digital", source: "https://sketchfab.com/3d-models/coconut-game-ready-2k-pbr-49a8eaee73a943e08fb77049f8b0d16d" },
  { file: "coconuts/coconut_2.glb", author: "matousekfoto", source: "https://sketchfab.com/3d-models/coconut-afe3221922ef4bdbb0cb25a2656e1afb" },
  { file: "coconuts/coconut_3.glb", author: "Mylom", source: "https://sketchfab.com/3d-models/coconut-8ed0693304144515b118ffebd7032371" }
];

const coconut = coconuts[Math.floor(Math.random() * coconuts.length)];
const coco = document.querySelector(".coco");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const credit = document.createElement("p");
credit.className = "credit";
credit.innerHTML = `3D model: <a href="${coconut.source}">${coconut.author}</a><br><a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>`;

const autoSpeed = reducedMotion ? 0 : Math.PI * 2 / 30;
const xAxis = new THREE.Vector3(1, 0, 0);
const yAxis = new THREE.Vector3(0, 1, 0);
const upright = new THREE.Quaternion();

function startViewer() {
  const canvas = document.createElement("canvas");
  canvas.className = "viewer";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Sleeping Coconut");

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const pivot = new THREE.Group();
  scene.add(pivot);

  const velocity = { x: 0, y: autoSpeed };
  let dragging = false;
  let last = null;

  function rotate(x, y) {
    pivot.rotateOnWorldAxis(xAxis, x);
    pivot.rotateOnWorldAxis(yAxis, y);
  }

  function resize() {
    renderer.setSize(coco.clientWidth, coco.clientWidth, false);
  }

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    last = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    velocity.x = 0;
    velocity.y = 0;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const factor = Math.PI / canvas.clientWidth;
    const x = (event.clientY - last.y) * factor;
    const y = (event.clientX - last.x) * factor;
    const seconds = Math.max((event.timeStamp - last.time) / 1000, 0.001);
    rotate(x, y);
    velocity.x = x / seconds;
    velocity.y = y / seconds;
    last = { x: event.clientX, y: event.clientY, time: event.timeStamp };
  });

  const release = (event) => {
    if (!dragging) return;
    dragging = false;
    if (reducedMotion || event.timeStamp - last.time > 100) {
      velocity.x = 0;
      velocity.y = 0;
    }
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  let previous = performance.now();
  function frame(now) {
    const seconds = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    if (!dragging) {
      const blend = 1 - Math.exp(-seconds * 1.5);
      velocity.x += (0 - velocity.x) * blend;
      velocity.y += (autoSpeed - velocity.y) * blend;
      rotate(velocity.x * seconds, velocity.y * seconds);
      const q = pivot.quaternion;
      upright.set(0, q.y, 0, q.w);
      if (upright.length() > 0.001) pivot.quaternion.slerp(upright.normalize(), 1 - Math.exp(-seconds * 1.2));
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  new THREE.GLTFLoader().load(coconut.file, (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.position.sub(box.getCenter(new THREE.Vector3()));
    pivot.add(model);

    const distance = Math.max(size.x, size.y, size.z) / 2 / (0.66 * Math.tan(THREE.MathUtils.degToRad(15)));
    camera.position.z = distance;
    camera.near = distance / 100;
    camera.far = distance * 10;
    camera.updateProjectionMatrix();

    resize();
    new ResizeObserver(resize).observe(coco);
    coco.append(canvas);
    requestAnimationFrame(frame);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      coco.classList.add("ready");
      coco.parentElement.append(credit);
    }));
  });
}

startViewer();
