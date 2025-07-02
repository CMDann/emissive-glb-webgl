let scene, camera, renderer, controls;
let additionalLight;
let loadedModel;
let lightEnabled = true;
let baseBackgroundColor = new THREE.Color(0x0a0a0a);

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    document.body.appendChild(renderer.domElement);
    
    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    
    // Lighting setup
    setupLighting();
    
    // Create environment objects
    createEnvironmentObjects();
    
    // Load the GLB model
    loadGLBModel();
    
    // Setup UI controls
    setupUIControls();
    
    // Hide loading message
    document.getElementById('loading').style.display = 'none';
    
    // Start animation loop
    animate();
}

function setupLighting() {
    // Ambient light (very dim)
    const ambientLight = new THREE.AmbientLight(0x404040, 0.1);
    scene.add(ambientLight);
    
    // Additional controllable light
    additionalLight = new THREE.DirectionalLight(0xffffff, 1);
    additionalLight.position.set(10, 10, 5);
    additionalLight.castShadow = true;
    additionalLight.shadow.mapSize.width = 2048;
    additionalLight.shadow.mapSize.height = 2048;
    scene.add(additionalLight);
}

function createEnvironmentObjects() {
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    
    // Create boxes on each side
    const positions = [
        { x: 3, y: 0, z: 0 },   // Right
        { x: -3, y: 0, z: 0 },  // Left
        { x: 0, y: 0, z: 3 },   // Front
        { x: 0, y: 0, z: -3 },  // Back
        { x: 0, y: 3, z: 0 },   // Top
        { x: 0, y: -3, z: 0 }   // Bottom
    ];
    
    positions.forEach(pos => {
        const box = new THREE.Mesh(boxGeometry, boxMaterial.clone());
        box.position.set(pos.x, pos.y, pos.z);
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
    });
    
    // Create cone behind (negative Z)
    const coneGeometry = new THREE.ConeGeometry(0.5, 2, 8);
    const coneMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.set(0, 0, -5);
    cone.castShadow = true;
    cone.receiveShadow = true;
    scene.add(cone);
    
    // Ground plane
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2;
    plane.receiveShadow = true;
    scene.add(plane);
}

function loadGLBModel() {
    const loader = new THREE.GLTFLoader();
    
    loader.load(
        './models/test.glb',
        function(gltf) {
            console.log('GLB model loaded successfully', gltf);
            loadedModel = gltf.scene;
            loadedModel.position.set(0, 0, 0);
            
            // Traverse the model to find emissive materials
            loadedModel.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Check if material has emissive properties
                    if (child.material && child.material.emissive) {
                        console.log('Found emissive material:', child.material);
                        // Ensure emissive intensity is visible
                        if (child.material.emissiveIntensity !== undefined) {
                            child.material.emissiveIntensity = Math.max(child.material.emissiveIntensity, 1);
                        }
                    }
                }
            });
            
            scene.add(loadedModel);
            document.getElementById('modelStatus').textContent = 'test.glb loaded successfully';
        },
        function(progress) {
            if (progress.total > 0) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                document.getElementById('modelStatus').textContent = `Loading test.glb... ${percent}%`;
            }
        },
        function(error) {
            console.error('Error loading GLB model:', error);
            document.getElementById('modelStatus').textContent = 'test.glb not found - using placeholder';
            
            // Create a placeholder emissive cube if model fails to load
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshStandardMaterial({
                color: 0x00ff00,
                emissive: 0x004400,
                emissiveIntensity: 0.8
            });
            const placeholder = new THREE.Mesh(geometry, material);
            placeholder.position.set(0, 0, 0);
            scene.add(placeholder);
        }
    );
}

function setupUIControls() {
    const lightToggle = document.getElementById('lightToggle');
    const lightIntensity = document.getElementById('lightIntensity');
    const intensityValue = document.getElementById('intensityValue');
    const backgroundColor = document.getElementById('backgroundColor');
    
    lightToggle.addEventListener('click', function() {
        lightEnabled = !lightEnabled;
        additionalLight.visible = lightEnabled;
        lightToggle.textContent = `Additional Light: ${lightEnabled ? 'ON' : 'OFF'}`;
        lightToggle.className = lightEnabled ? '' : 'off';
    });
    
    lightIntensity.addEventListener('input', function() {
        const value = parseFloat(this.value);
        additionalLight.intensity = value;
        intensityValue.textContent = value.toFixed(1);
        updateBackgroundColor();
    });
    
    backgroundColor.addEventListener('input', function() {
        baseBackgroundColor = new THREE.Color(this.value);
        updateBackgroundColor();
    });
}

function updateBackgroundColor() {
    const lightIntensity = parseFloat(document.getElementById('lightIntensity').value);
    const dimFactor = Math.max(0.1, lightIntensity / 2); // Minimum 10% brightness, max 50% at intensity 1.0
    const dimmedColor = baseBackgroundColor.clone().multiplyScalar(dimFactor);
    scene.background = dimmedColor;
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

// Initialize the scene when page loads
window.addEventListener('DOMContentLoaded', init);