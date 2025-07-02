const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database connection
const dbPath = path.join(__dirname, 'database', 'emmsive.db');
const db = new sqlite3.Database(dbPath);

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const modelsDir = path.join(uploadsDir, 'models');
const shadersDir = path.join(uploadsDir, 'shaders');

fs.ensureDirSync(modelsDir);
fs.ensureDirSync(shadersDir);

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'model') {
            cb(null, modelsDir);
        } else if (file.fieldname === 'shader') {
            cb(null, shadersDir);
        }
    },
    filename: function (req, file, cb) {
        // Keep original filename
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.fieldname === 'model') {
            // Only accept GLB files
            if (path.extname(file.originalname).toLowerCase() === '.glb') {
                cb(null, true);
            } else {
                cb(new Error('Only GLB files are allowed for models'));
            }
        } else if (file.fieldname === 'shader') {
            // Accept text files for shaders
            if (path.extname(file.originalname).toLowerCase() === '.txt' || 
                path.extname(file.originalname).toLowerCase() === '.glsl') {
                cb(null, true);
            } else {
                cb(new Error('Only TXT or GLSL files are allowed for shaders'));
            }
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// API Routes

// Get all models
app.get('/api/models', (req, res) => {
    db.all(`
        SELECT id, name, filename, description, file_size, upload_date, 
               is_default, has_animations, vertex_count, face_count, tags 
        FROM models 
        ORDER BY is_default DESC, upload_date DESC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ models: rows });
    });
});

// Get all shaders
app.get('/api/shaders', (req, res) => {
    db.all(`
        SELECT id, name, filename, description, category, upload_date, is_example, tags 
        FROM shaders 
        ORDER BY is_example DESC, category, name
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ shaders: rows });
    });
});

// Get shader content
app.get('/api/shaders/:id/content', (req, res) => {
    const shaderId = req.params.id;
    
    db.get(`
        SELECT shader_code, filename 
        FROM shaders 
        WHERE id = ?
    `, [shaderId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Shader not found' });
            return;
        }
        res.json({ content: row.shader_code, filename: row.filename });
    });
});

// Upload model
app.post('/api/upload/model', upload.single('model'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No model file uploaded' });
    }

    const { name, description, tags } = req.body;
    const filename = req.file.filename;
    const fileSize = req.file.size;

    // Insert into database
    db.run(`
        INSERT INTO models (name, filename, description, file_size, tags) 
        VALUES (?, ?, ?, ?, ?)
    `, [name, filename, description, fileSize, tags], function(err) {
        if (err) {
            // Remove uploaded file if database insert fails
            fs.unlink(req.file.path, () => {});
            res.status(500).json({ error: err.message });
            return;
        }

        res.json({ 
            message: 'Model uploaded successfully',
            id: this.lastID,
            filename: filename
        });
    });
});

// Upload shader
app.post('/api/upload/shader', upload.single('shader'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No shader file uploaded' });
    }

    const { name, description, category, tags } = req.body;
    const filename = req.file.filename;

    // Read shader content
    fs.readFile(req.file.path, 'utf8', (err, shaderCode) => {
        if (err) {
            fs.unlink(req.file.path, () => {});
            return res.status(500).json({ error: 'Could not read shader file' });
        }

        // Insert into database
        db.run(`
            INSERT INTO shaders (name, filename, description, category, shader_code, tags) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name, filename, description, category || 'Custom', shaderCode, tags], function(err) {
            if (err) {
                fs.unlink(req.file.path, () => {});
                res.status(500).json({ error: err.message });
                return;
            }

            res.json({ 
                message: 'Shader uploaded successfully',
                id: this.lastID,
                filename: filename
            });
        });
    });
});

// Serve model files
app.get('/models/:filename', (req, res) => {
    const filename = req.params.filename;
    
    // First check if it's in uploads directory
    const uploadedPath = path.join(modelsDir, filename);
    if (fs.existsSync(uploadedPath)) {
        return res.sendFile(uploadedPath);
    }
    
    // Fall back to original models directory
    const originalPath = path.join(__dirname, 'models', filename);
    if (fs.existsSync(originalPath)) {
        return res.sendFile(originalPath);
    }
    
    res.status(404).json({ error: 'Model not found' });
});

// Delete model
app.delete('/api/models/:id', (req, res) => {
    const modelId = req.params.id;
    
    // Get model info first
    db.get('SELECT filename, is_default FROM models WHERE id = ?', [modelId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Model not found' });
        }
        if (row.is_default) {
            return res.status(400).json({ error: 'Cannot delete default model' });
        }

        // Delete from database
        db.run('DELETE FROM models WHERE id = ?', [modelId], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Delete file
            const filePath = path.join(modelsDir, row.filename);
            fs.unlink(filePath, () => {}); // Ignore errors

            res.json({ message: 'Model deleted successfully' });
        });
    });
});

// Delete shader
app.delete('/api/shaders/:id', (req, res) => {
    const shaderId = req.params.id;
    
    // Get shader info first
    db.get('SELECT filename, is_example FROM shaders WHERE id = ?', [shaderId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Shader not found' });
        }
        if (row.is_example) {
            return res.status(400).json({ error: 'Cannot delete example shader' });
        }

        // Delete from database
        db.run('DELETE FROM shaders WHERE id = ?', [shaderId], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Delete file
            const filePath = path.join(shadersDir, row.filename);
            fs.unlink(filePath, () => {}); // Ignore errors

            res.json({ message: 'Shader deleted successfully' });
        });
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
    }
    res.status(500).json({ error: error.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database: ${dbPath}`);
    console.log(`Models upload directory: ${modelsDir}`);
    console.log(`Shaders upload directory: ${shadersDir}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});