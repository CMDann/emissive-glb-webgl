let scene, camera, renderer, controls;
let additionalLight;
let loadedModel;
let lightEnabled = true;
let baseBackgroundColor = new THREE.Color(0x0a0a0a);
let materialsEnabled = true;
let wireframeEnabled = false;
let lightsVisible = false;
let lightHelpers = [];
let originalMaterials = new Map();

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
    
    // Setup light helpers
    setupLightHelpers();
    
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

function setupLightHelpers() {
    // DirectionalLight helper
    const directionalLightHelper = new THREE.DirectionalLightHelper(additionalLight, 2);
    directionalLightHelper.visible = lightsVisible;
    scene.add(directionalLightHelper);
    lightHelpers.push(directionalLightHelper);
    
    // Light position indicator (sphere)
    const lightIndicatorGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const lightIndicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const lightIndicator = new THREE.Mesh(lightIndicatorGeometry, lightIndicatorMaterial);
    lightIndicator.position.copy(additionalLight.position);
    lightIndicator.visible = lightsVisible;
    scene.add(lightIndicator);
    lightHelpers.push(lightIndicator);
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
                    
                    // Store original material for toggle functionality
                    if (child.material) {
                        originalMaterials.set(child, child.material.clone());
                        
                        // Check if material has emissive properties
                        if (child.material.emissive) {
                            console.log('Found emissive material:', child.material);
                            // Ensure emissive intensity is visible
                            if (child.material.emissiveIntensity !== undefined) {
                                child.material.emissiveIntensity = Math.max(child.material.emissiveIntensity, 1);
                            }
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
    const materialsToggle = document.getElementById('materialsToggle');
    const wireframeToggle = document.getElementById('wireframeToggle');
    const lightsToggle = document.getElementById('lightsToggle');
    
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
    
    materialsToggle.addEventListener('click', function() {
        materialsEnabled = !materialsEnabled;
        toggleMaterials();
        materialsToggle.textContent = `Materials: ${materialsEnabled ? 'ON' : 'OFF'}`;
        materialsToggle.className = materialsEnabled ? '' : 'off';
    });
    
    wireframeToggle.addEventListener('click', function() {
        wireframeEnabled = !wireframeEnabled;
        toggleWireframe();
        wireframeToggle.textContent = `Wireframe: ${wireframeEnabled ? 'ON' : 'OFF'}`;
        wireframeToggle.className = wireframeEnabled ? 'off' : '';
    });
    
    lightsToggle.addEventListener('click', function() {
        lightsVisible = !lightsVisible;
        toggleLightVisibility();
        lightsToggle.textContent = `Show Lights: ${lightsVisible ? 'ON' : 'OFF'}`;
        lightsToggle.className = lightsVisible ? '' : 'off';
    });
}

function updateBackgroundColor() {
    const lightIntensity = parseFloat(document.getElementById('lightIntensity').value);
    const dimFactor = Math.max(0.1, lightIntensity / 2); // Minimum 10% brightness, max 50% at intensity 1.0
    const dimmedColor = baseBackgroundColor.clone().multiplyScalar(dimFactor);
    scene.background = dimmedColor;
}

function toggleMaterials() {
    scene.traverse(function(child) {
        if (child.isMesh && child.material) {
            if (materialsEnabled) {
                // Restore original material
                const originalMaterial = originalMaterials.get(child);
                if (originalMaterial) {
                    child.material = originalMaterial.clone();
                }
            } else {
                // Use basic material with no textures
                child.material = new THREE.MeshBasicMaterial({ color: 0x888888 });
            }
        }
    });
}

function toggleWireframe() {
    scene.traverse(function(child) {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    mat.wireframe = wireframeEnabled;
                });
            } else {
                child.material.wireframe = wireframeEnabled;
            }
        }
    });
}

function toggleLightVisibility() {
    lightHelpers.forEach(helper => {
        helper.visible = lightsVisible;
    });
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