/**
 * XIV Dye Tools v2.0.0 - Image Zoom Controller
 *
 * Phase 3: Architecture Refactor
 * Handles image zooming, panning, and sampling interactions
 *
 * @module components/image-zoom-controller
 */

import { BaseComponent } from './base-component';
import { LanguageService } from '@services/language-service';
import { ICON_ZOOM_FIT, ICON_ZOOM_WIDTH } from '@shared/ui-icons';
import { clearContainer } from '@shared/utils';

export interface ImageZoomControllerOptions {
  onColorSampled?: (hex: string, x: number, y: number) => void;
}

export class ImageZoomController extends BaseComponent {
  private currentImage: HTMLImageElement | null = null;
  private zoomLevel: number = 100;
  private canvasRef: HTMLCanvasElement | null = null;
  private canvasContainerRef: HTMLElement | null = null;
  private onColorSampled?: (hex: string, x: number, y: number) => void;

  // UI Elements
  private zoomDisplay: HTMLElement | null = null;
  private zoomOutBtn: HTMLButtonElement | null = null;
  private zoomInBtn: HTMLButtonElement | null = null;

  // Track whether image should be centered (set by fit-to-screen)
  private isCentered: boolean = false;

  constructor(container: HTMLElement, options: ImageZoomControllerOptions = {}) {
    super(container);
    this.onColorSampled = options.onColorSampled;
  }

  renderContent(): void {
    // Container is expected to be provided by parent
    // We will append our controls and canvas to it
    this.container.classList.add('space-y-4');
  }

  bindEvents(): void {
    // Events are bound when elements are created in setImage
  }

  /**
   * Set the image to display and initialize controls
   */
  setImage(image: HTMLImageElement): void {
    this.currentImage = image;
    this.zoomLevel = 100;

    clearContainer(this.container);

    // Create canvas container for scrolling
    // overflow: hidden ensures zoomed image is clipped within this container
    this.canvasContainerRef = this.createElement('div', {
      className:
        'w-full h-full overflow-hidden bg-gray-50 dark:bg-gray-900',
      attributes: {
        id: 'canvas-container',
        style: 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden;',
      },
    });

    // Create canvas for image display
    this.canvasRef = this.createElement('canvas', {
      className: 'cursor-crosshair block',
      attributes: {
        width: String(image.width),
        height: String(image.height),
      },
    });

    const ctx = this.canvasRef.getContext('2d');
    if (ctx) {
      ctx.drawImage(image, 0, 0);
    }

    this.canvasContainerRef.appendChild(this.canvasRef);
    this.container.appendChild(this.canvasContainerRef);

    // Create zoom controls container (Overlay)
    // Inline styles ensure visibility even if CSS class isn't applied
    const zoomControls = this.createElement('div', {
      className: 'zoom-controls',
      attributes: {
        style: `
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          padding: 4px;
          gap: 4px;
          z-index: 100;
        `.replace(/\s+/g, ' ').trim(),
      },
    });

    // Common button styles
    const btnStyle = `
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: 4px;
      color: #a0a0a0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `.replace(/\s+/g, ' ').trim();

    const svgStyle = 'width: 16px; height: 16px; fill: currentColor;';

    // Fit to Screen button
    const fitBtn = this.createElement('button', {
      className: 'zoom-btn',
      innerHTML: `<svg viewBox="0 0 24 24" style="${svgStyle}"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6z" /></svg>`,
      attributes: {
        title: LanguageService.t('matcher.zoomFit') || 'Fit to Screen',
        type: 'button',
        style: btnStyle,
      },
    });
    zoomControls.appendChild(fitBtn);

    // Fit Width button
    const widthBtn = this.createElement('button', {
      className: 'zoom-btn',
      innerHTML: `<svg viewBox="0 0 24 24" style="${svgStyle}"><path d="M21 4H3v16h18V4zm-2 14H5V6h14v12z" /><path d="M12 7l-3 3h2v4H9l3 3 3-3h-2V10h2l-3-3z" /></svg>`,
      attributes: {
        title: LanguageService.t('matcher.zoomWidth') || 'Fit Width',
        type: 'button',
        style: btnStyle,
      },
    });
    zoomControls.appendChild(widthBtn);

    // Separator
    const separatorStyle = 'width: 1px; height: 20px; background: rgba(255, 255, 255, 0.2);';
    zoomControls.appendChild(this.createElement('div', {
      className: 'zoom-separator',
      attributes: { style: separatorStyle },
    }));

    // Zoom out button
    this.zoomOutBtn = this.createElement('button', {
      className: 'zoom-btn',
      innerHTML: `<svg viewBox="0 0 24 24" style="${svgStyle}"><path d="M19 13H5v-2h14v2z" /></svg>`,
      attributes: {
        title: 'Zoom Out',
        type: 'button',
        style: btnStyle,
      },
    });
    zoomControls.appendChild(this.zoomOutBtn);

    // Zoom level display - Wrapper button for styling consistency
    const zoomDisplayBtn = this.createElement('button', {
      className: 'zoom-btn',
      attributes: {
        title: 'Current Zoom',
        style: `${btnStyle} width: auto; padding: 0 8px; cursor: default;`,
      },
    });
    this.zoomDisplay = this.createElement('span', {
      className: 'zoom-level',
      textContent: '100.00%',
      attributes: {
        style: 'font-size: 12px; color: #e0e0e0;',
      },
    });
    zoomDisplayBtn.appendChild(this.zoomDisplay);
    zoomControls.appendChild(zoomDisplayBtn);

    // Zoom in button
    this.zoomInBtn = this.createElement('button', {
      className: 'zoom-btn',
      innerHTML: `<svg viewBox="0 0 24 24" style="${svgStyle}"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>`,
      attributes: {
        title: 'Zoom In',
        type: 'button',
        style: btnStyle,
      },
    });
    zoomControls.appendChild(this.zoomInBtn);

    // Separator
    zoomControls.appendChild(this.createElement('div', {
      className: 'zoom-separator',
      attributes: { style: separatorStyle },
    }));

    // Reset button
    const resetBtn = this.createElement('button', {
      className: 'zoom-btn',
      innerHTML: `<svg viewBox="0 0 24 24" style="${svgStyle}"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" /></svg>`,
      attributes: {
        title: LanguageService.t('matcher.zoomReset') || 'Reset Zoom',
        type: 'button',
        style: btnStyle,
      },
    });
    zoomControls.appendChild(resetBtn);

    this.container.appendChild(zoomControls);

    // Prevent clicks on zoom controls from bubbling to parent (e.g., file input trigger)
    this.on(zoomControls, 'click', (e: Event) => {
      e.stopPropagation();
    });

    // Setup interactions
    this.setupZoomControls(fitBtn, widthBtn, resetBtn);
    this.setupImageInteraction();
  }

  getCanvasContainer(): HTMLElement | null {
    return this.canvasContainerRef;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvasRef;
  }

  private setupZoomControls(
    fitBtn: HTMLElement,
    widthBtn: HTMLElement,
    resetBtn: HTMLElement
  ): void {
    if (!this.canvasRef || !this.canvasContainerRef || !this.currentImage) return;

    const MIN_ZOOM = 10;
    const MAX_ZOOM = 400;
    const MIN_CONTAINER_DIMENSION = 50;

    const getContainerDimensions = (): { width: number; height: number } => {
      if (!this.canvasContainerRef) return { width: 0, height: 0 };

      // Try to get dimensions from parent container first (the drop zone)
      const parent = this.canvasContainerRef.parentElement;

      let width = 0;
      let height = 0;

      // First try parent's bounding rect (most reliable for absolute positioned container)
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        width = parentRect.width;
        height = parentRect.height;
      }

      // Fallback to canvas container dimensions
      if (width <= 0 || height <= 0) {
        width = this.canvasContainerRef.clientWidth;
        height = this.canvasContainerRef.clientHeight;
      }

      if (width <= 0 || height <= 0) {
        width = this.canvasContainerRef.offsetWidth;
        height = this.canvasContainerRef.offsetHeight;
      }

      if (width <= 0 || height <= 0) {
        const rect = this.canvasContainerRef.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      }

      // Final fallback
      if (width <= 0 || height <= 0) {
        width = window.innerWidth - 32;
        height = window.innerHeight * 0.4;
      }

      width = Math.max(width, MIN_CONTAINER_DIMENSION);
      height = Math.max(height, MIN_CONTAINER_DIMENSION);

      return { width, height };
    };

    const updateZoom = (newZoom: number, setCenter?: boolean): void => {
      if (!this.canvasRef || !this.zoomDisplay || !this.zoomOutBtn || !this.zoomInBtn) return;

      this.zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      const scale = this.zoomLevel / 100;

      // If setCenter is explicitly provided, update the centering state
      if (setCenter !== undefined) {
        this.isCentered = setCenter;
      }

      this.canvasRef.style.transform = `scale(${scale})`;
      this.canvasRef.style.transformOrigin = 'top left';
      this.canvasRef.style.cursor = this.zoomLevel > 100 ? 'move' : 'crosshair';

      // Center the canvas if centering is enabled
      if (this.isCentered && this.currentImage && this.canvasContainerRef) {
        const container = getContainerDimensions();
        const scaledWidth = this.currentImage.width * scale;
        const scaledHeight = this.currentImage.height * scale;
        const marginLeft = Math.max(0, (container.width - scaledWidth) / 2);
        const marginTop = Math.max(0, (container.height - scaledHeight) / 2);
        this.canvasRef.style.marginLeft = `${marginLeft}px`;
        this.canvasRef.style.marginTop = `${marginTop}px`;
      } else {
        // Reset margins when not centering
        this.canvasRef.style.marginLeft = '0';
        this.canvasRef.style.marginTop = '0';
      }

      this.zoomDisplay.textContent = `${this.zoomLevel.toFixed(2)}%`;

      this.zoomOutBtn.disabled = this.zoomLevel <= MIN_ZOOM;
      this.zoomInBtn.disabled = this.zoomLevel >= MAX_ZOOM;

      this.toggleClass(this.zoomOutBtn, 'opacity-50', this.zoomLevel <= MIN_ZOOM);
      this.toggleClass(this.zoomOutBtn, 'cursor-not-allowed', this.zoomLevel <= MIN_ZOOM);

      this.toggleClass(this.zoomInBtn, 'opacity-50', this.zoomLevel >= MAX_ZOOM);
      this.toggleClass(this.zoomInBtn, 'cursor-not-allowed', this.zoomLevel >= MAX_ZOOM);
    };

    const fitToContainer = (): void => {
      requestAnimationFrame(() => {
        if (!this.currentImage) return;
        const container = getContainerDimensions();
        const imageWidth = this.currentImage.naturalWidth || this.currentImage.width;
        const imageHeight = this.currentImage.naturalHeight || this.currentImage.height;

        if (imageWidth <= 0 || imageHeight <= 0) return;

        const zoomX = (container.width / imageWidth) * 100;
        const zoomY = (container.height / imageHeight) * 100;
        // Allow zoom > 100% if image is smaller than container
        const newZoom = Math.min(zoomX, zoomY);

        // Enable centering for fit-to-screen
        updateZoom(Math.max(newZoom, MIN_ZOOM), true);
      });
    };

    const zoomToWidth = (): void => {
      requestAnimationFrame(() => {
        if (!this.currentImage) return;
        const container = getContainerDimensions();
        const imageWidth = this.currentImage.naturalWidth || this.currentImage.width;

        if (imageWidth <= 0) return;

        const newZoom = (container.width / imageWidth) * 100;
        // Enable centering for fit-to-width
        updateZoom(Math.max(Math.min(newZoom, MAX_ZOOM), MIN_ZOOM), true);
      });
    };

    // Listeners
    this.on(fitBtn, 'click', fitToContainer);
    this.on(widthBtn, 'click', zoomToWidth);

    if (this.zoomOutBtn) {
      this.on(this.zoomOutBtn, 'click', () => {
        if (this.zoomLevel > MIN_ZOOM) updateZoom(this.zoomLevel - 10);
      });
    }

    if (this.zoomInBtn) {
      this.on(this.zoomInBtn, 'click', () => {
        if (this.zoomLevel < MAX_ZOOM) updateZoom(this.zoomLevel + 10);
      });
    }

    // Reset disables centering and goes back to 100%
    this.on(resetBtn, 'click', () => updateZoom(100, false));

    this.on(this.canvasContainerRef, 'wheel', (e: Event) => {
      const wheelEvent = e as WheelEvent;
      if (!wheelEvent.shiftKey) return;

      wheelEvent.preventDefault();
      const delta = wheelEvent.deltaY > 0 ? -10 : 10;
      updateZoom(this.zoomLevel + delta);
    });

    this.on(document, 'keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (
        document.activeElement === document.body ||
        (this.canvasContainerRef && document.activeElement?.contains(this.canvasContainerRef))
      ) {
        if (keyEvent.key === '+' || keyEvent.key === '=') {
          keyEvent.preventDefault();
          if (this.zoomLevel < MAX_ZOOM) updateZoom(this.zoomLevel + 10);
        } else if (keyEvent.key === '-') {
          keyEvent.preventDefault();
          if (this.zoomLevel > MIN_ZOOM) updateZoom(this.zoomLevel - 10);
        } else if (keyEvent.key === '0') {
          keyEvent.preventDefault();
          updateZoom(100);
        }
      }
    });
  }

  private setupImageInteraction(): void {
    if (!this.canvasRef || !this.currentImage) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    this.on(this.canvasRef, 'mousedown', (e: Event) => {
      if (!this.canvasRef) return;
      const mouseEvent = e as MouseEvent;
      const rect = this.canvasRef.getBoundingClientRect();
      startX = (mouseEvent.clientX - rect.left) * (this.canvasRef.width / rect.width);
      startY = (mouseEvent.clientY - rect.top) * (this.canvasRef.height / rect.height);
      isDragging = true;
    });

    this.on(this.canvasRef, 'mousemove', (e: Event) => {
      if (!isDragging || !this.canvasRef || !this.currentImage) return;

      const mouseEvent = e as MouseEvent;
      const rect = this.canvasRef.getBoundingClientRect();
      const currentX = (mouseEvent.clientX - rect.left) * (this.canvasRef.width / rect.width);
      const currentY = (mouseEvent.clientY - rect.top) * (this.canvasRef.height / rect.height);

      const ctx = this.canvasRef.getContext('2d');
      if (ctx) {
        ctx.drawImage(this.currentImage, 0, 0);
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        const width = currentX - startX;
        const height = currentY - startY;
        ctx.strokeRect(startX, startY, width, height);
      }
    });

    this.on(this.canvasRef, 'mouseup', (e: Event) => {
      if (!isDragging || !this.canvasRef || !this.currentImage) return;
      isDragging = false;

      const mouseEvent = e as MouseEvent;
      const rect = this.canvasRef.getBoundingClientRect();
      const endX = (mouseEvent.clientX - rect.left) * (this.canvasRef.width / rect.width);
      const endY = (mouseEvent.clientY - rect.top) * (this.canvasRef.height / rect.height);

      const centerX = (startX + endX) / 2;
      const centerY = (startY + endY) / 2;

      // Get color at center
      const ctx = this.canvasRef.getContext('2d');
      if (ctx) {
        // Redraw original image first to clear selection box
        ctx.drawImage(this.currentImage, 0, 0);

        const pixel = ctx.getImageData(centerX, centerY, 1, 1).data;
        const hex =
          '#' +
          [pixel[0], pixel[1], pixel[2]]
            .map((x) => x.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();

        // Emit sample event
        if (this.onColorSampled) {
          this.onColorSampled(hex, centerX, centerY);
        }

        // Also emit custom event
        this.emit('image-sampled', { hex, x: centerX, y: centerY });
      }
    });

    this.on(this.canvasRef, 'mouseleave', () => {
      if (isDragging && this.canvasRef && this.currentImage) {
        isDragging = false;
        const ctx = this.canvasRef.getContext('2d');
        if (ctx) {
          ctx.drawImage(this.currentImage, 0, 0);
        }
      }
    });
  }
}
