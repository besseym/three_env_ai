// Maze Generation Module using Recursive Backtracking Algorithm

export class MazeGenerator {
  constructor(width, height) {
    // Ensure odd dimensions for proper maze walls
    this.width = width % 2 === 0 ? width + 1 : width;
    this.height = height % 2 === 0 ? height + 1 : height;
    this.grid = [];
    this.start = { x: 1, z: 1 };
    this.end = { x: this.width - 2, z: this.height - 2 };
  }

  generate() {
    // Initialize grid with all walls
    this.grid = [];
    for (let z = 0; z < this.height; z++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push(1); // 1 = wall
      }
      this.grid.push(row);
    }

    // Carve passages using recursive backtracking
    this.carvePassages(1, 1);

    // Ensure start and end are open
    this.grid[this.start.z][this.start.x] = 0;
    this.grid[this.end.z][this.end.x] = 0;

    // Mark the end cell as exit (value 2)
    this.grid[this.end.z][this.end.x] = 2;

    return this.grid;
  }

  carvePassages(x, z) {
    // Mark current cell as passage
    this.grid[z][x] = 0;

    // Get shuffled directions
    const directions = this.shuffleArray([
      { dx: 0, dz: -2 }, // North
      { dx: 2, dz: 0 },  // East
      { dx: 0, dz: 2 },  // South
      { dx: -2, dz: 0 }  // West
    ]);

    for (const dir of directions) {
      const newX = x + dir.dx;
      const newZ = z + dir.dz;

      // Check if the new position is within bounds and is a wall
      if (
        newX > 0 && newX < this.width - 1 &&
        newZ > 0 && newZ < this.height - 1 &&
        this.grid[newZ][newX] === 1
      ) {
        // Carve through the wall between current and new cell
        this.grid[z + dir.dz / 2][x + dir.dx / 2] = 0;
        // Recursively carve from new cell
        this.carvePassages(newX, newZ);
      }
    }
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getStart() {
    return this.start;
  }

  getEnd() {
    return this.end;
  }

  isWall(x, z) {
    if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
      return true;
    }
    return this.grid[z][x] === 1;
  }

  isExit(x, z) {
    if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
      return false;
    }
    return this.grid[z][x] === 2;
  }

  getWidth() {
    return this.width;
  }

  getHeight() {
    return this.height;
  }
}