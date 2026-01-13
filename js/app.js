// Dungeon Maze - Main Application
import * as THREE from 'three';
import { MazeGenerator } from './maze.js';
import { FirstPersonControls } from './controls.js';

class DungeonMaze {
  constructor() {
    // Game settings
    this.mazeWidth = 21;  // Medium difficulty maze size
    this.mazeHeight = 21;
    this.cellSize = 2;
    this.wallHeight = 3;
    this.playerHeight = 1.6;

    // Game state
    this.gameState = 'instructions'; // 'instructions', 'playing', 'completed'
    this.startTime = null;
    this.endTime = null;

    // Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = null;

    // Maze components
    this.maze = null;
    this.mazeGenerator = null;
    this.exitLight = null;
    this.exitMesh = null;
    this.torchLights = [];

    // DOM elements
    this.container = document.getElementById('game-container');
    this.instructionsOverlay = document.getElementById('instructions-overlay');
    this.congratulationsOverlay = document.getElementById('congratulations-overlay');
    this.startButton = document.getElementById('start-button');
    this.restartButton = document.getElementById('restart-button');
    this.completionStats = document.getElementById('completion-stats');

    // Initialize
    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupLighting();
    this.generateMaze();
    this.setupControls();
    this.setupEventListeners();
    this.animate();
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);
    this.scene.fog = new THREE.Fog(0x0a0a0f, 1, 15);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
  }

  setupLighting() {
    // Dim ambient light for dungeon atmosphere
    const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.3);
    this.scene.add(ambientLight);

    // Player's torch light (follows camera)
    const playerLight = new THREE.PointLight(0xff9944, 1, 8);
    playerLight.castShadow = true;
    playerLight.shadow.mapSize.width = 512;
    playerLight.shadow.mapSize.height = 512;
    this.camera.add(playerLight);
    playerLight.position.set(0, 0.3, 0);
    this.scene.add(this.camera);
  }

  generateMaze() {
    // Clear existing maze meshes
    this.clearMaze();

    // Generate maze layout
    this.mazeGenerator = new MazeGenerator(this.mazeWidth, this.mazeHeight);
    this.maze = this.mazeGenerator.generate();

    // Create materials
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a,
      roughness: 0.9,
      metalness: 0.1,
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a35,
      roughness: 0.95,
      metalness: 0.05,
    });

    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a25,
      roughness: 1,
      metalness: 0,
    });

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(
      this.mazeWidth * this.cellSize,
      this.mazeHeight * this.cellSize
    );
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(
      (this.mazeWidth * this.cellSize) / 2 - this.cellSize / 2,
      0,
      (this.mazeHeight * this.cellSize) / 2 - this.cellSize / 2
    );
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Create ceiling
    const ceiling = new THREE.Mesh(floorGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(
      (this.mazeWidth * this.cellSize) / 2 - this.cellSize / 2,
      this.wallHeight,
      (this.mazeHeight * this.cellSize) / 2 - this.cellSize / 2
    );
    this.scene.add(ceiling);

    // Create walls using instanced mesh for performance
    const wallGeometry = new THREE.BoxGeometry(
      this.cellSize,
      this.wallHeight,
      this.cellSize
    );

    let wallCount = 0;
    for (let z = 0; z < this.mazeHeight; z++) {
      for (let x = 0; x < this.mazeWidth; x++) {
        if (this.maze[z][x] === 1) wallCount++;
      }
    }

    const wallMesh = new THREE.InstancedMesh(wallGeometry, wallMaterial, wallCount);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;

    const matrix = new THREE.Matrix4();
    let instanceIndex = 0;

    for (let z = 0; z < this.mazeHeight; z++) {
      for (let x = 0; x < this.mazeWidth; x++) {
        if (this.maze[z][x] === 1) {
          matrix.setPosition(
            x * this.cellSize,
            this.wallHeight / 2,
            z * this.cellSize
          );
          wallMesh.setMatrixAt(instanceIndex, matrix);
          instanceIndex++;
        }
      }
    }

    wallMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(wallMesh);

    // Add wall torches for atmosphere
    this.addTorches();

    // Create exit marker
    this.createExitMarker();

    // Set player starting position
    const start = this.mazeGenerator.getStart();
    this.camera.position.set(
      start.x * this.cellSize,
      this.playerHeight,
      start.z * this.cellSize
    );
  }

  addTorches() {
    // Clear existing torches
    this.torchLights.forEach(light => this.scene.remove(light));
    this.torchLights = [];

    // Add torches at intervals along passages
    const torchInterval = 6;

    for (let z = 1; z < this.mazeHeight - 1; z += torchInterval) {
      for (let x = 1; x < this.mazeWidth - 1; x += torchInterval) {
        if (this.maze[z][x] === 0) {
          // Check adjacent walls for torch placement
          const positions = [
            { dx: 1, dz: 0 },
            { dx: -1, dz: 0 },
            { dx: 0, dz: 1 },
            { dx: 0, dz: -1 }
          ];

          for (const pos of positions) {
            const checkX = x + pos.dx;
            const checkZ = z + pos.dz;
            if (
              checkX >= 0 && checkX < this.mazeWidth &&
              checkZ >= 0 && checkZ < this.mazeHeight &&
              this.maze[checkZ][checkX] === 1
            ) {
              // Add torch light
              const torchLight = new THREE.PointLight(0xff6622, 0.5, 6);
              torchLight.position.set(
                x * this.cellSize - pos.dx * 0.3,
                this.wallHeight * 0.7,
                z * this.cellSize - pos.dz * 0.3
              );
              this.scene.add(torchLight);
              this.torchLights.push(torchLight);

              // Add torch visual (small emissive box)
              const torchGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
              const torchMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a3520,
                emissive: 0xff4400,
                emissiveIntensity: 0.5,
              });
              const torch = new THREE.Mesh(torchGeometry, torchMaterial);
              torch.position.copy(torchLight.position);
              torch.position.y -= 0.2;
              this.scene.add(torch);
              break;
            }
          }
        }
      }
    }
  }

  createExitMarker() {
    const end = this.mazeGenerator.getEnd();

    // Glowing exit platform
    const exitGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
    const exitMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.8,
    });
    this.exitMesh = new THREE.Mesh(exitGeometry, exitMaterial);
    this.exitMesh.position.set(
      end.x * this.cellSize,
      0.05,
      end.z * this.cellSize
    );
    this.scene.add(this.exitMesh);

    // Exit light (green glow)
    this.exitLight = new THREE.PointLight(0x00ff88, 2, 8);
    this.exitLight.position.set(
      end.x * this.cellSize,
      1,
      end.z * this.cellSize
    );
    this.scene.add(this.exitLight);

    // Vertical beam effect
    const beamGeometry = new THREE.CylinderGeometry(0.1, 0.3, this.wallHeight, 8);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.3,
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set(
      end.x * this.cellSize,
      this.wallHeight / 2,
      end.z * this.cellSize
    );
    this.scene.add(beam);
  }

  clearMaze() {
    // Remove all objects except camera and lights
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      if (child !== this.camera) {
        this.scene.remove(child);
      } else {
        this.scene.remove(child);
        break;
      }
    }
    this.scene.add(this.camera);
  }

  setupControls() {
    this.controls = new FirstPersonControls(this.camera, document.body);
  }

  setupEventListeners() {
    // Window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Start button
    this.startButton.addEventListener('click', () => this.startGame());

    // Restart button
    this.restartButton.addEventListener('click', () => this.restartGame());

    // Pointer lock change
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.gameState === 'playing') {
        this.pauseGame();
      }
    });
  }

  startGame() {
    this.gameState = 'playing';
    this.startTime = Date.now();
    this.instructionsOverlay.classList.add('hidden');
    this.controls.lock();
  }

  pauseGame() {
    // Show instructions overlay when paused
    if (this.gameState === 'playing') {
      this.instructionsOverlay.classList.remove('hidden');
    }
  }

  restartGame() {
    this.congratulationsOverlay.classList.add('hidden');
    this.generateMaze();
    this.controls.yaw = 0;
    this.controls.pitch = 0;
    this.controls.updateCameraRotation();
    this.startGame();
  }

  completeGame() {
    this.gameState = 'completed';
    this.endTime = Date.now();
    this.controls.unlock();

    // Calculate completion time
    const totalTime = Math.floor((this.endTime - this.startTime) / 1000);
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;

    // Display stats
    this.completionStats.innerHTML = `
      <p>Time: <span>${minutes}:${seconds.toString().padStart(2, '0')}</span></p>
    `;

    this.congratulationsOverlay.classList.remove('hidden');
  }

  checkCollision(position, radius) {
    // Convert world position to grid coordinates
    const gridX = Math.round(position.x / this.cellSize);
    const gridZ = Math.round(position.z / this.cellSize);

    // Check surrounding cells
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkX = gridX + dx;
        const checkZ = gridZ + dz;

        if (this.mazeGenerator.isWall(checkX, checkZ)) {
          // Calculate wall bounds
          const wallMinX = checkX * this.cellSize - this.cellSize / 2;
          const wallMaxX = checkX * this.cellSize + this.cellSize / 2;
          const wallMinZ = checkZ * this.cellSize - this.cellSize / 2;
          const wallMaxZ = checkZ * this.cellSize + this.cellSize / 2;

          // Check collision with wall
          const closestX = Math.max(wallMinX, Math.min(position.x, wallMaxX));
          const closestZ = Math.max(wallMinZ, Math.min(position.z, wallMaxZ));

          const distanceX = position.x - closestX;
          const distanceZ = position.z - closestZ;
          const distance = Math.sqrt(distanceX * distanceX + distanceZ * distanceZ);

          if (distance < radius) {
            return true;
          }
        }
      }
    }

    return false;
  }

  checkExit() {
    const end = this.mazeGenerator.getEnd();
    const exitX = end.x * this.cellSize;
    const exitZ = end.z * this.cellSize;

    const dx = this.camera.position.x - exitX;
    const dz = this.camera.position.z - exitZ;
    const distance = Math.sqrt(dx * dx + dz * dz);

    return distance < 0.8;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    if (this.gameState === 'playing') {
      // Update controls with collision detection
      this.controls.update(delta, (pos, radius) => this.checkCollision(pos, radius));

      // Check if player reached exit
      if (this.checkExit()) {
        this.completeGame();
      }

      // Animate exit light
      if (this.exitLight) {
        this.exitLight.intensity = 1.5 + Math.sin(Date.now() * 0.003) * 0.5;
      }

      // Animate torch lights (flicker effect)
      this.torchLights.forEach((light, index) => {
        light.intensity = 0.4 + Math.sin(Date.now() * 0.01 + index) * 0.15;
      });
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DungeonMaze();
});
