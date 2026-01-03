import.meta.hot.accept();

import { DOM, MatrixFromVectors, Vector } from "./utils";

const canvas = DOM.$throw("#canvas") as HTMLCanvasElement;

class WebGLManager {
  public gl: WebGLRenderingContext;
  constructor(public canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl")!;
    this.gl = gl;
    this.initGLSettings();
  }

  onResize() {
    const pixelRatio = window.devicePixelRatio || 1;
    // set raster image resolution to the HTML width and height of canvas, times pixel ratio to account for high-DPI screens
    this.canvas.width = Math.floor(this.canvas.clientWidth * pixelRatio);
    this.canvas.height = Math.floor(this.canvas.clientHeight * pixelRatio);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private initGLSettings() {
    const gl = this.gl;
    this.onResize();

    // Set clear color to white, transparent
    gl.clearColor(1.0, 1.0, 1.0, 0.0);
    gl.lineWidth(1.0);
  }

  loadBuffer(data: number[]) {
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(data),
      this.gl.STATIC_DRAW,
    );
    return buffer;
  }

  compileVertexShader(source: string) {
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    if (!vertexShader) {
      throw new Error("Failed to create vertex shader");
    }
    this.gl.shaderSource(vertexShader, source);
    this.gl.compileShader(vertexShader);
    this.debugShader(vertexShader);
    return vertexShader;
  }

  compileFragmentShader(source: string) {
    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    if (!fragmentShader) {
      throw new Error("Failed to create fragment shader");
    }
    this.gl.shaderSource(fragmentShader, source);
    this.gl.compileShader(fragmentShader);
    this.debugShader(fragmentShader);
    return fragmentShader;
  }

  private debugShader(shader: WebGLShader) {
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const infoLog = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error("Failed to compile shader: " + infoLog);
    }
  }

  createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    const program = this.gl.createProgram();
    if (!program) {
      throw new Error("Failed to create program");
    }
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    this.debugProgram(program);
    return program;
  }

  private debugProgram(program: WebGLProgram) {
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const infoLog = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error("Failed to link program: " + infoLog);
    }
  }

  clearScreen() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  draw(numVertices: number) {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, numVertices);
  }
}

class ProgramManager<
  T extends {
    attribute: string;
    uniform: string;
  } = {
    attribute: string;
    uniform: string;
  },
> {
  constructor(public gl: WebGLRenderingContext, public program: WebGLProgram) {
  }

  private getUniformLocation(variableName: T["uniform"]) {
    const location = this.gl.getUniformLocation(this.program, variableName);
    if (location === null) {
      throw new Error(`Uniform ${variableName} not found`);
    }
    return location;
  }

  private getAttributeLocation(variableName: T["attribute"]) {
    const location = this.gl.getAttribLocation(this.program, variableName);
    if (location === -1) {
      throw new Error(`Attribute ${variableName} not found`);
    }
    return location;
  }

  addUniform4x4Matrix(variableName: T["uniform"], matrix: MatrixFromVectors) {
    const location = this.getUniformLocation(variableName);
    this.gl.uniformMatrix4fv(location, false, matrix.flatten());
  }

  addUniformVector3(variableName: T["uniform"], vector: Vector) {
    const location = this.getUniformLocation(variableName);
    this.gl.uniform3fv(location, vector.elements);
  }

  use() {
    this.gl.useProgram(this.program);
  }

  addAttributeBuffer(
    variableName: T["attribute"],
    buffer: WebGLBuffer,
    size: number,
  ) {
    // 1. get the memory location position of the attribute in the shader
    const location = this.getAttributeLocation(variableName);
    // 2. bind the buffer, make it the active buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    // 3. tell the shader the dimensions of the data and how to read the data (starting from start of buffer)
    this.gl.vertexAttribPointer(location, size, this.gl.FLOAT, false, 0, 0);
    // 4. enable the attribute
    this.gl.enableVertexAttribArray(location);
  }
}

const glManager = new WebGLManager(canvas);
const gl = glManager.gl;

window.addEventListener("resize", () => {
  glManager.onResize();
});

function main() {
  // step 1. load buffers into GPU memory

  const positions = new MatrixFromVectors([
    new Vector([-0.8, 0.4, 0]),
    new Vector([0.8, 0.4, 0]),
    new Vector([0.8, -0.4, 0]),
    new Vector([-0.8, 0.4, 0]),
    new Vector([0.8, -0.4, 0]),
    new Vector([-0.8, -0.4, 0]),
  ]).flatten();

  const colors = new MatrixFromVectors([
    new Vector([1, 0, 0, 1]),
    new Vector([0, 1, 0, 1]),
    new Vector([0, 0, 1, 1]),
    new Vector([1, 0, 0, 1]),
    new Vector([0, 0, 1, 1]),
    new Vector([1, 0, 1, 1]),
  ]).flatten();

  // var positions = [
  //   -0.8,
  //   0.4,
  //   0,
  //   0.8,
  //   0.4,
  //   0,
  //   0.8,
  //   -0.4,
  //   0,
  //   -0.8,
  //   0.4,
  //   0,
  //   0.8,
  //   -0.4,
  //   0,
  //   -0.8,
  //   -0.4,
  //   0,
  // ];

  // var colors = [
  //   1,
  //   0,
  //   0,
  //   1,
  //   0,
  //   1,
  //   0,
  //   1,
  //   0,
  //   0,
  //   1,
  //   1,
  //   1,
  //   0,
  //   0,
  //   1,
  //   0,
  //   0,
  //   1,
  //   1,
  //   1,
  //   0,
  //   1,
  //   1,
  // ];

  const positionBuffer = glManager.loadBuffer(positions);
  const colorBuffer = glManager.loadBuffer(colors);

  // step 2. create program
  const vertexShaderSource = `
    attribute vec3 a_position;
    attribute vec4 a_color;

    varying vec4 v_color;

    uniform mat4 identity_matrix;

    void main() {
        gl_Position = identity_matrix * vec4(a_position,1);
        v_color = a_color;
    }
    `;

  const fragmentShaderSource = `
    precision mediump float;
    varying vec4 v_color;
    void main() {
        gl_FragColor = v_color;
    }
    `;

  const vertexShader = glManager.compileVertexShader(vertexShaderSource);
  const fragmentShader = glManager.compileFragmentShader(fragmentShaderSource);
  const program = glManager.createProgram(vertexShader, fragmentShader);

  const programManager = new ProgramManager<
    { attribute: "a_position" | "a_color"; uniform: "identity_matrix" }
  >(gl, program);

  // step 3. use the program, you must use the program before you can add uniforms and attributes
  programManager.use();

  // step 4. load uniform variables

  const identity = new MatrixFromVectors([
    new Vector([1, 0, 0, 0]),
    new Vector([0, 1, 0, 0]),
    new Vector([0, 0, 1, 0]),
    new Vector([0, 0, 0, 1]),
  ]);
  programManager.addUniform4x4Matrix("identity_matrix", identity);

  // step 5. load attribute variables

  programManager.addAttributeBuffer("a_position", positionBuffer, 3);
  programManager.addAttributeBuffer("a_color", colorBuffer, 4);

  // step 6. draw
  glManager.clearScreen();
  glManager.draw(positions.length / 3);
}

function redTriangle() {
  const points = new MatrixFromVectors([
    new Vector([0.0, 0.5]),
    new Vector([-0.5, -0.5]),
    new Vector([0.5, -0.5]),
  ]).flatten();

  const buffer = glManager.loadBuffer(points);

  // showcases how to refer to individual vertex positions for calculations

  const vertexShader = glManager.compileVertexShader(`
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position.x, -a_position.y, 0, 1);
    }
    `);

  const fragmentShader = glManager.compileFragmentShader(`
    precision mediump float;
    void main() {
        gl_FragColor = vec4(1, 0, 0, 1);
    }
    `);

  const program = glManager.createProgram(vertexShader, fragmentShader);

  const programManager = new ProgramManager<
    { attribute: "a_position"; uniform: string }
  >(gl, program);

  programManager.use();

  programManager.addAttributeBuffer("a_position", buffer, 2);

  glManager.clearScreen();
  glManager.draw(points.length / 2);
}

// main();
redTriangle();
