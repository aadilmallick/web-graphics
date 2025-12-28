import.meta.hot.accept();

class CanvasManager {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.context = this.canvas.getContext("2d", {
            willReadFrequently: true,
        })!;
    }

    resize(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    // private onResize() {
    //     this.canvas.width = window.innerWidth;
    //     this.canvas.height = window.innerHeight;
    // }

    // setResize() {
    //     window.addEventListener("resize", () => {
    //         this.onResize();
    //     });
    // }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

class ImageDataManager {
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    constructor() {
        const canvas = document.createElement("canvas");
        this.ctx = canvas.getContext("2d", {
            willReadFrequently: true,
        })!;
        this.canvas = canvas;
    }
    load(src: string) {
        const image = new Image();
        image.src = src;
        const { resolve, promise } = Promise.withResolvers<ImageData>();
        image.onload = () => {
            this.canvas.width = image.naturalWidth;
            this.canvas.height = image.naturalHeight;
            this.ctx.clearRect(
                0,
                0,
                this.ctx.canvas.width,
                this.ctx.canvas.height,
            );
            this.ctx.drawImage(image, 0, 0);
            const imageData = this.ctx.getImageData(
                0,
                0,
                image.naturalWidth,
                image.naturalHeight,
            );
            this.ctx.clearRect(
                0,
                0,
                this.ctx.canvas.width,
                this.ctx.canvas.height,
            );
            resolve(imageData);
        };
        return promise;
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

const cm = new CanvasManager(DOM.$throw("canvas") as HTMLCanvasElement);
cm.resize(2000, 2000);

async function computeImageDatas() {
    const itemsContainer = document.getElementById(
        "sidebarItems",
    )!;
    const images = Array.from(itemsContainer.querySelectorAll("img"));
    const imageDataManager = new ImageDataManager();
    const imageDatas = await Promise.all(images.map((img) => {
        return imageDataManager.load(img.src);
    })) as ImageData[];
    return imageDatas;
}

class Vector {
    constructor(elements: number[]) {
        this.elements = elements;
    }
    elements: number[];

    static abs(vector: Vector) {
        return new Vector(
            vector.elements.map((element) => Math.abs(element)),
        );
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

    add(other: Vector) {
        if (this.elements.length !== other.elements.length) {
            throw new Error("Vectors must have the same length");
        }
        return new Vector(
            this.elements.map((element, index) =>
                element + other.elements[index]!
            ),
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
            this.elements.map((element, index) =>
                element - other.elements[index]!
            ),
        );
    }

    multiply(other: Vector) {
        if (this.elements.length !== other.elements.length) {
            throw new Error("Vectors must have the same length");
        }
        return new Vector(
            this.elements.map((element, index) =>
                element * other.elements[index]!
            ),
        );
    }

    scalarMultiply(other: number) {
        return new Vector(
            this.elements.map((element) => element * other),
        );
    }

    scalarAdd(other: number) {
        return new Vector(
            this.elements.map((element) => element + other),
        );
    }

    divide(other: Vector) {
        if (this.elements.length !== other.elements.length) {
            throw new Error("Vectors must have the same length");
        }
        return new Vector(
            this.elements.map((element, index) =>
                element / other.elements[index]!
            ),
        );
    }
}

function additiveBlend(foreground: ImageData, background: ImageData) {
    const result = new ImageData(
        background.width,
        background.height,
    );
    for (let i = 0; i < background.data.length; i += 4) {
        // check if in bounds for foreground
        if (i + 4 > foreground.data!.length) {
            break;
        }
        const foregroundPixel = new Vector([
            ...foreground.data!.slice(i, i + 4),
        ]);
        const backgroundPixel = new Vector([
            ...background.data!.slice(i, i + 4),
        ]);
        const resultPixel = foregroundPixel.add(backgroundPixel);
        result.data.set(resultPixel.elements, i);
    }
    return result;
}

function multiplyBlend(foreground: ImageData, background: ImageData) {
    const result = new ImageData(
        background.width,
        background.height,
    );
    for (let i = 0; i < background.data.length; i += 4) {
        // check if in bounds for foreground
        if (i + 4 > foreground.data!.length) {
            break;
        }
        const foregroundPixel = new Vector([
            ...foreground.data!.slice(i, i + 3),
        ]);
        const alpha_f = foreground.data![i + 3]! / 255; // normalize alpha to 0-1
        const backgroundPixel = new Vector([
            ...background.data!.slice(i, i + 3),
        ]);
        const alpha_b = background.data![i + 3]! / 255; // normalize alpha to 0-1

        // Multiply blend: (foreground / 255) * (background / 255) * 255
        // Simplified: (foreground * background) / 255
        const multiply = foregroundPixel.multiply(backgroundPixel)
            .scalarMultiply(1 / 255);

        // Alpha composite: result = multiply * alpha_f + background * (1 - alpha_f)
        const blended = multiply.scalarMultiply(alpha_f)
            .add(backgroundPixel.scalarMultiply(1 - alpha_f));

        // Output alpha (standard alpha compositing)
        const alpha_out = alpha_f + alpha_b * (1 - alpha_f);

        result.data.set([...blended.elements, alpha_out * 255], i);
    }
    return result;
}

function screenBlend(foreground: ImageData, background: ImageData) {
    const result = new ImageData(
        background.width,
        background.height,
    );
    for (let i = 0; i < background.data.length; i += 4) {
        // check if in bounds for foreground
        if (i + 4 > foreground.data!.length) {
            break;
        }
        const foregroundPixel = new Vector([
            ...foreground.data!.slice(i, i + 3),
        ]).scalarMultiply(1 / 255);
        const alpha_f = foreground.data![i + 3]! / 255; // normalize alpha to 0-1
        const backgroundPixel = new Vector([
            ...background.data!.slice(i, i + 3),
        ]).scalarMultiply(1 / 255);
        const alpha_b = background.data![i + 3]! / 255; // normalize alpha to 0-1

        // Screen blend: 1 - (1 - foreground) * (1 - background)
        const foregroundInversed = Vector.subtract(
            new Vector([1, 1, 1]),
            foregroundPixel,
        );
        const backgroundInversed = Vector.subtract(
            new Vector([1, 1, 1]),
            backgroundPixel,
        );

        const screen = Vector.subtract(
            new Vector([1, 1, 1]),
            foregroundInversed.multiply(backgroundInversed),
        );

        // Alpha composite: result = screen * alpha_f + background * (1 - alpha_f)
        const blended = screen.scalarMultiply(alpha_f)
            .add(backgroundPixel.scalarMultiply(1 - alpha_f));

        // Output alpha (standard alpha compositing)
        const alpha_out = alpha_f + alpha_b * (1 - alpha_f);

        // Scale back to 0-255 range
        result.data.set([
            ...blended.scalarMultiply(255),
            alpha_out * 255,
        ], i);
    }
    return result;
}

function differenceBlend(foreground: ImageData, background: ImageData) {
    const result = new ImageData(
        background.width,
        background.height,
    );
    for (let i = 0; i < background.data.length; i += 4) {
        // check if in bounds for foreground
        if (i + 4 > foreground.data!.length) {
            break;
        }
        const foregroundPixel = new Vector([
            ...foreground.data!.slice(i, i + 3),
        ]);
        const alpha_f = foreground.data![i + 3]! / 255; // normalize alpha to 0-1
        const backgroundPixel = new Vector([
            ...background.data!.slice(i, i + 3),
        ]);
        const alpha_b = background.data![i + 3]! / 255; // normalize alpha to 0-1

        // Difference blend: |foreground - background|
        const diff = Vector.abs(
            foregroundPixel.subtract(backgroundPixel),
        );

        // Alpha composite: result = foreground * alpha_f + background * (1 - alpha_f)
        const blended = diff.scalarMultiply(alpha_f)
            .add(backgroundPixel.scalarMultiply(1 - alpha_f));

        // Output alpha (standard alpha compositing)
        const alpha_out = alpha_f + alpha_b * (1 - alpha_f);

        result.data.set([...blended.elements, alpha_out * 255], i);
    }
    return result;
}

function alphaBlend(foreground: ImageData, background: ImageData) {
    const result = new ImageData(
        background.width,
        background.height,
    );
    for (let i = 0; i < background.data.length; i += 4) {
        // check if in bounds for foreground
        if (i + 4 > foreground.data!.length) {
            break;
        }
        const rgb = [i, i + 1, i + 2];
        const alphaIdx = i + 3;
        const alpha_f = foreground.data![alphaIdx]!;
        const alpha_b = background.data![alphaIdx]!;
        const alpha = alpha_f + alpha_b * (1 - alpha_f);
        if (alpha === 0) {
            result.data.set([...background.data!.slice(i, i + 4)], i);
            continue;
        }
        const newRgb = [];
        for (const idx of rgb) {
            const foregroundPixel = foreground.data![idx]!;
            const backgroundPixel = background.data![idx]!;
            const newColor = (alpha_f * foregroundPixel +
                (1 - alpha_f) * alpha_b * backgroundPixel) / alpha;
            newRgb.push(newColor);
        }
        result.data.set([...newRgb, alpha], i);
    }
    return result;
}

// WHEN BLENDING LAYERS, blend from top to bottom, treat like queue
const LAYER_BLENDING = {
    layerBlend(
        imageDatas: ImageData[],
        blend: (foreground: ImageData, background: ImageData) => ImageData,
    ) {
        if (imageDatas.length < 2) {
            alert("Not enough layers");
            return;
        }
        let result = blend(imageDatas.shift()!, imageDatas.shift()!);
        while (imageDatas.length > 0) {
            result = blend(imageDatas.shift()!, result);
        }
        return result;
    },
    additiveBlendLayers(imageDatas: ImageData[]) {
        return this.layerBlend(imageDatas, additiveBlend);
    },
    differenceBlendLayers(imageDatas: ImageData[]) {
        return this.layerBlend(imageDatas, differenceBlend);
    },
    alphaBlendLayers(imageDatas: ImageData[]) {
        return this.layerBlend(imageDatas, alphaBlend);
    },
    multiplyBlendLayers(imageDatas: ImageData[]) {
        return this.layerBlend(imageDatas, multiplyBlend);
    },
    screenBlendLayers(imageDatas: ImageData[]) {
        return this.layerBlend(imageDatas, screenBlend);
    },
};

// const blendButton = DOM.$throw("#blendButton");
// blendButton.addEventListener("click", () => {
//     main();
// });

const blendForm = DOM.$throw("#blendForm") as HTMLFormElement;
blendForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(blendForm);
    const blendMode = formData.get("blendMode") as string;
    const imageDatas = await computeImageDatas();
    cm.clear();

    console.log(imageDatas);

    console.log(blendMode);
    switch (blendMode) {
        case "additive":
            const additiveResult = LAYER_BLENDING.additiveBlendLayers(
                imageDatas,
            );
            cm.context.putImageData(additiveResult!, 0, 0);
            break;
        case "alpha":
            const alphaResult = LAYER_BLENDING.alphaBlendLayers(imageDatas);
            cm.context.putImageData(alphaResult!, 0, 0);
            break;
        case "difference":
            const differenceResult = LAYER_BLENDING.differenceBlendLayers(
                imageDatas,
            );
            cm.context.putImageData(differenceResult!, 0, 0);
            break;
        case "multiply":
            const multiplyResult = LAYER_BLENDING.multiplyBlendLayers(
                imageDatas,
            );
            cm.context.putImageData(multiplyResult!, 0, 0);
            break;
        case "screen":
            const screenResult = LAYER_BLENDING.screenBlendLayers(imageDatas);
            cm.context.putImageData(screenResult!, 0, 0);
            break;
        default:
            alert("Invalid blend mode");
            break;
    }
});
