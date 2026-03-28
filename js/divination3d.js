// ═══════════════════════════════════════════════
// 3D DIVINATION ROSE (Magical Three.js)
// ═══════════════════════════════════════════════

let divScene, divCamera, divRenderer, divRose;
let divInitialized = false;

function initDivination3D() {
    if (divInitialized) return;
    const canvas = document.getElementById('divinationCanvas');
    if (!canvas) return;

    divScene = new THREE.Scene();
    
    // Deeper space feel
    divCamera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    divCamera.position.set(0, 5, 15);
    divCamera.lookAt(0, 0, 0);

    divRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    divRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    divRenderer.setPixelRatio(window.devicePixelRatio);
    divRenderer.setClearColor(0x000000, 0);

    // ─── Create Magical Particle Rose ───
    const particlesCount = 8000;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    const sizes = new Float32Array(particlesCount);

    const color1 = new THREE.Color(0x8a2be2); // Deep Purple
    const color2 = new THREE.Color(0xff1493); // Pink/Rose
    const color3 = new THREE.Color(0xd4af37); // Gold

    for (let i = 0; i < particlesCount; i++) {
        // Parametric Rose Formula Variation
        // See: https://en.wikipedia.org/wiki/Rose_(mathematics)
        const phi = Math.random() * Math.PI * 2;
        const v = Math.random();
        // n=5 petals usually looks good
        const petals = 5;
        const r = Math.pow(v, 0.5) * (1 + 0.3 * Math.sin(petals * phi));
        
        // Helix/Petal lift
        const z = (1 - v) * 5 + Math.sin(phi * petals) * 0.5;
        
        const x = r * Math.cos(phi) * 5;
        const y = r * Math.sin(phi) * 5;

        positions[i * 3] = x;
        positions[i * 3 + 1] = z - 2; // Offset
        positions[i * 3 + 2] = y;

        // Color blending
        const mixColor = i / particlesCount;
        let pColor;
        if (mixColor < 0.6) {
            pColor = color1.clone().lerp(color2, mixColor / 0.6);
        } else {
            pColor = color2.clone().lerp(color3, (mixColor - 0.6) / 0.4);
        }

        colors[i * 3] = pColor.r;
        colors[i * 3 + 1] = pColor.g;
        colors[i * 3 + 2] = pColor.b;

        sizes[i] = Math.random() * 2 + 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });

    divRose = new THREE.Points(geometry, material);
    divScene.add(divRose);

    // Add some floaty magical dust
    const dustCount = 200;
    const dustPositions = new Float32Array(dustCount * 3);
    for(let i=0; i<dustCount; i++) {
        dustPositions[i*3] = (Math.random() - 0.5) * 30;
        dustPositions[i*3+1] = (Math.random() - 0.5) * 30;
        dustPositions[i*3+2] = (Math.random() - 0.5) * 30;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({ size: 0.05, color: 0xffffff, transparent: true, opacity: 0.4 });
    const dust = new THREE.Points(dustGeo, dustMat);
    divScene.add(dust);

    function animateDivination() {
        requestAnimationFrame(animateDivination);
        
        // Only render if divination section is active
        const divSec = document.getElementById('divination');
        if (divSec && divSec.classList.contains('active')) {
            const time = Date.now() * 0.001;
            
            divRose.rotation.y = time * 0.2;
            divRose.rotation.z = Math.sin(time * 0.5) * 0.1;
            
            // Breathe effect
            divRose.scale.setScalar(1 + Math.sin(time) * 0.05);
            
            dust.rotation.y = time * 0.05;

            divRenderer.render(divScene, divCamera);
        }
    }
    
    animateDivination();

    window.addEventListener('resize', () => {
        if (!canvas.clientWidth) return;
        divCamera.aspect = canvas.clientWidth / canvas.clientHeight;
        divCamera.updateProjectionMatrix();
        divRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });

    divInitialized = true;
}

// Hook into existing navigation
const divinationSectionObs = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.id === 'divination' && mutation.target.classList.contains('active')) {
            if (!divInitialized) {
                initDivination3D();
            }
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const divSec = document.getElementById('divination');
    if (divSec) {
        divinationSectionObs.observe(divSec, { attributes: true, attributeFilter: ['class'] });
    }
});
