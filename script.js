let scene, camera, renderer, controls;
let lights = [];
let lightStates = [];
let loadedModel;
let baseBackgroundColor = new THREE.Color(0x0a0a0a);
let materialsEnabled = true;
let wireframeEnabled = false;
let lightsVisible = false;
let lightHelpers = [];
let originalMaterials = new Map();
let autoScaleFactor = 1;
let manualScale = 1;
let particleSystem;
let particlesEnabled = false;
let particleCount = 500;
let boundingBoxHelper;
let boundingBoxVisible = false;
let objectWireframeEnabled = false;
let emissiveMaterials = [];

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
    
    // Setup particle system
    setupParticleSystem();
    
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
    
    // Create 5 directional lights with different default positions and colors
    const lightConfigs = [
        { color: 0xffffff, intensity: 1, position: [10, 10, 5], enabled: true },
        { color: 0xff8888, intensity: 0.5, position: [-10, 10, 5], enabled: false },
        { color: 0x88ff88, intensity: 0.5, position: [10, 10, -5], enabled: false },
        { color: 0x8888ff, intensity: 0.5, position: [-10, 10, -5], enabled: false },
        { color: 0xffff88, intensity: 0.5, position: [0, 15, 0], enabled: false }
    ];
    
    lightConfigs.forEach((config, index) => {
        const light = new THREE.DirectionalLight(config.color, config.intensity);
        light.position.set(...config.position);
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.visible = config.enabled;
        
        scene.add(light);
        lights.push(light);
        lightStates.push(config.enabled);
    });
}

function setupLightHelpers() {
    lights.forEach((light, index) => {
        // DirectionalLight helper
        const lightHelper = new THREE.DirectionalLightHelper(light, 1.5);
        lightHelper.visible = lightsVisible;
        scene.add(lightHelper);
        lightHelpers.push(lightHelper);
        
        // Light position indicator (sphere)
        const indicatorGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const indicatorMaterial = new THREE.MeshBasicMaterial({ color: light.color });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.copy(light.position);
        indicator.visible = lightsVisible;
        scene.add(indicator);
        lightHelpers.push(indicator);
    });
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

function setupParticleSystem() {
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);
    
    // Initialize particle positions and velocities
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Random positions in a sphere around the center
        const radius = Math.random() * 8 + 2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        particlePositions[i3 + 1] = radius * Math.cos(phi);
        particlePositions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        
        // Random velocities
        particleVelocities[i3] = (Math.random() - 0.5) * 0.02;
        particleVelocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
        particleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(particleVelocities, 3));
    
    // Create particle material with emissive glow
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x44aaff,
        size: 0.1,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleSystem.visible = particlesEnabled;
    scene.add(particleSystem);
}

function updateParticles() {
    if (!particleSystem || !particlesEnabled) return;
    
    const positions = particleSystem.geometry.attributes.position.array;
    const velocities = particleSystem.geometry.attributes.velocity.array;
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Update positions based on velocities
        positions[i3] += velocities[i3];
        positions[i3 + 1] += velocities[i3 + 1];
        positions[i3 + 2] += velocities[i3 + 2];
        
        // Gravity effect
        velocities[i3 + 1] -= 0.0005;
        
        // Bounce off the ground
        if (positions[i3 + 1] < -2) {
            positions[i3 + 1] = -2;
            velocities[i3 + 1] *= -0.8;
        }
        
        // Reset particles that go too far
        const distance = Math.sqrt(
            positions[i3] * positions[i3] + 
            positions[i3 + 1] * positions[i3 + 1] + 
            positions[i3 + 2] * positions[i3 + 2]
        );
        
        if (distance > 15) {
            // Reset to random position near center
            const radius = Math.random() * 2 + 1;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.cos(phi) + 2;
            positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
            
            velocities[i3] = (Math.random() - 0.5) * 0.02;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
        }
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.geometry.attributes.velocity.needsUpdate = true;
}

function recreateParticleSystem() {
    if (particleSystem) {
        scene.remove(particleSystem);
        particleSystem.geometry.dispose();
        particleSystem.material.dispose();
    }
    setupParticleSystem();
}

function analyzeObject(object) {
    let totalVertices = 0;
    let totalFaces = 0;
    let meshCount = 0;
    let materialCount = 0;
    let materialInfo = '';
    
    emissiveMaterials = [];
    
    object.traverse(function(child) {
        if (child.isMesh) {
            meshCount++;
            
            if (child.geometry) {
                if (child.geometry.attributes.position) {
                    totalVertices += child.geometry.attributes.position.count;
                }
                if (child.geometry.index) {
                    totalFaces += child.geometry.index.count / 3;
                } else if (child.geometry.attributes.position) {
                    totalFaces += child.geometry.attributes.position.count / 3;
                }
            }
            
            if (child.material) {
                materialCount++;
                
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat.emissive && mat.emissive.getHex() !== 0) {
                            emissiveMaterials.push(mat);
                        }
                    });
                } else {
                    if (child.material.emissive && child.material.emissive.getHex() !== 0) {
                        emissiveMaterials.push(child.material);
                    }
                }
            }
        }
    });
    
    // Update geometry info
    const geometryInfo = document.getElementById('geometryInfo');
    geometryInfo.textContent = `Meshes: ${meshCount}\nVertices: ${totalVertices.toLocaleString()}\nFaces: ${Math.round(totalFaces).toLocaleString()}`;
    
    // Update material info
    const materialInfoEl = document.getElementById('materialInfo');
    if (emissiveMaterials.length > 0) {
        materialInfo = `Materials: ${materialCount}\nEmissive materials: ${emissiveMaterials.length}\n`;
        emissiveMaterials.forEach((mat, i) => {
            const emissiveColor = mat.emissive.getHexString();
            const intensity = mat.emissiveIntensity || 1;
            materialInfo += `Emissive ${i + 1}: #${emissiveColor} (${intensity})\n`;
        });
    } else {
        materialInfo = `Materials: ${materialCount}\nNo emissive materials found`;
    }
    materialInfoEl.textContent = materialInfo;
    
    // Create bounding box helper
    createBoundingBoxHelper();
}

function createBoundingBoxHelper() {
    if (!loadedModel) return;
    
    // Remove existing bounding box
    if (boundingBoxHelper) {
        scene.remove(boundingBoxHelper);
        boundingBoxHelper.geometry.dispose();
        boundingBoxHelper.material.dispose();
    }
    
    const box = new THREE.Box3().setFromObject(loadedModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        wireframe: true,
        transparent: true,
        opacity: 0.5
    });
    
    boundingBoxHelper = new THREE.Mesh(geometry, material);
    boundingBoxHelper.position.copy(center);
    boundingBoxHelper.visible = boundingBoxVisible;
    scene.add(boundingBoxHelper);
}

function toggleBoundingBox() {
    boundingBoxVisible = !boundingBoxVisible;
    if (boundingBoxHelper) {
        boundingBoxHelper.visible = boundingBoxVisible;
    }
}

function toggleObjectWireframe() {
    objectWireframeEnabled = !objectWireframeEnabled;
    
    if (loadedModel) {
        loadedModel.traverse(function(child) {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        mat.wireframe = objectWireframeEnabled;
                    });
                } else {
                    child.material.wireframe = objectWireframeEnabled;
                }
            }
        });
    }
}

function updateEmissiveIntensity(value) {
    emissiveMaterials.forEach(material => {
        material.emissiveIntensity = parseFloat(value);
    });
}

function updateObjectOpacity(value) {
    if (loadedModel) {
        loadedModel.traverse(function(child) {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        mat.transparent = value < 1;
                        mat.opacity = parseFloat(value);
                    });
                } else {
                    child.material.transparent = value < 1;
                    child.material.opacity = parseFloat(value);
                }
            }
        });
    }
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
            
            // Auto-scale model to fit within environment bounds
            autoScaleModel(loadedModel);
            
            // Analyze and update inspector info
            analyzeObject(loadedModel);
            
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
            loadedModel = placeholder; // Assign for transform controls
            
            // Analyze placeholder
            analyzeObject(loadedModel);
            
            scene.add(placeholder);
        }
    );
}

function setupUIControls() {
    const backgroundColor = document.getElementById('backgroundColor');
    const materialsToggle = document.getElementById('materialsToggle');
    const wireframeToggle = document.getElementById('wireframeToggle');
    const lightsToggle = document.getElementById('lightsToggle');
    const particlesToggle = document.getElementById('particlesToggle');
    const particleCountSlider = document.getElementById('particleCount');
    const particleCountValue = document.getElementById('particleCountValue');
    const boundingBoxToggle = document.getElementById('boundingBoxToggle');
    const objectWireframeToggle = document.getElementById('objectWireframeToggle');
    const emissiveIntensitySlider = document.getElementById('emissiveIntensity');
    const emissiveIntensityValue = document.getElementById('emissiveIntensityValue');
    const objectOpacitySlider = document.getElementById('objectOpacity');
    const objectOpacityValue = document.getElementById('objectOpacityValue');
    const modelScale = document.getElementById('modelScale');
    const scaleValue = document.getElementById('scaleValue');
    const modelRotationX = document.getElementById('modelRotationX');
    const modelRotationY = document.getElementById('modelRotationY');
    const modelRotationZ = document.getElementById('modelRotationZ');
    const rotationXValue = document.getElementById('rotationXValue');
    const rotationYValue = document.getElementById('rotationYValue');
    const rotationZValue = document.getElementById('rotationZValue');
    
    // Setup controls for each light
    for (let i = 1; i <= 5; i++) {
        setupLightControls(i);
    }
    
    // Setup UI controls
    setupUIToggleAndCollapse();
    
    
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
    
    particlesToggle.addEventListener('click', function() {
        particlesEnabled = !particlesEnabled;
        if (particleSystem) {
            particleSystem.visible = particlesEnabled;
        }
        particlesToggle.textContent = `Particles: ${particlesEnabled ? 'ON' : 'OFF'}`;
        particlesToggle.className = particlesEnabled ? '' : 'off';
    });
    
    particleCountSlider.addEventListener('input', function() {
        particleCount = parseInt(this.value);
        particleCountValue.textContent = particleCount;
        recreateParticleSystem();
    });
    
    boundingBoxToggle.addEventListener('click', function() {
        toggleBoundingBox();
        boundingBoxToggle.textContent = `Bounding Box: ${boundingBoxVisible ? 'ON' : 'OFF'}`;
        boundingBoxToggle.className = boundingBoxVisible ? '' : 'off';
    });
    
    objectWireframeToggle.addEventListener('click', function() {
        toggleObjectWireframe();
        objectWireframeToggle.textContent = `Object Wireframe: ${objectWireframeEnabled ? 'ON' : 'OFF'}`;
        objectWireframeToggle.className = objectWireframeEnabled ? '' : 'off';
    });
    
    emissiveIntensitySlider.addEventListener('input', function() {
        const value = parseFloat(this.value);
        updateEmissiveIntensity(value);
        emissiveIntensityValue.textContent = value.toFixed(1);
    });
    
    objectOpacitySlider.addEventListener('input', function() {
        const value = parseFloat(this.value);
        updateObjectOpacity(value);
        objectOpacityValue.textContent = value.toFixed(1);
    });
    
    modelScale.addEventListener('input', function() {
        manualScale = parseFloat(this.value);
        updateModelTransform();
        scaleValue.textContent = manualScale.toFixed(1);
    });
    
    modelRotationX.addEventListener('input', function() {
        const value = parseFloat(this.value);
        updateModelTransform();
        rotationXValue.textContent = value + '°';
    });
    
    modelRotationY.addEventListener('input', function() {
        const value = parseFloat(this.value);
        updateModelTransform();
        rotationYValue.textContent = value + '°';
    });
    
    modelRotationZ.addEventListener('input', function() {
        const value = parseFloat(this.value);
        updateModelTransform();
        rotationZValue.textContent = value + '°';
    });
}

function setupLightControls(lightIndex) {
    const toggle = document.getElementById(`light${lightIndex}Toggle`);
    const colorPicker = document.getElementById(`light${lightIndex}Color`);
    const intensity = document.getElementById(`light${lightIndex}Intensity`);
    const intensityValue = document.getElementById(`light${lightIndex}IntensityValue`);
    const rotationX = document.getElementById(`light${lightIndex}RotationX`);
    const rotationY = document.getElementById(`light${lightIndex}RotationY`);
    const rotationXValue = document.getElementById(`light${lightIndex}RotationXValue`);
    const rotationYValue = document.getElementById(`light${lightIndex}RotationYValue`);
    
    const light = lights[lightIndex - 1];
    const lightHelperIndex = (lightIndex - 1) * 2; // Each light has 2 helpers
    
    toggle.addEventListener('click', function() {
        lightStates[lightIndex - 1] = !lightStates[lightIndex - 1];
        light.visible = lightStates[lightIndex - 1];
        toggle.textContent = `Light ${lightIndex}: ${lightStates[lightIndex - 1] ? 'ON' : 'OFF'}`;
        toggle.className = lightStates[lightIndex - 1] ? '' : 'off';
        updateBackgroundColor();
    });
    
    colorPicker.addEventListener('input', function() {
        const color = new THREE.Color(this.value);
        light.color = color;
        // Update indicator color
        if (lightHelpers[lightHelperIndex + 1] && lightHelpers[lightHelperIndex + 1].material) {
            lightHelpers[lightHelperIndex + 1].material.color = color;
        }
    });
    
    intensity.addEventListener('input', function() {
        const value = parseFloat(this.value);
        light.intensity = value;
        intensityValue.textContent = value.toFixed(1);
        updateBackgroundColor();
    });
    
    rotationX.addEventListener('input', function() {
        const value = parseFloat(this.value);
        updateLightPosition(lightIndex - 1);
        rotationXValue.textContent = value + '°';
    });
    
    rotationY.addEventListener('input', function() {
        const value = parseFloat(this.value);
        updateLightPosition(lightIndex - 1);
        rotationYValue.textContent = value + '°';
    });
}

function updateLightPosition(lightIndex) {
    const light = lights[lightIndex];
    const rotX = parseFloat(document.getElementById(`light${lightIndex + 1}RotationX`).value) * Math.PI / 180;
    const rotY = parseFloat(document.getElementById(`light${lightIndex + 1}RotationY`).value) * Math.PI / 180;
    
    // Calculate position based on spherical coordinates
    const distance = 12;
    const x = distance * Math.sin(rotX) * Math.cos(rotY);
    const y = distance * Math.cos(rotX);
    const z = distance * Math.sin(rotX) * Math.sin(rotY);
    
    light.position.set(x, y, z);
    
    // Update light helper positions
    const helperIndex = lightIndex * 2;
    if (lightHelpers[helperIndex + 1]) {
        lightHelpers[helperIndex + 1].position.copy(light.position);
    }
}

function updateBackgroundColor() {
    // Calculate combined light intensity from all enabled lights
    let totalIntensity = 0;
    lights.forEach((light, index) => {
        if (lightStates[index]) {
            totalIntensity += light.intensity;
        }
    });
    
    const dimFactor = Math.max(0.1, Math.min(1, totalIntensity / 3)); // Scale based on total intensity
    const dimmedColor = baseBackgroundColor.clone().multiplyScalar(dimFactor);
    scene.background = dimmedColor;
}

function setupUIToggleAndCollapse() {
    const uiToggle = document.getElementById('uiToggle');
    const topPanel = document.getElementById('topPanel');
    const bottomPanel = document.getElementById('bottomPanel');
    let uiVisible = true;
    
    // UI Toggle functionality
    uiToggle.addEventListener('click', function() {
        uiVisible = !uiVisible;
        if (uiVisible) {
            topPanel.classList.remove('hidden');
            bottomPanel.classList.remove('hidden');
            uiToggle.textContent = 'Hide UI';
        } else {
            topPanel.classList.add('hidden');
            bottomPanel.classList.add('hidden');
            uiToggle.textContent = 'Show UI';
        }
    });
    
    // Collapsible sections functionality
    const sectionHeaders = document.querySelectorAll('.section-header');
    sectionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const sectionName = this.getAttribute('data-section');
            const content = document.getElementById(sectionName + '-content');
            const isCollapsed = content.classList.contains('collapsed');
            
            if (isCollapsed) {
                content.classList.remove('collapsed');
                this.classList.remove('collapsed');
            } else {
                content.classList.add('collapsed');
                this.classList.add('collapsed');
            }
        });
    });
}

function toggleMaterials() {
    scene.traverse(function(child) {
        if (child.isMesh && child.material) {
            if (materialsEnabled) {
                // Restore original material
                const originalMaterial = originalMaterials.get(child);
                if (originalMaterial) {
                    child.material = originalMaterial.clone();
                    // Ensure shadow properties are maintained
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            } else {
                // Use basic material with no textures (basic materials don't receive shadows)
                child.material = new THREE.MeshLambertMaterial({ color: 0x888888 });
                // Keep shadow casting/receiving enabled
                child.castShadow = true;
                child.receiveShadow = true;
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

function autoScaleModel(model) {
    // Calculate bounding box of the loaded model
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    
    // Environment bounds (based on surrounding objects at distance 3)
    const maxEnvironmentSize = 2.5; // Slightly smaller than the 3-unit spacing
    
    // Find the largest dimension
    const maxModelSize = Math.max(size.x, size.y, size.z);
    
    // Calculate auto-scale factor to fit within environment
    if (maxModelSize > maxEnvironmentSize) {
        autoScaleFactor = maxEnvironmentSize / maxModelSize;
    } else {
        autoScaleFactor = 1;
    }
    
    // Apply initial transform
    updateModelTransform();
}

function updateModelTransform() {
    if (!loadedModel) return;
    
    // Apply combined auto-scale and manual scale
    const totalScale = autoScaleFactor * manualScale;
    loadedModel.scale.set(totalScale, totalScale, totalScale);
    
    // Apply rotations
    const rotX = (parseFloat(document.getElementById('modelRotationX').value) * Math.PI) / 180;
    const rotY = (parseFloat(document.getElementById('modelRotationY').value) * Math.PI) / 180;
    const rotZ = (parseFloat(document.getElementById('modelRotationZ').value) * Math.PI) / 180;
    
    loadedModel.rotation.set(rotX, rotY, rotZ);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    updateParticles();
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