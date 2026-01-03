export class CanvasManager {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = this.canvas.getContext("2d")!;
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

type Selector = typeof HTMLElement.prototype.querySelector;
export class DOM {
  /**
   * Adding elements
   */
  static createDomElement(html: string) {
    const dom = new DOMParser().parseFromString(html, "text/html");
    return dom.body.firstElementChild as HTMLElement;
  }
  static addStyleTag(css: string) {
    const styles = document.createElement("style");
    styles.textContent = css;
    document.head.appendChild(styles);
    return styles;
  }
  static addElementsToContainer(
    container: HTMLElement,
    elements: HTMLElement[],
  ) {
    const fragment = document.createDocumentFragment();
    elements.forEach((el) => fragment.appendChild(el));
    container.appendChild(fragment);
  }

  /**
   * querying elements
   */
  static $ = (selector: string): HTMLElement | null =>
    document.querySelector(selector);
  static $$ = (selector: string): NodeListOf<HTMLElement> =>
    document.querySelectorAll(selector);

  static $throw = (selector: string): NonNullable<HTMLElement> => {
    const el = DOM.$(selector);
    if (!el) {
      throw new Error(`Element not found: ${selector}`);
    }
    return el;
  };

  static createQuerySelectorWithThrow(
    containerElement: HTMLElement | ShadowRoot,
  ) {
    const select = containerElement.querySelector.bind(
      containerElement,
    ) as Selector;
    return ((_class: keyof HTMLElementTagNameMap) => {
      const query = select(_class);
      if (!query) {
        throw new Error(`Element with selector ${_class} not found`);
      }
      return query;
    }) as Selector;
  }
}

export class Vector {
  constructor(elements: number[]) {
    this.elements = elements;
  }
  elements: number[];

  static abs(vector: Vector) {
    return new Vector(vector.elements.map((element) => Math.abs(element)));
  }

  static add(...vectors: Vector[]) {
    return vectors.reduce((acc, vector) => {
      return acc.add(vector);
    });
  }

  static subtract(...vectors: Vector[]) {
    return vectors.reduce((acc, vector) => {
      return acc.subtract(vector);
    });
  }

  [Symbol.iterator]() {
    return this.elements[Symbol.iterator]();
  }

  magnitude() {
    return Math.sqrt(
      this.elements.reduce((sum, element) => sum + element * element, 0),
    );
  }

  norm(type: "L1" | "L2" = "L2") {
    if (type === "L1") {
      return this.elements.reduce((sum, element) => sum + Math.abs(element), 0);
    } else {
      return Math.sqrt(
        this.elements.reduce((sum, element) => sum + element * element, 0),
      );
    }
  }

  add(other: Vector) {
    if (this.elements.length !== other.elements.length) {
      throw new Error("Vectors must have the same length");
    }
    return new Vector(
      this.elements.map((element, index) => element + other.elements[index]!),
    );
  }

  get(index: number) {
    return this.elements[index];
  }

  set(index: number, value: number) {
    this.elements[index] = value;
  }

  subtract(other: Vector) {
    if (this.elements.length !== other.elements.length) {
      throw new Error("Vectors must have the same length");
    }
    return new Vector(
      this.elements.map((element, index) => element - other.elements[index]!),
    );
  }

  multiply(other: Vector) {
    if (this.elements.length !== other.elements.length) {
      throw new Error("Vectors must have the same length");
    }
    return new Vector(
      this.elements.map((element, index) => element * other.elements[index]!),
    );
  }

  scalarMultiply(other: number) {
    return new Vector(this.elements.map((element) => element * other));
  }

  scalarAdd(other: number) {
    return new Vector(this.elements.map((element) => element + other));
  }

  divide(other: Vector) {
    if (this.elements.length !== other.elements.length) {
      throw new Error("Vectors must have the same length");
    }
    return new Vector(
      this.elements.map((element, index) => element / other.elements[index]!),
    );
  }
}

export class MatrixFromElements {
  constructor(public elements: number[][]) {}

  get(row: number, col: number) {
    if (row < 0 || row >= this.elements.length) {
      throw new Error("Row out of bounds");
    }
    if (col < 0 || col >= this.elements[row]!.length) {
      throw new Error("Column out of bounds");
    }
    return this.elements[row]![col]!;
  }

  flatten() {
    return this.elements.flat();
  }
}

export class MatrixFromVectors extends MatrixFromElements {
  constructor(public vectors: Vector[]) {
    super(vectors.map((vector) => vector.elements));
  }
}

export class RGB {
  private vector: Vector;
  constructor(r: number, g: number, b: number) {
    this.vector = new Vector([r, g, b]);
    this.vector = this.normalize();
  }

  normalize() {
    // rgb is in 255, scale down to 0-1
    if (this.vector.norm("L1") > 3) {
      return this.vector.scalarMultiply(1 / 255);
    }
    return this.vector;
  }

  get r() {
    return this.vector.get(0);
  }

  get g() {
    return this.vector.get(1);
  }

  get b() {
    return this.vector.get(2);
  }
}

export class RGBA {
  private vector: Vector;
  constructor(r: number, g: number, b: number, a: number) {
    this.vector = new Vector([r, g, b, a]);
    this.vector = this.normalize();
  }

  normalize() {
    // rgb is in 255, scale down to 0-1
    if (this.vector.norm("L1") > 4) {
      return this.vector.scalarMultiply(1 / 255);
    }
    return this.vector;
  }

  get r() {
    return this.vector.get(0);
  }

  get g() {
    return this.vector.get(1);
  }

  get b() {
    return this.vector.get(2);
  }

  get a() {
    return this.vector.get(3);
  }
}
