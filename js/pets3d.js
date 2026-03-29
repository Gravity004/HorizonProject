// ═══════════════════════════════════════════════
// 3D PET SHOWCASE (Hogwarts Legacy Style)
// ═══════════════════════════════════════════════
let pet3DScene, pet3DCamera, pet3DRenderer, pet3DMixer, pet3DModel;
let pet3DInitialized = false;
let currentLoadedSpecies = null;

function initPet3D() {
    if (pet3DInitialized) return;
    const canvas = document.getElementById('petCanvas');
    if (!canvas) return;

    pet3DScene = new THREE.Scene();
    
    // Create a beautiful, mystical environment lighting
    const ambientLight = new THREE.AmbientLight(0xffeeb1, 0.4); 
    pet3DScene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xd4af37, 1);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    pet3DScene.add(mainLight);

    const backLight = new THREE.DirectionalLight(0x8a2be2, 0.5);
    backLight.position.set(-5, 5, -5);
    pet3DScene.add(backLight);

    const rectLight = new THREE.RectAreaLight(0xffaa00, 2, 10, 10);
    rectLight.position.set(0, -2, 0);
    rectLight.lookAt(0, 0, 0);
    pet3DScene.add(rectLight);

    pet3DCamera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    pet3DCamera.position.set(0, 2, 8);

    pet3DRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    pet3DRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    pet3DRenderer.setPixelRatio(window.devicePixelRatio);
    pet3DRenderer.shadowMap.enabled = true;
    pet3DRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Add tonemapping to feel more premium
    pet3DRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    pet3DRenderer.toneMappingExposure = 1.0;

    const controls = new THREE.OrbitControls(pet3DCamera, pet3DRenderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false; // Usually don't want zooming in a fixed container
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't go below ground
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;
    controls.target.set(0, 1, 0);
    controls.update();

    // Invisible shadow catcher ground
    const planeGeo = new THREE.PlaneGeometry(20, 20);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1;
    plane.receiveShadow = true;
    pet3DScene.add(plane);

    // Start with default model
    window.updatePet3DModel('pet');

    const clock = new THREE.Clock();
    function animatePet3D() {
        requestAnimationFrame(animatePet3D);
        if (pet3DScene.parent !== null || document.getElementById('pets').classList.contains('active')) {
            const delta = clock.getDelta();
            if (pet3DMixer) pet3DMixer.update(delta);
            
            if (pet3DModel && pet3DModel.userData && pet3DModel.userData.isProcedural) {
                pet3DModel.userData.time += delta;
                const t = pet3DModel.userData.time;
                pet3DModel.position.y = 1.2 + Math.sin(t * 2) * 0.15;
                if (pet3DModel.userData.points) {
                    pet3DModel.userData.points.rotation.y += delta * 0.5;
                    pet3DModel.userData.points.rotation.x += delta * 0.2;
                }
            }

            controls.update();
            pet3DRenderer.render(pet3DScene, pet3DCamera);
        }
    }
    animatePet3D();

    window.addEventListener('resize', () => {
        if (!canvas.clientWidth || !pet3DInitialized) return;
        pet3DCamera.aspect = canvas.clientWidth / canvas.clientHeight;
        pet3DCamera.updateProjectionMatrix();
        pet3DRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });

    pet3DInitialized = true;
}

// Hook into existing navigation or observer to trigger Three.js load
const petsSectionObs = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.id === 'pets' && mutation.target.classList.contains('active')) {
            document.body.classList.add('pets-active');
            if (typeof initPet3D === 'function' && !pet3DInitialized) {
                initPet3D();
            }
        } else if (mutation.target.id === 'pets' && !mutation.target.classList.contains('active')) {
            document.body.classList.remove('pets-active');
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const petsSec = document.getElementById('pets');
    if (petsSec) {
        petsSectionObs.observe(petsSec, { attributes: true, attributeFilter: ['class'] });
    }
});

window.updatePet3DModel = function(species) {
    if (!pet3DInitialized || !pet3DScene) return;
    
    // Normalize species string
    const targetSpecies = species ? species.toLowerCase() : 'pet';
    if (currentLoadedSpecies === targetSpecies) return; // Already loaded

    // Clean up old model if it exists
    if (pet3DModel) {
        pet3DScene.remove(pet3DModel);
        if (pet3DModel.geometry) pet3DModel.geometry.dispose();
        if (pet3DModel.material) pet3DModel.material.dispose();
        pet3DModel = null;
    }
    if (pet3DMixer) {
        pet3DMixer.stopAllAction();
        pet3DMixer = null;
    }

    currentLoadedSpecies = targetSpecies;

    const loader = new THREE.GLTFLoader();
    const loadModel = (modelPath) => {
        return new Promise((resolve, reject) => {
            loader.load(modelPath, resolve, undefined, reject);
        });
    };

    const targetUrl = `assets/models/${targetSpecies}.glb`;

    // Try loading specific model, fallback to procedural magic aura if failed
    loadModel(targetUrl)
        .then((gltf) => {
            if (!gltf) return;
            pet3DModel = gltf.scene;
            pet3DModel.position.set(0, 0, 0);
            
            pet3DModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material.side = THREE.DoubleSide;
                    }
                }
            });

            // Make it slightly smaller and center it
            pet3DModel.scale.set(0.015, 0.015, 0.015);
            pet3DModel.position.y = 1;

            pet3DScene.add(pet3DModel);

            if (gltf.animations && gltf.animations.length) {
                pet3DMixer = new THREE.AnimationMixer(pet3DModel);
                const action = pet3DMixer.clipAction(gltf.animations[0]);
                action.play();
            }
        })
        .catch(() => {
            console.log(`Specific model for ${targetSpecies} not found, generating procedural magical aura.`);
            
            pet3DModel = new THREE.Group();
            
            // Magical color based on species mapping
            const colorMap = {
                'owl': 0xdddddd,
                'toad': 0x44aa44,
                'puffskein': 0xffaacc,
                'kneazle': 0xdd8833,
                'seal': 0x88ccff,
                'niffler': 0xffdd44,
                'hippogriff': 0xaabbcc,
                'thestral': 0x442266,
                'dragon': 0xff3333,
                'qilin': 0x44ffaa
            };
            const speciesColor = colorMap[targetSpecies] || 0xd4af37;
            
            // Sphere base
            const geo = new THREE.SphereGeometry(1.0, 32, 32);
            const mat = new THREE.MeshPhysicalMaterial({
                color: speciesColor,
                emissive: speciesColor,
                emissiveIntensity: 0.6,
                transparent: true,
                opacity: 0.6,
                roughness: 0.2,
                transmission: 0.8,
                thickness: 0.5
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            
            // Surrounding magic particles
            const pGeo = new THREE.BufferGeometry();
            const pCount = 300;
            const pOpts = new Float32Array(pCount * 3);
            for(let i=0; i<pCount*3; i++) {
                pOpts[i] = (Math.random() - 0.5) * 3.5;
            }
            pGeo.setAttribute('position', new THREE.BufferAttribute(pOpts, 3));
            const pMat = new THREE.PointsMaterial({
                color: speciesColor,
                size: 0.08,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
            const points = new THREE.Points(pGeo, pMat);
            
            pet3DModel.add(mesh);
            pet3DModel.add(points);
            
            pet3DModel.position.set(0, 1.2, 0);
            pet3DModel.userData = { isProcedural: true, points: points, time: 0 };
            
            pet3DScene.add(pet3DModel);
        });
};
