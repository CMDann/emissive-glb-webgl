# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a simple 3D web application built with Three.js that displays an interactive emissive 3D scene. The application loads and displays a GLB model (test.glb) with emissive materials and provides interactive lighting controls.

## Architecture

### Core Structure
- **index.html**: Single-page application containing all HTML, CSS, and JavaScript
- **models/**: Directory containing 3D assets (GLB format)
  - test.glb: The main 3D model with emissive materials

### Key Components

The application is structured as a single JavaScript module within index.html with these main functions:

- `init()`: Scene initialization, sets up Three.js components
- `setupLighting()`: Configures ambient and directional lighting
- `createEnvironmentObjects()`: Creates surrounding geometry (boxes, cone, ground plane)
- `loadGLBModel()`: Handles GLB model loading with emissive material processing
- `setupUIControls()`: Manages interactive light controls
- `animate()`: Main render loop

### Three.js Configuration
- Uses Three.js r128 via CDN
- Includes OrbitControls for camera interaction
- GLTFLoader for loading 3D models
- Shadow mapping enabled (PCFSoftShadowMap)
- sRGB color encoding with ACES Filmic tone mapping

## Development

### Running the Application
Since this is a static HTML file with CDN dependencies, you can:
- Open index.html directly in a browser, or
- Serve via a local HTTP server (recommended for GLB loading):
  ```bash
  python -m http.server 8000
  # or
  npx serve .
  ```

### Model Requirements
- Models should be in GLB format
- Place models in the models/ directory
- The application specifically looks for "test.glb"
- Models with emissive materials will have their emissiveIntensity automatically adjusted to minimum 1.0

### Key Features
- Interactive lighting controls (toggle light, adjust intensity)
- Orbit camera controls
- Shadow casting and receiving
- Emissive material enhancement
- Fallback placeholder if model fails to load

## File Modifications

When editing this project:
- All code is contained within index.html
- CSS styles are in the `<style>` section (lines 10-70)
- JavaScript logic is in the `<script>` section (lines 89-283)
- No build process or package management is used
- Dependencies are loaded via CDN

The application handles model loading gracefully - if test.glb is not found, it creates a green emissive cube as a placeholder.