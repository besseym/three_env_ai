// First-Person Controls Module
import * as THREE from 'three';

export class FirstPersonControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;

    // Movement settings
    this.moveSpeed = 5.0;

    // Mouse look settings
    this.mouseSensitivity = 0.002;
    this.pitch = 0;
    this.yaw = 0;
    this.minPitch = -Math.PI / 2 + 0.1;
    this.maxPitch = Math.PI / 2 - 0.1;

    // Pointer lock state
    this.isLocked = false;

    // Velocity for smooth movement
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    // Player collision radius
    this.playerRadius = 0.3;

    // Bind event handlers
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);
    this.onPointerLockError = this.onPointerLockError.bind(this);

    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockError);
  }

  lock() {
    this.domElement.requestPointerLock();
  }

  unlock() {
    document.exitPointerLock();
  }

  onPointerLockChange() {
    this.isLocked = document.pointerLockElement === this.domElement;
  }

  onPointerLockError() {
    console.error('Pointer lock error');
  }

  onMouseMove(event) {
    if (!this.isLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // Update yaw (horizontal rotation)
    this.yaw -= movementX * this.mouseSensitivity;

    // Update pitch (vertical rotation) with clamping
    this.pitch -= movementY * this.mouseSensitivity;
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));

    // Apply rotation to camera
    this.updateCameraRotation();
  }

  updateCameraRotation() {
    // Create quaternion from euler angles
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  onKeyDown(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = true;
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = false;
        break;
    }
  }

  update(delta, collisionCallback) {
    if (!this.isLocked) return;

    // Calculate movement direction
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    // Apply deceleration
    this.velocity.x *= 0.85;
    this.velocity.z *= 0.85;

    // Calculate movement based on camera direction
    if (this.moveForward || this.moveBackward) {
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(this.camera.quaternion);
      forward.y = 0;
      forward.normalize();
      this.velocity.add(forward.multiplyScalar(this.direction.z * this.moveSpeed * delta));
    }

    if (this.moveLeft || this.moveRight) {
      const right = new THREE.Vector3(1, 0, 0);
      right.applyQuaternion(this.camera.quaternion);
      right.y = 0;
      right.normalize();
      this.velocity.add(right.multiplyScalar(this.direction.x * this.moveSpeed * delta));
    }

    // Apply movement with collision detection
    const newPosition = this.camera.position.clone().add(this.velocity);

    if (collisionCallback) {
      // Check X movement
      const testPosX = this.camera.position.clone();
      testPosX.x = newPosition.x;
      if (!collisionCallback(testPosX, this.playerRadius)) {
        this.camera.position.x = newPosition.x;
      } else {
        this.velocity.x = 0;
      }

      // Check Z movement
      const testPosZ = this.camera.position.clone();
      testPosZ.z = newPosition.z;
      if (!collisionCallback(testPosZ, this.playerRadius)) {
        this.camera.position.z = newPosition.z;
      } else {
        this.velocity.z = 0;
      }
    } else {
      this.camera.position.copy(newPosition);
    }
  }

  dispose() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('pointerlockerror', this.onPointerLockError);
  }
}