const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname, 'database');
fs.ensureDirSync(dbDir);

// Create uploads directories
const uploadsDir = path.join(__dirname, 'uploads');
const modelsDir = path.join(uploadsDir, 'models');
const shadersDir = path.join(uploadsDir, 'shaders');

fs.ensureDirSync(modelsDir);
fs.ensureDirSync(shadersDir);

// Initialize database
const dbPath = path.join(dbDir, 'emmsive.db');
const db = new sqlite3.Database(dbPath);

console.log('Initializing database...');

db.serialize(() => {
    // Create models table
    db.run(`
        CREATE TABLE IF NOT EXISTS models (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            filename TEXT NOT NULL,
            description TEXT,
            file_size INTEGER,
            upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_default BOOLEAN DEFAULT 0,
            has_animations BOOLEAN DEFAULT 0,
            vertex_count INTEGER,
            face_count INTEGER,
            tags TEXT
        )
    `);

    // Create shaders table
    db.run(`
        CREATE TABLE IF NOT EXISTS shaders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            filename TEXT NOT NULL,
            description TEXT,
            category TEXT DEFAULT 'Custom',
            shader_code TEXT NOT NULL,
            upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_example BOOLEAN DEFAULT 0,
            tags TEXT
        )
    `);

    // Insert default model entry (test.glb)
    db.run(`
        INSERT OR IGNORE INTO models (name, filename, description, is_default) 
        VALUES ('Test Model', 'test.glb', 'Default test model', 1)
    `);

    // Insert example shaders from the examples folder
    const exampleShaders = [
        {
            name: 'Holographic Interference',
            filename: 'holographic_interference.txt',
            category: 'Original',
            description: 'Complex holographic effect with interference waves and depth'
        },
        {
            name: 'Plasma Energy Field',
            filename: 'plasma_energy.txt',
            category: 'Original',
            description: 'High-energy turbulent field with electric discharges'
        },
        {
            name: 'Crystalline Lattice',
            filename: 'crystalline_lattice.txt',
            category: 'Original',
            description: '3D crystal formation with internal refraction'
        },
        {
            name: 'Ocean Waves',
            filename: 'ocean_waves.txt',
            category: 'Nature',
            description: 'Realistic water surface with foam and depth variation'
        },
        {
            name: 'Fire and Flames',
            filename: 'fire_flames.txt',
            category: 'Nature',
            description: 'Dynamic fire effect with realistic flame movement'
        },
        {
            name: 'Forest Growth',
            filename: 'forest_growth.txt',
            category: 'Nature',
            description: 'Organic growth patterns with bark texture and leaf veins'
        },
        {
            name: 'Storm Lightning',
            filename: 'storm_lightning.txt',
            category: 'Nature',
            description: 'Electric storm with lightning bolts and turbulence'
        },
        {
            name: 'Fractal Mandelbrot',
            filename: 'fractal_mandelbrot.txt',
            category: 'Mathematical',
            description: '3D animated Mandelbrot set with infinite zoom'
        },
        {
            name: 'Geometric Tessellation',
            filename: 'geometric_tessellation.txt',
            category: 'Mathematical',
            description: 'Complex geometric patterns with mathematical precision'
        },
        {
            name: 'Wave Interference',
            filename: 'wave_interference.txt',
            category: 'Mathematical',
            description: 'Complex wave physics with interference patterns'
        },
        {
            name: 'Mathematical Spirals',
            filename: 'mathematical_spirals.txt',
            category: 'Mathematical',
            description: 'Fibonacci, Archimedean, and logarithmic spirals'
        },
        {
            name: 'Digital Matrix',
            filename: 'digital_matrix.txt',
            category: 'Sci-Fi',
            description: 'Cyberpunk-style digital rain and data streams'
        },
        {
            name: 'Space Nebula',
            filename: 'space_nebula.txt',
            category: 'Sci-Fi',
            description: 'Cosmic gas clouds with stellar formation'
        },
        {
            name: 'Quantum Fields',
            filename: 'quantum_fields.txt',
            category: 'Sci-Fi',
            description: 'Visualization of quantum field fluctuations'
        },
        {
            name: 'Cyber Grid',
            filename: 'cyber_grid.txt',
            category: 'Sci-Fi',
            description: 'Futuristic network topology with data flow'
        }
    ];

    // Read shader content from examples folder and insert into database
    const examplesPath = path.join(__dirname, 'examples');
    
    exampleShaders.forEach(shader => {
        const shaderPath = path.join(examplesPath, shader.filename);
        
        try {
            if (fs.existsSync(shaderPath)) {
                const shaderCode = fs.readFileSync(shaderPath, 'utf8');
                
                db.run(`
                    INSERT OR IGNORE INTO shaders 
                    (name, filename, description, category, shader_code, is_example) 
                    VALUES (?, ?, ?, ?, ?, 1)
                `, [shader.name, shader.filename, shader.description, shader.category, shaderCode]);
                
                console.log(`Added shader: ${shader.name}`);
            }
        } catch (error) {
            console.log(`Could not read shader file: ${shader.filename}`);
        }
    });

    console.log('Database initialization complete!');
    console.log(`Database created at: ${dbPath}`);
    console.log(`Models directory: ${modelsDir}`);
    console.log(`Shaders directory: ${shadersDir}`);
});

db.close();