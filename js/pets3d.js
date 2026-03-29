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
                const baseY = pet3DModel.userData.baseY !== undefined ? pet3DModel.userData.baseY : 1.2;
                const bob = pet3DModel.userData.bobFactor !== undefined ? pet3DModel.userData.bobFactor : 0.15;
                pet3DModel.position.y = baseY + Math.sin(t * 2) * bob;
                
                // Add slight rotation or flapping if needed based on species
                if (pet3DModel.userData.isWinged && pet3DModel.userData.wings) {
                    pet3DModel.userData.wings.forEach((wing, idx) => {
                        const dir = idx === 0 ? 1 : -1;
                        wing.rotation.z = Math.sin(t * 5) * 0.3 * dir;
                    });
                }

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
            console.log(`Specific model for ${targetSpecies} not found, generating procedural model.`);
            
            pet3DModel = new THREE.Group();
            
            const colorMap = {
                'owl': 0x8B4513,      // SaddleBrown
                'toad': 0x2E8B57,     // SeaGreen
                'puffskein': 0xFFB6C1,// LightPink
                'kneazle': 0xD2691E,  // Chocolate
                'seal': 0xADD8E6,     // LightBlue
                'niffler': 0x111111,  // Black with gold
                'hippogriff': 0xA9A9A9, // DarkGray
                'thestral': 0x2F4F4F, // DarkSlateGray
                'dragon': 0x8B0000,   // DarkRed
                'qilin': 0xFFD700     // Gold
            };
            const speciesColor = colorMap[targetSpecies] || 0xd4af37;
            
            // Materials
            const mainMat = new THREE.MeshStandardMaterial({ color: speciesColor, roughness: 0.7, metalness: 0.1 });
            const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 });
            const detailMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 });
            const goldMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.3, metalness: 0.8 });
            
            const wings = [];

            if (targetSpecies === 'owl') {
                const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 16), mainMat);
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), mainMat);
                head.position.y = 0.8;
                const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.12), eyeMat);
                eyeL.position.set(-0.25, 0.9, 0.5);
                const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.12), eyeMat);
                eyeR.position.set(0.25, 0.9, 0.5);
                const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3), goldMat);
                beak.rotation.x = Math.PI / 2;
                beak.position.set(0, 0.75, 0.6);
                
                const wingL = new THREE.Group();
                const wingMeshL = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.8), mainMat);
                wingMeshL.position.set(0, -0.4, 0);
                wingL.add(wingMeshL);
                wingL.position.set(-0.7, 0.4, 0);
                
                const wingR = new THREE.Group();
                const wingMeshR = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.8), mainMat);
                wingMeshR.position.set(0, -0.4, 0);
                wingR.add(wingMeshR);
                wingR.position.set(0.7, 0.4, 0);

                wings.push(wingL, wingR);
                pet3DModel.add(body, head, eyeL, eyeR, beak, wingL, wingR);
            } 
            else if (targetSpecies === 'toad') {
                const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), mainMat);
                body.scale.set(1, 0.6, 1.2);
                const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.2), mainMat);
                eyeL.position.set(-0.35, 0.5, 0.6);
                const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.2), mainMat);
                eyeR.position.set(0.35, 0.5, 0.6);
                const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.08), eyeMat);
                pupilL.position.set(-0.35, 0.55, 0.75);
                const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.08), eyeMat);
                pupilR.position.set(0.35, 0.55, 0.75);
                pet3DModel.add(body, eyeL, eyeR, pupilL, pupilR);
            }
            else if (targetSpecies === 'puffskein') {
                const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 2), mainMat);
                const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1), eyeMat);
                eyeL.position.set(-0.25, 0.15, 0.75);
                const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.1), eyeMat);
                eyeR.position.set(0.25, 0.15, 0.75);
                const tongue = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4), new THREE.MeshStandardMaterial({color: 0xff4444}));
                tongue.rotation.x = Math.PI / 2;
                tongue.position.set(0, -0.1, 0.9);
                pet3DModel.add(body, eyeL, eyeR, tongue);
            }
            else if (targetSpecies === 'kneazle') {
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.4), mainMat);
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mainMat);
                head.position.set(0, 0.4, 0.8);
                const earL = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4), mainMat);
                earL.position.set(-0.2, 0.8, 0.8);
                const earR = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4), mainMat);
                earR.position.set(0.2, 0.8, 0.8);
                const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2), mainMat);
                tail.rotation.x = -Math.PI / 4;
                tail.position.set(0, 0.4, -0.8);
                const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.15), detailMat);
                tuft.position.set(0, 0.8, -1.2);
                pet3DModel.add(body, head, earL, earR, tail, tuft);
            }
            else if (targetSpecies === 'seal') {
                const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.2, 4, 16), mainMat);
                body.rotation.x = Math.PI / 2;
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.5), mainMat);
                head.position.set(0, 0.2, 0.9);
                const flipperL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.3), mainMat);
                flipperL.position.set(-0.5, -0.3, 0.4);
                flipperL.rotation.y = -Math.PI / 4;
                const flipperR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.3), mainMat);
                flipperR.position.set(0.5, -0.3, 0.4);
                flipperR.rotation.y = Math.PI / 4;
                const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1), eyeMat);
                nose.position.set(0, 0.2, 1.35);
                pet3DModel.add(body, head, flipperL, flipperR, nose);
            }
            else if (targetSpecies === 'niffler') {
                const body = new THREE.Mesh(new THREE.SphereGeometry(0.7), mainMat);
                body.scale.set(1, 1.2, 1);
                const snout = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5), detailMat);
                snout.rotation.x = Math.PI / 2;
                snout.position.set(0, 0.2, 0.8);
                const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04), goldMat);
                coin.rotation.x = Math.PI / 2;
                coin.rotation.z = Math.PI / 4;
                coin.position.set(0, 0.1, 1.1);
                pet3DModel.add(body, snout, coin);
            }
            else if (targetSpecies === 'hippogriff') {
                const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.2), mainMat);
                body.rotation.x = Math.PI / 2;
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.7), detailMat);
                head.position.set(0, 0.7, 0.8);
                const beak = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5), goldMat);
                beak.rotation.x = Math.PI / 2;
                beak.position.set(0, 0.7, 1.2);
                
                const wingL = new THREE.Group();
                const wMeshL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.8), detailMat);
                wMeshL.position.set(-0.75, 0, 0);
                wingL.add(wMeshL);
                wingL.position.set(-0.6, 0.4, 0);
                
                const wingR = new THREE.Group();
                const wMeshR = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.8), detailMat);
                wMeshR.position.set(0.75, 0, 0);
                wingR.add(wMeshR);
                wingR.position.set(0.6, 0.4, 0);

                wings.push(wingL, wingR);
                pet3DModel.add(body, head, beak, wingL, wingR);
            }
            else if (targetSpecies === 'thestral') {
                const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.6), mainMat);
                body.rotation.x = Math.PI / 2;
                const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.8), mainMat);
                neck.rotation.x = Math.PI / 4;
                neck.position.set(0, 0.6, 0.8);
                const head = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7), mainMat);
                head.rotation.x = Math.PI / 2;
                head.position.set(0, 0.9, 1.1);
                
                const wingMat = new THREE.MeshStandardMaterial({color: 0x111111, side: THREE.DoubleSide, transparent: true, opacity: 0.8});
                
                const wingL = new THREE.Group();
                const wMeshL = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), wingMat);
                wMeshL.rotation.x = Math.PI / 2;
                wMeshL.position.set(-0.75, 0, 0);
                wingL.add(wMeshL);
                wingL.position.set(-0.3, 0.4, 0);
                
                const wingR = new THREE.Group();
                const wMeshR = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), wingMat);
                wMeshR.rotation.x = Math.PI / 2;
                wMeshR.position.set(0.75, 0, 0);
                wingR.add(wMeshR);
                wingR.position.set(0.3, 0.4, 0);

                wings.push(wingL, wingR);
                pet3DModel.add(body, neck, head, wingL, wingR);
            }
            else if (targetSpecies === 'dragon') {
                const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.6), mainMat);
                body.rotation.x = Math.PI / 2;
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 1.0), mainMat);
                head.position.set(0, 0.4, 1.2);
                const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.6), mainMat);
                tail.rotation.x = -Math.PI / 2;
                tail.position.set(0, 0, -1.6);
                
                const wingL = new THREE.Group();
                const wMeshL = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), mainMat);
                wMeshL.material.side = THREE.DoubleSide;
                wMeshL.rotation.x = Math.PI / 2;
                wMeshL.position.set(-1.0, 0, 0);
                wingL.add(wMeshL);
                wingL.position.set(-0.6, 0.5, 0);
                
                const wingR = new THREE.Group();
                const wMeshR = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), mainMat);
                wMeshR.material.side = THREE.DoubleSide;
                wMeshR.rotation.x = Math.PI / 2;
                wMeshR.position.set(1.0, 0, 0);
                wingR.add(wMeshR);
                wingR.position.set(0.6, 0.5, 0);

                wings.push(wingL, wingR);
                pet3DModel.add(body, head, tail, wingL, wingR);
            }
            else if (targetSpecies === 'qilin') {
                const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.2), mainMat);
                body.rotation.x = Math.PI / 2;
                const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.0), mainMat);
                neck.position.set(0, 0.8, 0.6);
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.6), mainMat);
                head.position.set(0, 1.3, 0.8);
                const antlerL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5), goldMat);
                antlerL.rotation.z = Math.PI / 6;
                antlerL.position.set(-0.15, 1.6, 0.6);
                const antlerR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5), goldMat);
                antlerR.rotation.z = -Math.PI / 6;
                antlerR.position.set(0.15, 1.6, 0.6);
                pet3DModel.add(body, neck, head, antlerL, antlerR);
            }
            else {
                // Default magic orb
                const geo = new THREE.SphereGeometry(0.8, 32, 32);
                const mat = new THREE.MeshPhysicalMaterial({
                    color: speciesColor, emissive: speciesColor, emissiveIntensity: 0.6,
                    transparent: true, opacity: 0.6, roughness: 0.2, transmission: 0.8, thickness: 0.5
                });
                pet3DModel.add(new THREE.Mesh(geo, mat));
            }

            // Enable shadows for all parts
            pet3DModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Surrounding magic particles
            const pColor = targetSpecies === 'niffler' ? 0xFFD700 : speciesColor;
            const pGeo = new THREE.BufferGeometry();
            const pCount = 200;
            const pOpts = new Float32Array(pCount * 3);
            for(let i=0; i<pCount*3; i++) {
                pOpts[i] = (Math.random() - 0.5) * 3.0;
            }
            pGeo.setAttribute('position', new THREE.BufferAttribute(pOpts, 3));
            const pMat = new THREE.PointsMaterial({
                color: pColor, size: 0.06, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
            });
            const points = new THREE.Points(pGeo, pMat);
            pet3DModel.add(points);
            
            // Setup animation data
            pet3DModel.userData = { 
                isProcedural: true, 
                points: points, 
                time: 0,
                baseY: (targetSpecies === 'owl' || targetSpecies === 'dragon' || targetSpecies === 'hippogriff' || targetSpecies === 'thestral') ? 1.5 : 0.5,
                bobFactor: (targetSpecies === 'toad' || targetSpecies === 'puffskein') ? 0.3 : 0.1,
                isWinged: wings.length > 0,
                wings: wings
            };
            pet3DModel.position.y = pet3DModel.userData.baseY;
            
            pet3DScene.add(pet3DModel);
        });
};
