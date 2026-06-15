// Register ScrollTrigger with GSAP
gsap.registerPlugin(ScrollTrigger);

/* =========================================================================
   1. LENIS SMOOTH SCROLLING
   ========================================================================= */
const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  direction: 'vertical',
  smooth: true,
  mouseMultiplier: 1,
  smoothTouch: false,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Keep GSAP and Lenis scroll in sync
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

/* =========================================================================
   2. AUDIO ENGINE (Web Audio API Synthesizer)
   ========================================================================= */
let audioCtx = null;
let humOsc = null;
let humGain = null;
let engineOscNode = null;
let engineGainNode = null;
let soundEnabled = false;

const audioToggle = document.getElementById('audioToggle');

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // 1. Ambient System Hum (Representing battery/standby state)
  humOsc = audioCtx.createOscillator();
  humGain = audioCtx.createGain();
  
  humOsc.type = 'sine';
  humOsc.frequency.value = 55; // A1 note (deep hum)
  humGain.gain.value = 0;
  
  humOsc.connect(humGain);
  humGain.connect(audioCtx.destination);
  humOsc.start();
  
  // 2. Exploded view V12 Engine Idle Sound
  engineOscNode = audioCtx.createOscillator();
  engineGainNode = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  engineOscNode.type = 'sawtooth';
  engineOscNode.frequency.value = 30; // V12 low idle rumble
  engineGainNode.gain.value = 0;
  
  filter.type = 'lowpass';
  filter.frequency.value = 120;
  
  engineOscNode.connect(filter);
  filter.connect(engineGainNode);
  engineGainNode.connect(audioCtx.destination);
  engineOscNode.start();
}

function playIgnitionSound() {
  if (!soundEnabled || !audioCtx) return;
  
  // Fade in the ambient headlight ignition hum
  humGain.gain.cancelScheduledValues(audioCtx.currentTime);
  humGain.gain.setValueAtTime(0, audioCtx.currentTime);
  humGain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.1);
  
  // Short electronic pulse sound
  const pulseOsc = audioCtx.createOscillator();
  const pulseGain = audioCtx.createGain();
  pulseOsc.type = 'triangle';
  pulseOsc.frequency.setValueAtTime(110, audioCtx.currentTime);
  pulseOsc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
  
  pulseGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  pulseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
  
  pulseOsc.connect(pulseGain);
  pulseGain.connect(audioCtx.destination);
  pulseOsc.start();
  pulseOsc.stop(audioCtx.currentTime + 0.4);
}

function playRoarSound(duration = 1.5) {
  if (!soundEnabled || !audioCtx) return;
  
  // Roaring V12 trigger
  const roarOsc1 = audioCtx.createOscillator();
  const roarOsc2 = audioCtx.createOscillator();
  const roarGain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const waveshaper = audioCtx.createWaveShaper();
  
  function makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
  
  waveshaper.curve = makeDistortionCurve(40);
  waveshaper.oversample = '4x';
  
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.3);
  
  roarOsc1.type = 'sawtooth';
  roarOsc1.frequency.setValueAtTime(40, audioCtx.currentTime);
  roarOsc1.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.3);
  
  roarOsc2.type = 'sawtooth';
  roarOsc2.frequency.setValueAtTime(40.5, audioCtx.currentTime);
  roarOsc2.frequency.exponentialRampToValueAtTime(222, audioCtx.currentTime + 0.3);
  
  roarGain.gain.setValueAtTime(0, audioCtx.currentTime);
  roarGain.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 0.1);
  roarGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  roarOsc1.connect(waveshaper);
  roarOsc2.connect(waveshaper);
  waveshaper.connect(filter);
  filter.connect(roarGain);
  roarGain.connect(audioCtx.destination);
  
  roarOsc1.start();
  roarOsc2.start();
  roarOsc1.stop(audioCtx.currentTime + duration);
  roarOsc2.stop(audioCtx.currentTime + duration);
}

function updateEngineAudioByScroll(scrollRatio) {
  if (!soundEnabled || !audioCtx) return;
  
  // Dynamic audio styling based on scroll phase
  if (scrollRatio > 0.05 && scrollRatio < 0.8) {
    engineGainNode.gain.value = 0.12 + Math.sin(scrollRatio * Math.PI) * 0.15;
    engineOscNode.frequency.value = 30 + scrollRatio * 90;
  } else {
    engineGainNode.gain.value = 0;
  }
  
  // High-frequency hybrid whine (electric motors)
  if (scrollRatio > 0.35 && scrollRatio < 0.65) {
    // Enable brief electric hum
    humGain.gain.value = 0.15;
    humOsc.frequency.value = 110 + (scrollRatio - 0.35) * 440;
  } else {
    humGain.gain.value = 0.05;
    humOsc.frequency.value = 55;
  }
}

audioToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    audioToggle.classList.add('active');
    audioToggle.querySelector('span').innerText = 'SYSTEM AUDIO ACTIVE';
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } else {
    audioToggle.classList.remove('active');
    audioToggle.querySelector('span').innerText = 'SYSTEM AUDIO MUTED';
    if (humGain) humGain.gain.value = 0;
    if (engineGainNode) engineGainNode.gain.value = 0;
  }
});

// Auto initialize on first user scroll interaction to bypass browser policies
window.addEventListener('scroll', () => {
  if (soundEnabled && audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}, { once: true });

/* =========================================================================
   3. THREE.JS ENGINE SETUP
   ========================================================================= */
const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();

// Camera Setup
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0.45, 4.8); // Start front view close to headlights
const cameraTarget = { x: 0, y: 0.25, z: 1.2 }; // Focus target for camera.lookAt

// Renderer Setup
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Lighting Setup
const ambientLight = new THREE.AmbientLight(0x020205, 1.5);
scene.add(ambientLight);

const frontSpotLight = new THREE.SpotLight(0xFF5A00, 15, 12, Math.PI / 4, 0.5, 1.5);
frontSpotLight.position.set(0, 2, 5);
scene.add(frontSpotLight);

const rearSpotLight = new THREE.SpotLight(0x00F3FF, 8, 12, Math.PI / 4, 0.5, 1.5);
rearSpotLight.position.set(0, 2, -5);
scene.add(rearSpotLight);

const sideLight = new THREE.DirectionalLight(0xffffff, 1.0);
sideLight.position.set(5, 2, 0);
scene.add(sideLight);

/* =========================================================================
   4. POST-PROCESSING (Unreal Bloom)
   ========================================================================= */
const renderScene = new THREE.RenderPass(scene, camera);
const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,  // Strength
  0.4,  // Radius
  0.25  // Threshold
);

const composer = new THREE.EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

/* =========================================================================
   5. PROCEDURAL CAR GEOMETRY BUILDER
   ========================================================================= */
const carGroup = new THREE.Group();
scene.add(carGroup);

// A helper function to create glowing tube/cylinder lines (simulates CAD/Neon lines)
function createGlowTube(p1, p2, radius = 0.015, color = 0xFF5A00) {
  const v1 = new THREE.Vector3(...p1);
  const v2 = new THREE.Vector3(...p2);
  const distance = v1.distanceTo(v2);
  
  const geometry = new THREE.CylinderGeometry(radius, radius, distance, 6);
  // Center cylinder geometry
  geometry.translate(0, distance / 2, 0);
  geometry.rotateX(Math.PI / 2);
  
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.9,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(v1);
  mesh.lookAt(v2);
  
  return mesh;
}

// Procedural twill carbon fiber texture
const createCarbonTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#060608';
  ctx.fillRect(0, 0, 8, 8);
  ctx.fillRect(8, 8, 8, 8);
  ctx.fillStyle = '#141417';
  ctx.fillRect(0, 8, 8, 8);
  ctx.fillRect(8, 0, 8, 8);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 20);
  return texture;
};

const carbonTex = createCarbonTexture();

// Main Chassis Materials
const carbonMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x050507,
  roughness: 0.15,
  metalness: 0.95,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
  map: carbonTex,
  transmission: 0.15,
  thickness: 0.4,
  envMapIntensity: 1.5,
});

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x111115,
  transparent: true,
  opacity: 0.35,
  roughness: 0.05,
  metalness: 0.1,
  transmission: 0.9,
  ior: 1.52,
  thickness: 0.1,
});

const glowingOrangeMat = new THREE.MeshBasicMaterial({
  color: 0xFF5A00,
  transparent: true,
  opacity: 0.05, // Will animate on ignition
});

const glowingCyanMat = new THREE.MeshBasicMaterial({
  color: 0x00F3FF,
  transparent: true,
  opacity: 0.9,
});

const wheelRimMaterial = new THREE.MeshStandardMaterial({
  color: 0x111113,
  roughness: 0.3,
  metalness: 0.9,
});

// A. Car Chassis Panels
const bodyGroup = new THREE.Group();
carGroup.add(bodyGroup);

// Flat underbody chassis plate
const floorPlate = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 4.4), carbonMaterial);
floorPlate.position.set(0, 0.05, 0);
bodyGroup.add(floorPlate);

// Angled nose/front bumper hood
const hoodGeom = new THREE.BoxGeometry(1.7, 0.12, 1.2);
const hoodMesh = new THREE.Mesh(hoodGeom, carbonMaterial);
hoodMesh.position.set(0, 0.22, 1.5);
hoodMesh.rotation.x = 0.08;
bodyGroup.add(hoodMesh);

// Center cockpit glass dome
const cabinGeom = new THREE.SphereGeometry(0.85, 16, 16);
const cabinMesh = new THREE.Mesh(cabinGeom, glassMaterial);
cabinMesh.scale.set(1.0, 0.65, 2.0);
cabinMesh.position.set(0, 0.42, 0.05);
bodyGroup.add(cabinMesh);

// Left Side Pod / Aerodynamic vent
const leftPod = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 2.2), carbonMaterial);
leftPod.position.set(-0.95, 0.22, 0);
leftPod.rotation.y = 0.05;
bodyGroup.add(leftPod);

// Right Side Pod / Aerodynamic vent
const rightPod = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 2.2), carbonMaterial);
rightPod.position.set(0.95, 0.22, 0);
rightPod.rotation.y = -0.05;
bodyGroup.add(rightPod);

// Rear Engine Deck
const engineDeck = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.15, 1.4), carbonMaterial);
engineDeck.position.set(0, 0.35, -1.25);
bodyGroup.add(engineDeck);

// Active Spoiler
const rearSpoiler = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.04, 0.35), carbonMaterial);
rearSpoiler.position.set(0, 0.44, -1.98);
bodyGroup.add(rearSpoiler);

// Chrome Double Exhaust pipes
const exhaustLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 8), wheelRimMaterial);
exhaustLeft.rotation.x = Math.PI / 2;
exhaustLeft.position.set(-0.2, 0.36, -2.0);
bodyGroup.add(exhaustLeft);

const exhaustRight = exhaustLeft.clone();
exhaustRight.position.x = 0.2;
bodyGroup.add(exhaustRight);

// B. Headlights Setup (Glowing neon Y shapes)
const headlightGroup = new THREE.Group();
carGroup.add(headlightGroup);

// Left Y Headlight Tubes
const ly1 = createGlowTube([-0.82, 0.23, 2.05], [-0.7, 0.22, 2.05], 0.012, 0xFF5A00);
const ly2 = createGlowTube([-0.82, 0.23, 2.05], [-0.9, 0.3, 1.95], 0.012, 0xFF5A00);
const ly3 = createGlowTube([-0.82, 0.23, 2.05], [-0.9, 0.16, 1.95], 0.012, 0xFF5A00);
headlightGroup.add(ly1, ly2, ly3);

// Right Y Headlight Tubes
const ry1 = createGlowTube([0.82, 0.23, 2.05], [0.7, 0.22, 2.05], 0.012, 0xFF5A00);
const ry2 = createGlowTube([0.82, 0.23, 2.05], [0.9, 0.3, 1.95], 0.012, 0xFF5A00);
const ry3 = createGlowTube([0.82, 0.23, 2.05], [0.9, 0.16, 1.95], 0.012, 0xFF5A00);
headlightGroup.add(ry1, ry2, ry3);

// Initially turn off headlights (represented by opacity in timeline)
headlightGroup.children.forEach(mesh => {
  mesh.material.opacity = 0;
});

// C. Wheels Assembly (Front & Rear, Left & Right)
const wheelsArray = [];
const wheelRadius = 0.38;

const createWheel = (isFront) => {
  const wheelGroup = new THREE.Group();
  
  // Tire
  const tireGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.3, 24);
  tireGeom.rotateZ(Math.PI / 2);
  const tireMesh = new THREE.Mesh(tireGeom, wheelRimMaterial);
  wheelGroup.add(tireMesh);
  
  // Outer Rim ring
  const rimGeom = new THREE.TorusGeometry(wheelRadius - 0.06, 0.02, 8, 24);
  const rimMesh = new THREE.Mesh(rimGeom, new THREE.MeshBasicMaterial({ color: 0xFF5A00 }));
  rimMesh.rotation.y = Math.PI / 2;
  wheelGroup.add(rimMesh);

  // Spokes
  for(let i=0; i<5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const spokeGeom = new THREE.CylinderGeometry(0.012, 0.012, wheelRadius - 0.08, 6);
    const spoke = new THREE.Mesh(spokeGeom, wheelRimMaterial);
    spoke.position.set(0, Math.sin(angle) * (wheelRadius/2 - 0.04), Math.cos(angle) * (wheelRadius/2 - 0.04));
    spoke.rotation.x = angle;
    wheelGroup.add(spoke);
  }
  
  return wheelGroup;
};

// front left
const wFL = createWheel(true); wFL.position.set(-0.95, wheelRadius, 1.35);
// front right
const wFR = createWheel(true); wFR.position.set(0.95, wheelRadius, 1.35);
wFR.rotation.y = Math.PI;
// rear left
const wRL = createWheel(false); wRL.position.set(-0.95, wheelRadius, -1.25);
// rear right
const wRR = createWheel(false); wRR.position.set(0.95, wheelRadius, -1.25);
wRR.rotation.y = Math.PI;

carGroup.add(wFL, wFR, wRL, wRR);
wheelsArray.push(wFL, wFR, wRL, wRR);

// D. V12 Hybrid Engine Core (Inside rear bay)
const engineGroup = new THREE.Group();
engineGroup.position.set(0, 0.32, -1.2); // Mid-rear placement
carGroup.add(engineGroup);

// Left block cylinder head
const engineLeftBlock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.75), carbonMaterial);
engineLeftBlock.position.set(-0.16, 0, 0);
engineLeftBlock.rotation.z = 0.45; // V-shape angle
engineGroup.add(engineLeftBlock);

// Right block cylinder head
const engineRightBlock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.75), carbonMaterial);
engineRightBlock.position.set(0.16, 0, 0);
engineRightBlock.rotation.z = -0.45;
engineGroup.add(engineRightBlock);

// Engine central intake cover (with glowing orange logo badge representation)
const engineCoverMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.65), carbonMaterial);
engineCoverMesh.position.set(0, 0.14, 0);
engineGroup.add(engineCoverMesh);

const logoGlowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.5), glowingOrangeMat);
logoGlowStrip.position.set(0, 0.2, 0);
engineGroup.add(logoGlowStrip);

// Hybrid battery pack (cyan glowing spine)
const hybridBattery = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12), glowingCyanMat);
hybridBattery.rotation.x = Math.PI / 2;
hybridBattery.position.set(0, -0.15, 0.85); // Runs along center tunnel
engineGroup.add(hybridBattery);

// Electric hybrid motors (Cyan glowing spheres)
const rearElectricMotor = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), glowingCyanMat);
rearElectricMotor.position.set(0, -0.1, -0.5); // Integrated with transmission
engineGroup.add(rearElectricMotor);

const frontElectricMotorL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), glowingCyanMat);
frontElectricMotorL.position.set(-0.7, -0.15, 2.55); // Front Axle Left
carGroup.add(frontElectricMotorL);

const frontElectricMotorR = frontElectricMotorL.clone();
frontElectricMotorR.position.x = 0.7; // Front Axle Right
carGroup.add(frontElectricMotorR);

// E. Engine Bay Hatch Cover (Glass engine cover that lifts)
const engineHatchGroup = new THREE.Group();
engineHatchGroup.position.set(0, 0.38, -0.6); // Pivot point at front of engine deck
carGroup.add(engineHatchGroup);

const engineHatchGlass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 1.2), glassMaterial);
engineHatchGlass.position.set(0, 0, -0.6); // Offset geometry from pivot
engineHatchGroup.add(engineHatchGlass);

// F. Pilot's Cockpit Grid & Telemetry HUD Screen
const cockpitGroup = new THREE.Group();
cockpitGroup.position.set(0, 0.32, 0.1);
carGroup.add(cockpitGroup);

// Steering Wheel
const steeringTorus = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 8, 20), wheelRimMaterial);
steeringTorus.position.set(0, 0.12, 0.52);
steeringTorus.rotation.x = -0.3; // Angled column
cockpitGroup.add(steeringTorus);

// Dash HUD display mesh
const canvasHUD = document.createElement('canvas');
canvasHUD.width = 256;
canvasHUD.height = 128;
const ctxHUD = canvasHUD.getContext('2d');
const hudTexture = new THREE.CanvasTexture(canvasHUD);

const hudScreenGeom = new THREE.PlaneGeometry(0.3, 0.16);
const hudScreenMat = new THREE.MeshBasicMaterial({ map: hudTexture, transparent: true, opacity: 0.95 });
const hudScreenMesh = new THREE.Mesh(hudScreenGeom, hudScreenMat);
hudScreenMesh.position.set(0, 0.12, 0.46);
hudScreenMesh.rotation.x = -0.3;
cockpitGroup.add(hudScreenMesh);

function drawHUDTelemetry(time, speedVal = 0) {
  ctxHUD.fillStyle = 'rgba(2, 2, 4, 0.8)';
  ctxHUD.fillRect(0, 0, 256, 128);
  
  // Neon cyan cyber grid lines
  ctxHUD.strokeStyle = 'rgba(0, 243, 255, 0.4)';
  ctxHUD.lineWidth = 1;
  ctxHUD.strokeRect(4, 4, 248, 120);
  
  // Dashboard boot-up meters
  ctxHUD.fillStyle = '#00F3FF';
  ctxHUD.font = 'bold 12px "Space Mono"';
  ctxHUD.fillText('PILOT HUD v1.2', 15, 22);
  
  ctxHUD.font = '9px "Space Mono"';
  ctxHUD.fillText('V12 ACTIVE | CORSA MODE', 15, 38);
  
  // Power charging bar
  ctxHUD.strokeStyle = '#00F3FF';
  ctxHUD.strokeRect(15, 48, 226, 6);
  const chargePercent = Math.min(100, Math.floor(speedVal * 0.28));
  ctxHUD.fillRect(15, 48, 2.26 * chargePercent, 6);
  
  // Digital Speedometer
  ctxHUD.fillStyle = '#FF5A00';
  ctxHUD.font = 'bold 36px "Orbitron"';
  ctxHUD.fillText(Math.floor(speedVal).toString().padStart(3, '0'), 15, 96);
  
  ctxHUD.font = '10px "Space Mono"';
  ctxHUD.fillText('KM/H', 125, 88);
  ctxHUD.fillText('GEAR: D6', 125, 98);
  
  // Battery status indicators
  ctxHUD.fillStyle = '#00F3FF';
  const hybridSine = Math.abs(Math.sin(time * 0.005));
  ctxHUD.fillText(`M1: OK | M2: OK | M3: OK`, 15, 114);
  
  hudTexture.needsUpdate = true;
}

/* =========================================================================
   6. WIND TUNNEL PARTICLE SIMULATION (Phase 1)
   ========================================================================= */
const particleCount = 120;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
const particleSpeeds = [];

const particlePaths = [];
for (let i = 0; i < 15; i++) {
  // Generate Bezier curves over the car body shape
  const startX = -0.8 + Math.random() * 1.6;
  const startY = 0.1 + Math.random() * 0.1;
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(startX, startY, 3.2), // In front
    new THREE.Vector3(startX * 0.8, startY + 0.22, 1.8), // Over front splitter
    new THREE.Vector3(startX * 0.5, startY + 0.65, 0.7), // Over cabin
    new THREE.Vector3(startX * 0.7, startY + 0.42, -1.0), // Over engine bay
    new THREE.Vector3(startX * 1.05, startY + 0.35, -2.8), // Behind spoiler
  ]);
  particlePaths.push(path);
}

const activeParticles = [];
for (let i = 0; i < particleCount; i++) {
  const pathIndex = Math.floor(Math.random() * particlePaths.length);
  const path = particlePaths[pathIndex];
  
  activeParticles.push({
    path: path,
    progress: Math.random(),
    speed: 0.007 + Math.random() * 0.015,
    size: 0.02 + Math.random() * 0.035,
    color: Math.random() > 0.4 ? 0x00F3FF : 0xFF5A00 // Cyan/Orange aero stream
  });
}

// Particle meshes
const windTunnelGroup = new THREE.Group();
carGroup.add(windTunnelGroup);
windTunnelGroup.visible = false; // Triggered on scroll

const particleSphereGeom = new THREE.SphereGeometry(0.015, 4, 4);

activeParticles.forEach((p) => {
  const mat = new THREE.MeshBasicMaterial({
    color: p.color,
    transparent: true,
    opacity: 0, // Animate on timeline
  });
  const mesh = new THREE.Mesh(particleSphereGeom, mat);
  mesh.scale.setScalar(p.size * 20);
  p.mesh = mesh;
  windTunnelGroup.add(mesh);
});

function updateWindTunnelParticles() {
  activeParticles.forEach((p) => {
    p.progress += p.speed;
    if (p.progress > 1) {
      p.progress = 0;
      p.speed = 0.007 + Math.random() * 0.015;
    }
    const pos = p.path.getPointAt(p.progress);
    p.mesh.position.copy(pos);
  });
}

/* =========================================================================
   7. DARKNESS SHATTER PARTICLES (Hero Awakening Transition)
   ========================================================================= */
const shatterCount = 1800;
const shatterGeom = new THREE.BufferGeometry();
const shatterPos = new Float32Array(shatterCount * 3);
const shatterVel = [];

// Position particles in a vertical plane representing a "dark screen" in front of camera
for (let i = 0; i < shatterCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const radius = Math.random() * 2.2;
  
  shatterPos[i * 3] = Math.cos(theta) * radius;
  shatterPos[i * 3 + 1] = Math.sin(theta) * radius + 0.3;
  shatterPos[i * 3 + 2] = 3.6; // Positioned right in front of headlight area
  
  // Shatter velocity outward
  shatterVel.push({
    x: Math.cos(theta) * (0.8 + Math.random() * 1.8),
    y: Math.sin(theta) * (0.8 + Math.random() * 1.8),
    z: -Math.random() * 2.5
  });
}

shatterGeom.setAttribute('position', new THREE.BufferAttribute(shatterPos, 3));
const shatterMat = new THREE.PointsMaterial({
  color: 0xFF5A00,
  size: 0.02,
  transparent: true,
  opacity: 0.95,
  blending: THREE.AdditiveBlending
});
const shatterPoints = new THREE.Points(shatterGeom, shatterMat);
scene.add(shatterPoints);

// Animates 0 to 1 on ScrollTrigger

function updateShatterParticles() {
  const positions = shatterGeom.attributes.position.array;
  for (let i = 0; i < shatterCount; i++) {
    const v = shatterVel[i];
    
    // Animate coordinates based on velocities and scroll progress
    positions[i * 3] = (Math.cos(i) * 2 * (1 - state.shatterProgress)) + (v.x * state.shatterProgress * 8.0);
    positions[i * 3 + 1] = (Math.sin(i) * 2 * (1 - state.shatterProgress)) + 0.3 + (v.y * state.shatterProgress * 8.0);
    positions[i * 3 + 2] = 3.6 + (v.z * state.shatterProgress * 12.0);
  }
  shatterGeom.attributes.position.needsUpdate = true;
  shatterMat.opacity = Math.max(0, 1.0 - (state.shatterProgress * 1.4));
}

/* =========================================================================
   8. HYPER-SPEED CLIMAX SPEED LINES
   ========================================================================= */
const tailLightsTrailGroup = new THREE.Group();
carGroup.add(tailLightsTrailGroup);
tailLightsTrailGroup.visible = false;

// Create long exposure brake light trails
const trailL1 = createGlowTube([-0.3, 0.34, -2.0], [-0.3, 0.34, -6.0], 0.028, 0xFF3E00);
const trailL2 = createGlowTube([-0.3, 0.34, -2.0], [-0.3, 0.34, -8.0], 0.012, 0xFF5A00);
const trailR1 = createGlowTube([0.3, 0.34, -2.0], [0.3, 0.34, -6.0], 0.028, 0xFF3E00);
const trailR2 = createGlowTube([0.3, 0.34, -2.0], [0.3, 0.34, -8.0], 0.012, 0xFF5A00);
tailLightsTrailGroup.add(trailL1, trailL2, trailR1, trailR2);

// Ambient starfield speed stars
const starCount = 350;
const starGeom = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
const starSpeeds = [];

for(let i=0; i<starCount; i++) {
  starPos[i*3] = (Math.random() - 0.5) * 25;
  starPos[i*3+1] = (Math.random() - 0.5) * 15;
  starPos[i*3+2] = -Math.random() * 35;
  starSpeeds.push(2.5 + Math.random() * 4.5);
}

starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({
  color: 0x00F3FF,
  size: 0.035,
  transparent: true,
  opacity: 0, // Controlled in Climax timeline
  blending: THREE.AdditiveBlending
});
const starPoints = new THREE.Points(starGeom, starMat);
scene.add(starPoints);

function updateStarfield(climaxProgress) {
  if (climaxProgress < 0.05) return;
  const positions = starGeom.attributes.position.array;
  for(let i=0; i<starCount; i++) {
    positions[i*3+2] += starSpeeds[i] * climaxProgress * 2.5; // Star flies forward
    if (positions[i*3+2] > 5) {
      positions[i*3+2] = -35; // Loop back
    }
  }
  starGeom.attributes.position.needsUpdate = true;
}

/* =========================================================================
   9. INTERACTIVE DROPDOWN TOGGLE (Phase 1)
   ========================================================================= */
const specsHeader = document.getElementById('specsHeader');
const specsContainer = document.querySelector('.specs-dropdown-container');

specsHeader.addEventListener('click', () => {
  specsContainer.classList.toggle('open');
  // Trigger Lenis scroll update as DOM height changed slightly
  setTimeout(() => lenis.resize(), 450);
});

/* =========================================================================
   10. GSAP SCROLL-TRIGGER TIMELINE MASTER
   ========================================================================= */
// Global timeline parameters to coordinate updates in animate loop
const state = {
  timelineProgress: 0,
  carWheelSpinScale: 0,
  dashboardBootProgress: 0,
  shatterProgress: 0
};

// Setup master scroll timeline
const mainTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: "body",
    start: "top top",
    end: "+=450%", // High scroll distance for smooth easing
    scrub: 1.2,
    pin: "#scroll-container",
    anticipatePin: 1,
    onUpdate: (self) => {
      state.timelineProgress = self.progress;
      updateEngineAudioByScroll(self.progress);
    }
  }
});

// A. PHASE 0: Hero Awakening (0% to 15% scroll)
mainTimeline.to({}, { duration: 0.05 }); // Start buffer

// Headlights Ignite
mainTimeline.to(headlightGroup.children.map(c => c.material), {
  opacity: 1,
  duration: 0.15,
  stagger: 0.02,
  onComplete: () => {
    playIgnitionSound();
  }
}, "<");

// Shatter darkness curtain
mainTimeline.to(shatterMat, {
  size: 0.12,
  duration: 0.18,
}, "<");

mainTimeline.to(state, {
  shatterProgress: 1.0,
  duration: 0.2,
  ease: "power2.out",
  onStart: () => {
    playRoarSound(2.0);
  }
}, "<");

// Display title, glitch, then fade
mainTimeline.to("#hero-tagline", { opacity: 1, y: 0, duration: 0.1 }, "<+0.05");
mainTimeline.to("#revuelto-title span", {
  classList: "glitch-active",
  duration: 0.12,
  stagger: { each: 0.01, from: "center" }
}, "<");

mainTimeline.to("#hero-sec .center-content", {
  opacity: 0,
  y: -50,
  duration: 0.15,
  ease: "power2.in"
}, "+=0.08");

// B. PHASE 1: Speed & Aerodynamics (15% to 40% scroll)
// Move camera to side profile, rotate car
mainTimeline.to(camera.position, {
  x: 3.5,
  y: 0.48,
  z: 0.0,
  duration: 0.4,
  ease: "power2.inOut"
}, "<");
mainTimeline.to(cameraTarget, {
  x: 0,
  y: 0.3,
  z: 0,
  duration: 0.4,
  ease: "power2.inOut"
}, "<");

mainTimeline.to(carGroup.rotation, {
  y: Math.PI / 2, // 90 deg profile
  duration: 0.4,
  ease: "power2.inOut"
}, "<");

mainTimeline.to("#aero-sec", {
  opacity: 1,
  visibility: "visible",
  pointerEvents: "auto",
  duration: 0.15
}, "<+0.15");

// Wheels spin up, Wind tunnel activates
mainTimeline.to(state, {
  carWheelSpinScale: 1.8,
  duration: 0.25,
  ease: "power1.out"
}, "<+0.1");

mainTimeline.set(windTunnelGroup, { visible: true }, "<");
activeParticles.forEach((p) => {
  mainTimeline.to(p.mesh.material, { opacity: 0.8, duration: 0.2 }, "<");
});

mainTimeline.to("#aero-sec .section-overlay-content", {
  opacity: 1,
  y: 0,
  duration: 0.25,
  ease: "power2.out"
}, "<");

// Fade out Phase 1 overlays
mainTimeline.to("#aero-sec .section-overlay-content", {
  opacity: 0,
  y: -30,
  duration: 0.15,
  ease: "power2.in"
}, "+=0.15");

mainTimeline.to("#aero-sec", {
  opacity: 0,
  visibility: "hidden",
  pointerEvents: "none",
  duration: 0.1
}, "<");

// Fade down wind tunnel particles
activeParticles.forEach((p) => {
  mainTimeline.to(p.mesh.material, { opacity: 0.1, duration: 0.15 }, "<");
});

// C. PHASE 2: The Heart of the Beast / Engine (40% to 65% scroll)
// Camera zooms to rear engine deck, looking down into engine
mainTimeline.to(camera.position, {
  x: -1.0,
  y: 1.15,
  z: -2.35,
  duration: 0.45,
  ease: "power2.inOut"
}, "<");
mainTimeline.to(cameraTarget, {
  x: 0,
  y: 0.3,
  z: -1.2,
  duration: 0.45,
  ease: "power2.inOut"
}, "<");

// Open Engine Bay glass hatch (pivot rotation)
mainTimeline.to(engineHatchGroup.rotation, {
  x: -0.5, // Lift Hatch upward
  duration: 0.35,
  ease: "back.out(1.2)"
}, "<+0.05");

// Engine Exploded View parts separation
mainTimeline.to(engineLeftBlock.position, {
  x: -0.32,
  y: 0.05,
  duration: 0.4,
  ease: "power2.out"
}, "<+0.1");

mainTimeline.to(engineRightBlock.position, {
  x: 0.32,
  y: 0.05,
  duration: 0.4,
  ease: "power2.out"
}, "<+0.1");

mainTimeline.to(engineCoverMesh.position, {
  y: 0.26,
  duration: 0.4,
  ease: "power2.out"
}, "<+0.1");

mainTimeline.to(logoGlowStrip.material, {
  opacity: 1.0,
  duration: 0.2
}, "<+0.1");

// V12 Specs Overlay reveals
mainTimeline.to("#engine-sec", {
  opacity: 1,
  visibility: "visible",
  pointerEvents: "auto",
  duration: 0.15
}, "<+0.1");

mainTimeline.to("#engine-sec .section-overlay-content", {
  opacity: 1,
  y: 0,
  duration: 0.25,
  ease: "power2.out"
}, "<");

// Fade out Phase 2 overlays
mainTimeline.to("#engine-sec .section-overlay-content", {
  opacity: 0,
  y: -30,
  duration: 0.15,
  ease: "power2.in"
}, "+=0.15");

mainTimeline.to("#engine-sec", {
  opacity: 0,
  visibility: "hidden",
  pointerEvents: "none",
  duration: 0.1
}, "<");

// D. PHASE 3: Pilot's Cockpit POV (65% to 85% scroll)
// Camera dives through glass dome inside driver's seat
mainTimeline.to(camera.position, {
  x: 0.0,
  y: 0.43,
  z: 0.1, // Inside cabin looking forward
  duration: 0.45,
  ease: "power2.inOut"
}, "<");
mainTimeline.to(cameraTarget, {
  x: 0,
  y: 0.35,
  z: 1.5, // Look forward out front windshield
  duration: 0.45,
  ease: "power2.inOut"
}, "<");

// Close engine hatch back down
mainTimeline.to(engineHatchGroup.rotation, {
  x: 0,
  duration: 0.35,
  ease: "power1.inOut"
}, "<");

// Restore engine exploded separation
mainTimeline.to([engineLeftBlock.position, engineRightBlock.position, engineCoverMesh.position], {
  x: (i) => i === 0 ? -0.16 : i === 1 ? 0.16 : 0,
  y: (i) => i === 2 ? 0.14 : 0,
  duration: 0.3
}, "<");

// Steering turns slightly
mainTimeline.to(steeringTorus.rotation, {
  z: -0.3,
  duration: 0.35,
  ease: "power1.inOut"
}, "<+0.1");

// Boot up cockpit telemetry screen
mainTimeline.to(state, {
  dashboardBootProgress: 1.0,
  duration: 0.35
}, "<");

// Cockpit description & HUD interactive elements reveal
mainTimeline.to("#cockpit-sec", {
  opacity: 1,
  visibility: "visible",
  pointerEvents: "auto",
  duration: 0.15
}, "<+0.15");

mainTimeline.to("#cockpit-sec .section-overlay-content", {
  opacity: 1,
  y: 0,
  duration: 0.25,
  ease: "power2.out"
}, "<");

mainTimeline.to(".hud-layer", {
  opacity: 1,
  duration: 0.3,
  onComplete: () => {
    // Pulse tooltips to capture attention
    gsap.fromTo(".pulse-dot", 
      { scale: 0.8, filter: "brightness(1.5)" }, 
      { scale: 1.2, filter: "brightness(1)", repeat: -1, yoyo: true, duration: 0.8 }
    );
  }
}, "<+0.1");

// Fade out cockpit overlays
mainTimeline.to(["#cockpit-sec .section-overlay-content", ".hud-layer"], {
  opacity: 0,
  duration: 0.15,
  ease: "power2.in"
}, "+=0.15");

mainTimeline.to("#cockpit-sec", {
  opacity: 0,
  visibility: "hidden",
  pointerEvents: "none",
  duration: 0.1
}, "<");

// E. PHASE 4: Climax & CTA speeds off (85% to 100% scroll)
// Pull camera back quickly
mainTimeline.to(camera.position, {
  x: 0,
  y: 0.7,
  z: 5.5,
  duration: 0.3,
  ease: "power2.inOut"
}, "<");
mainTimeline.to(cameraTarget, {
  x: 0,
  y: 0.3,
  z: -5.0, // Look down the road at the accelerating car
  duration: 0.3,
  ease: "power2.inOut"
}, "<");

// Rotate car back to point forward
mainTimeline.to(carGroup.rotation, {
  y: 0,
  duration: 0.3,
  ease: "power2.inOut"
}, "<");

// Turn on tail trails & starfield opacity
mainTimeline.set(tailLightsTrailGroup, { visible: true }, "<+0.1");
mainTimeline.to(starMat, { opacity: 0.9, duration: 0.15 }, "<");

// Accelerate car forward (speeding off into depth)
mainTimeline.to(carGroup.position, {
  z: -25.0,
  y: 0.15,
  duration: 0.45,
  ease: "power3.in"
}, "<+0.05");

// Wheels spin ultra-fast
mainTimeline.to(state, {
  carWheelSpinScale: 10.0,
  duration: 0.4,
  ease: "power1.in"
}, "<");

// Render Climax text card & Configure button
mainTimeline.to("#climax-sec", {
  opacity: 1,
  visibility: "visible",
  pointerEvents: "auto",
  duration: 0.25,
  ease: "power2.out"
}, "<+0.25");

mainTimeline.to(".climax-box", {
  opacity: 1,
  scale: 1,
  duration: 0.3,
  ease: "back.out(1.1)"
}, "<");

/* =========================================================================
   11. RENDER & ANIMATION LOOP
   ========================================================================= */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const elapsedTime = clock.getElapsedTime();
  const timeMs = elapsedTime * 1000;
  
  // 1. Rotate Wheels based on scroll wheelSpin factor
  if (state.carWheelSpinScale > 0.01) {
    wheelsArray.forEach((wheel) => {
      wheel.children[0].rotation.x += state.carWheelSpinScale * 0.15; // Tire spin
      wheel.children[2].rotation.x += state.carWheelSpinScale * 0.15; // Spokes spin
    });
  }
  
  // 2. Update particle systems
  if (state.shatterProgress > 0 && state.shatterProgress < 0.99) {
    updateShatterParticles();
  }
  
  if (state.timelineProgress > 0.15 && state.timelineProgress < 0.55) {
    updateWindTunnelParticles();
  }
  
  if (state.timelineProgress > 0.78) {
    updateStarfield(state.timelineProgress - 0.78);
  }
  
  // 3. Draw and update dashboard telemetry HUD
  let currentSpeed = 0;
  if (state.timelineProgress > 0.55 && state.timelineProgress < 0.85) {
    currentSpeed = (state.timelineProgress - 0.55) * 800; // Fake acceleration curve
  } else if (state.timelineProgress >= 0.85) {
    currentSpeed = 350; // Top speed
  }
  
  if (state.dashboardBootProgress > 0) {
    drawHUDTelemetry(timeMs, currentSpeed * state.dashboardBootProgress);
  }

  // 4. Camera target lookAt
  camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);

  // 5. Render composer (bloom + scene passes)
  composer.render();
}

// Start rendering loop once setup completes
animate();

/* =========================================================================
   12. RESIZE HANDLER
   ========================================================================= */
window.addEventListener('resize', () => {
  // Update camera
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  
  // Update renderer & composer sizes
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  
  // Update bloom passes
  bloomPass.resolution.set(window.innerWidth, window.innerHeight);
});

/* =========================================================================
   13. LOADER OVERLAY FADEOUT
   ========================================================================= */
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  
  let val = 0;
  const interval = setInterval(() => {
    val += Math.floor(Math.random() * 12) + 3;
    if (val >= 100) {
      val = 100;
      clearInterval(interval);
      
      progressBar.style.width = '100%';
      progressPercent.innerText = '100%';
      
      // Animate loader fadeout
      gsap.to(loader, {
        opacity: 0,
        pointerEvents: 'none',
        duration: 0.8,
        ease: 'power3.out',
        onComplete: () => {
          loader.style.display = 'none';
          
          // Initial entry animation for hero components
          gsap.to("#revuelto-title span", {
            y: 0,
            opacity: 1,
            stagger: 0.05,
            duration: 0.6,
            ease: "power3.out"
          });
          
          gsap.to(".scroll-hint", {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.4
          });
        }
      });
    } else {
      progressBar.style.width = val + '%';
      progressPercent.innerText = val.toString().padStart(2, '0') + '%';
    }
  }, 80);
});
