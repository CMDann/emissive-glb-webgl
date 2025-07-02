# 3D Emissive Scene

An interactive 3D web application built with Three.js that displays emissive materials with dynamic lighting and background controls.

## Features

- **3D Model Loading**: Loads GLB models with emissive material support
- **Interactive Lighting**: Toggle and adjust directional light intensity
- **Dynamic Background**: Change background color with automatic dimming based on light intensity
- **Orbit Controls**: Mouse-controlled camera movement around the scene
- **Shadow Mapping**: Realistic shadows with PCF soft shadow mapping
- **Fallback System**: Displays placeholder geometry if model fails to load

## Getting Started

### Prerequisites

- A modern web browser with WebGL support
- A local HTTP server (recommended for GLB model loading)

### Installation

1. Clone or download this repository
2. Place your GLB models in the `models/` directory
3. Serve the files using a local HTTP server

### Running the Application

#### Option 1: Using Python
```bash
python -m http.server 8000
```

#### Option 2: Using Node.js
```bash
npx serve .
```

#### Option 3: Using any other HTTP server
Serve the root directory containing `index.html`

Then open your browser to `http://localhost:8000` (or the appropriate port).

## Project Structure

```
├── index.html          # Main HTML file
├── style.css           # CSS styling
├── script.js           # JavaScript application logic
├── models/             # 3D model assets
│   └── test.glb        # Example GLB model
├── README.md           # This file
└── LICENSE             # MIT License
```

## Controls

- **Mouse**: Orbit around the scene
- **Additional Light Toggle**: Turn directional light on/off
- **Light Intensity Slider**: Adjust light intensity (0.0 - 2.0)
- **Background Color Picker**: Change scene background color

## Model Requirements

- **Format**: GLB (binary glTF)
- **Location**: Place models in the `models/` directory
- **Naming**: The application looks for `test.glb` by default
- **Materials**: Models with emissive materials will be automatically enhanced

## Technology Stack

- **Three.js r128**: 3D graphics library
- **WebGL**: Hardware-accelerated rendering
- **HTML5**: Structure and controls
- **CSS3**: Styling and layout
- **Vanilla JavaScript**: Application logic

## Browser Support

This application requires a modern browser with:
- WebGL support
- ES6+ JavaScript features
- HTML5 input types (range, color)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Known Issues

- GLB models must be served via HTTP/HTTPS (not file://) for proper loading
- Large models may take time to load depending on file size and connection speed