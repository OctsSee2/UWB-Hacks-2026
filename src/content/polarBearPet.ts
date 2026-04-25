type Direction = 1 | -1;

type HealthState = 0 | 1 | 2 | 3 | 4;

type RenderMode = "extracted" | "sheet";
type BehaviorState = "walking" | "sitting" | "standing";

interface PolarBearPetConfig {
  spritePath: string;
  extractedFramesDir: string;
  storageArea: "local" | "sync";
  percentKey: string;
  useChromaKeyForSheetFallback: boolean;
}

interface ExtractedFrames {
  walk: string[][];
  sit: string[];
  stand: string[];
}

interface SheetAtlas {
  frameWidth: number;
  frameHeight: number;
  framesPerState: number;
  frameXs: number[];
  rowYWalk: number;
  rowYSit: number;
  rowYStand: number;
}

/**
 * PolarBearPet injects and animates a pixel-art polar bear along
 * the bottom edge of the viewport using DOM/CSS sprites (no canvas).
 */
export class PolarBearPet {
  private readonly DISPLAY_SIZE = 76.8;
  private readonly HEALTH_STATE_COUNT = 5;
  private readonly EXTRACTED_FRAMES_PER_STATE = 2;
  private readonly STAND_DURATION_MS = 1200;

  private readonly speedByState: Record<HealthState, number> = {
    0: 18,
    1: 24,
    2: 30,
    3: 27.2,
    4: 30.4,
  };

  private readonly frameDurationByState: Record<HealthState, number> = {
    0: 320,
    1: 280,
    2: 240,
    3: 220,
    4: 200,
  };

  private readonly config: PolarBearPetConfig;

  private petEl: HTMLDivElement | null = null;
  private x = 0;
  private direction: Direction = 1;
  private healthState: HealthState = 2;
  private frameIndex = 0;

  private behaviorState: BehaviorState = "walking";
  private standingUntilMs = 0;

  private rafId: number | null = null;
  private lastTick = 0;
  private frameElapsedMs = 0;
  private running = false;

  private renderMode: RenderMode = "sheet";
  private extractedFrames: ExtractedFrames | null = null;

  private sheetImageWidth = 0;
  private sheetImageHeight = 0;
  private sheetAtlas: SheetAtlas | null = null;

  private readonly resizeHandler = () => this.onResize();
  private readonly visibilityHandler = () => this.onVisibilityChange();
  private readonly clickHandler = () => this.onPetClick();
  private readonly storageHandler: (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: chrome.storage.AreaName
  ) => void;

  constructor(config?: Partial<PolarBearPetConfig>) {
    this.config = {
      spritePath: "assets/sprites/polar-bear-sheet.png",
      extractedFramesDir: "assets/sprites/frames",
      storageArea: "local",
      percentKey: "emissionSavingsPercent",
      useChromaKeyForSheetFallback: true,
      ...config,
    };

    this.storageHandler = (changes, areaName) => {
      if (areaName !== this.config.storageArea) return;
      if (!changes[this.config.percentKey]) return;

      const percentValue = Number(changes[this.config.percentKey].newValue ?? 0);
      this.setHealthFromPercent(percentValue);
    };
  }

  public async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.ensurePetElement();
    await this.initializeRenderSource();
    await this.pullAndApplyHealthFromStorage();

    window.addEventListener("resize", this.resizeHandler);
    document.addEventListener("visibilitychange", this.visibilityHandler);
    chrome.storage.onChanged.addListener(this.storageHandler);

    this.lastTick = performance.now();
    this.rafId = window.requestAnimationFrame(this.tick);
  }

  public destroy(): void {
    this.running = false;

    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    window.removeEventListener("resize", this.resizeHandler);
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    chrome.storage.onChanged.removeListener(this.storageHandler);

    if (this.petEl) {
      this.petEl.removeEventListener("click", this.clickHandler);
      this.petEl.remove();
    }
    this.petEl = null;
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    const deltaMs = Math.min(now - this.lastTick, 66);
    const deltaSec = deltaMs / 1000;
    this.lastTick = now;

    this.advanceBehavior(now);

    if (this.behaviorState === "walking") {
      this.updatePosition(deltaSec);
      this.updateAnimation(deltaMs);
    } else {
      this.frameIndex = 0;
    }

    this.render();

    this.rafId = window.requestAnimationFrame(this.tick);
  };

  private ensurePetElement(): void {
    const existing = document.getElementById("polar-bear-pet");
    if (existing instanceof HTMLDivElement) {
      this.petEl = existing;
      this.petEl.addEventListener("click", this.clickHandler);
      return;
    }

    const el = document.createElement("div");
    el.id = "polar-bear-pet";
    el.className = "polar-bear-pet";
    el.addEventListener("click", this.clickHandler);
    document.body.appendChild(el);
    this.petEl = el;

    this.x = Math.max(0, Math.min(this.x, this.getMaxX()));
  }

  private onPetClick(): void {
    if (this.behaviorState === "walking") {
      this.behaviorState = "sitting";
      return;
    }

    if (this.behaviorState === "sitting") {
      this.behaviorState = "standing";
      this.standingUntilMs = performance.now() + this.STAND_DURATION_MS;
    }
  }

  private advanceBehavior(now: number): void {
    if (this.behaviorState === "standing" && now >= this.standingUntilMs) {
      this.behaviorState = "walking";
    }
  }

  private async initializeRenderSource(): Promise<void> {
    if (!this.petEl) return;

    const extractedReady = await this.tryInitializeExtractedFrames();
    if (extractedReady) {
      this.renderMode = "extracted";
      this.petEl.style.filter = "none";
      this.petEl.classList.remove("polar-bear-pet--fallback");
      this.petEl.style.backgroundRepeat = "no-repeat";
      this.petEl.style.backgroundSize = "contain";
      this.petEl.style.backgroundPosition = "center bottom";
      return;
    }

    await this.initializeSheetFallback();
  }

  private async tryInitializeExtractedFrames(): Promise<boolean> {
    const walk: string[][] = [];
    const sit: string[] = [];
    const stand: string[] = [];

    for (let state = 0; state < this.HEALTH_STATE_COUNT; state += 1) {
      walk.push([
        chrome.runtime.getURL(`${this.config.extractedFramesDir}/walk-s${state}-f0.png`),
        chrome.runtime.getURL(`${this.config.extractedFramesDir}/walk-s${state}-f1.png`),
      ]);
      sit.push(chrome.runtime.getURL(`${this.config.extractedFramesDir}/sit-s${state}.png`));
      stand.push(chrome.runtime.getURL(`${this.config.extractedFramesDir}/stand-s${state}.png`));
    }

    try {
      await Promise.all([
        this.loadImage(walk[0][0]),
        this.loadImage(sit[0]),
        this.loadImage(stand[0]),
      ]);
      this.extractedFrames = { walk, sit, stand };
      return true;
    } catch {
      return false;
    }
  }

  private async initializeSheetFallback(): Promise<void> {
    if (!this.petEl) return;

    this.renderMode = "sheet";

    const spriteUrl = chrome.runtime.getURL(this.config.spritePath);
    this.petEl.style.backgroundImage = `url("${spriteUrl}")`;

    if (this.config.useChromaKeyForSheetFallback) {
      this.ensureChromaKeyFilter();
      this.petEl.style.filter = "url(#polar-bear-chroma-key)";
    }

    try {
      const img = await this.loadImage(spriteUrl);
      this.sheetImageWidth = img.naturalWidth;
      this.sheetImageHeight = img.naturalHeight;
      this.configureSheetAtlasFromImage();
      this.petEl.classList.remove("polar-bear-pet--fallback");
    } catch {
      this.petEl.classList.add("polar-bear-pet--fallback");
      console.warn(
        `[PolarBearPet] Missing extracted frames and fallback sheet at ${this.config.spritePath}`
      );
    }
  }

  private configureSheetAtlasFromImage(): void {
    if (!this.petEl || this.sheetImageWidth <= 0 || this.sheetImageHeight <= 0) return;

    const step = this.sheetImageWidth * 0.098;
    const firstX = this.sheetImageWidth * 0.011;
    const frameXs = Array.from({ length: 10 }, (_, i) => firstX + i * step);

    this.sheetAtlas = {
      frameWidth: this.sheetImageWidth * 0.089,
      frameHeight: this.sheetImageHeight * 0.165,
      framesPerState: 2,
      frameXs,
      rowYWalk: this.sheetImageHeight * 0.043,
      rowYSit: this.sheetImageHeight * 0.244,
      rowYStand: this.sheetImageHeight * 0.448,
    };

    const sx = this.DISPLAY_SIZE / this.sheetAtlas.frameWidth;
    const sy = this.DISPLAY_SIZE / this.sheetAtlas.frameHeight;
    this.petEl.style.backgroundSize = `${this.sheetImageWidth * sx}px ${this.sheetImageHeight * sy}px`;
    this.petEl.style.backgroundRepeat = "no-repeat";
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  private ensureChromaKeyFilter(): void {
    if (document.getElementById("polar-bear-chroma-key-defs")) return;

    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("id", "polar-bear-chroma-key-defs");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    svg.style.left = "-9999px";
    svg.style.pointerEvents = "none";

    const defs = document.createElementNS(svgNs, "defs");
    const filter = document.createElementNS(svgNs, "filter");
    filter.setAttribute("id", "polar-bear-chroma-key");
    filter.setAttribute("color-interpolation-filters", "sRGB");

    const colorMatrix = document.createElementNS(svgNs, "feColorMatrix");
    colorMatrix.setAttribute("in", "SourceGraphic");
    colorMatrix.setAttribute("type", "matrix");
    colorMatrix.setAttribute(
      "values",
      [
        "1 0 0 0 0",
        "0 1 0 0 0",
        "0 0 1 0 0",
        "1.2 -1.65 1.2 0 0.28",
      ].join(" ")
    );
    colorMatrix.setAttribute("result", "ckBase");

    const alphaTighten = document.createElementNS(svgNs, "feComponentTransfer");
    alphaTighten.setAttribute("in", "ckBase");
    alphaTighten.setAttribute("result", "ckAlpha");
    const funcA = document.createElementNS(svgNs, "feFuncA");
    funcA.setAttribute("type", "gamma");
    funcA.setAttribute("amplitude", "2.2");
    funcA.setAttribute("exponent", "1.2");
    funcA.setAttribute("offset", "-0.22");
    alphaTighten.appendChild(funcA);

    const composite = document.createElementNS(svgNs, "feComposite");
    composite.setAttribute("in", "SourceGraphic");
    composite.setAttribute("in2", "ckAlpha");
    composite.setAttribute("operator", "in");

    filter.appendChild(colorMatrix);
    filter.appendChild(alphaTighten);
    filter.appendChild(composite);
    defs.appendChild(filter);
    svg.appendChild(defs);
    document.documentElement.appendChild(svg);
  }

  private updatePosition(deltaSec: number): void {
    const speed = this.speedByState[this.healthState];
    this.x += this.direction * speed * deltaSec;

    const maxX = this.getMaxX();

    if (this.x >= maxX) {
      this.x = maxX;
      this.direction = -1;
    } else if (this.x <= 0) {
      this.x = 0;
      this.direction = 1;
    }
  }

  private updateAnimation(deltaMs: number): void {
    this.frameElapsedMs += deltaMs;

    const frameDuration = this.frameDurationByState[this.healthState];
    if (this.frameElapsedMs < frameDuration) return;

    this.frameElapsedMs = 0;
    this.frameIndex = (this.frameIndex + 1) % this.EXTRACTED_FRAMES_PER_STATE;
  }

  private render(): void {
    if (!this.petEl) return;

    if (this.renderMode === "extracted" && this.extractedFrames) {
      if (this.behaviorState === "walking") {
        this.petEl.style.backgroundImage = `url("${this.extractedFrames.walk[this.healthState][this.frameIndex]}")`;
      } else if (this.behaviorState === "sitting") {
        this.petEl.style.backgroundImage = `url("${this.extractedFrames.sit[this.healthState]}")`;
      } else {
        this.petEl.style.backgroundImage = `url("${this.extractedFrames.stand[this.healthState]}")`;
      }
      this.petEl.style.backgroundPosition = "center bottom";
    } else if (this.renderMode === "sheet" && this.sheetAtlas) {
      const stateFrameOdd = this.healthState * this.sheetAtlas.framesPerState + 1;
      const stateFrameAnim = this.healthState * this.sheetAtlas.framesPerState + this.frameIndex;
      const atlasFrameIndex = this.behaviorState === "walking" ? stateFrameAnim : stateFrameOdd;
      const sourceX = this.sheetAtlas.frameXs[atlasFrameIndex] ?? this.sheetAtlas.frameXs[0];
      const sourceY =
        this.behaviorState === "walking"
          ? this.sheetAtlas.rowYWalk
          : this.behaviorState === "sitting"
            ? this.sheetAtlas.rowYSit
            : this.sheetAtlas.rowYStand;

      const sx = this.DISPLAY_SIZE / this.sheetAtlas.frameWidth;
      const sy = this.DISPLAY_SIZE / this.sheetAtlas.frameHeight;
      this.petEl.style.backgroundPosition = `${-(sourceX * sx)}px ${-(sourceY * sy)}px`;
    }

    const facing = this.direction === 1 ? 1 : -1;
    this.petEl.style.transform = `translate3d(${this.x}px, 0, 0) scaleX(${facing})`;
    this.petEl.setAttribute("data-health-state", String(this.healthState));
    this.petEl.setAttribute("data-behavior", this.behaviorState);
  }

  private onResize(): void {
    if (!this.petEl) return;
    this.x = Math.max(0, Math.min(this.x, this.getMaxX()));
    this.render();
  }

  private onVisibilityChange(): void {
    if (document.hidden) return;
    this.lastTick = performance.now();
  }

  private getMaxX(): number {
    return Math.max(0, window.innerWidth - this.DISPLAY_SIZE);
  }

  private clampHealthState(value: number): HealthState {
    if (value <= 0) return 0;
    if (value >= 4) return 4;
    return value as HealthState;
  }

  private setHealthFromPercent(percent: number): void {
    const p = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
    const nextState = this.clampHealthState(Math.min(4, Math.floor(p / 20)));
    this.healthState = nextState;
  }

  private async pullAndApplyHealthFromStorage(): Promise<void> {
    const area = this.config.storageArea === "sync" ? chrome.storage.sync : chrome.storage.local;
    const payload = await area.get(this.config.percentKey);
    const percent = Number(payload[this.config.percentKey] ?? 0);
    this.setHealthFromPercent(percent);
  }
}
