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

    // Create zoom controls container
    const zoomControls = this.createElement('div', {
      className: 'flex flex-wrap gap-2 mb-4',
    });

    // Fit button
    const fitBtn = this.createElement('button', {
      className:
        'px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 ' +
        'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors',
      innerHTML: `<span class="inline-block w-4 h-4 mr-1" aria-hidden="true">${ICON_ZOOM_FIT}</span> ${LanguageService.t('matcher.zoomFit')}`,
      attributes: {
        title: LanguageService.t('matcher.zoomFit'),
        type: 'button',
      },
    });
    zoomControls.appendChild(fitBtn);

    // Width button
    const widthBtn = this.createElement('button', {
      className:
        'px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 ' +
        'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors',
      innerHTML: `<span class="inline-block w-4 h-4 mr-1" aria-hidden="true">${ICON_ZOOM_WIDTH}</span> ${LanguageService.t('matcher.zoomWidth')}`,
      attributes: {
        title: LanguageService.t('matcher.zoomWidth'),
        type: 'button',
      },
    });
    zoomControls.appendChild(widthBtn);

    // Zoom out button
    this.zoomOutBtn = this.createElement('button', {
      className:
        'px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 ' +
        'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors',
      textContent: '−',
      attributes: {
        title: 'Zoom out (10%)',
        type: 'button',
      },
    });
    zoomControls.appendChild(this.zoomOutBtn);

    // Zoom level display
    this.zoomDisplay = this.createElement('div', {
      className:
        'px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 ' +
        'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white min-w-20 text-center',
      textContent: '100%',
    });
    zoomControls.appendChild(this.zoomDisplay);

    // Zoom in button
    this.zoomInBtn = this.createElement('button', {
      className:
        'px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 ' +
        'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors',
      textContent: '+',
      attributes: {
        title: 'Zoom in (10%)',
        type: 'button',
      },
    });
    zoomControls.appendChild(this.zoomInBtn);

    // Reset button
    const resetBtn = this.createElement('button', {
      className:
        'px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 ' +
        'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors',
      textContent: `↺ ${LanguageService.t('matcher.zoomReset')}`,
      attributes: {
        title: LanguageService.t('matcher.zoomReset'),
        type: 'button',
      },
    });
    zoomControls.appendChild(resetBtn);

    this.container.appendChild(zoomControls);

    // Create canvas container for scrolling
    this.canvasContainerRef = this.createElement('div', {
      className:
        'w-full max-h-96 overflow-auto rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900',
      attributes: {
        id: 'canvas-container',
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

      let width = this.canvasContainerRef.clientWidth;
      let height = this.canvasContainerRef.clientHeight;

      if (width <= 0 || height <= 0) {
        width = this.canvasContainerRef.offsetWidth;
        height = this.canvasContainerRef.offsetHeight;
      }

      if (width <= 0 || height <= 0) {
        const rect = this.canvasContainerRef.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      }

      if (width <= 0 || height <= 0) {
        width = window.innerWidth - 32;
        height = window.innerHeight * 0.4;
      }

      width = Math.max(width, MIN_CONTAINER_DIMENSION);
      height = Math.max(height, MIN_CONTAINER_DIMENSION);

      return {
        width: Math.max(width - 16, MIN_CONTAINER_DIMENSION),
        height: Math.max(height - 16, MIN_CONTAINER_DIMENSION),
      };
    };

    const updateZoom = (newZoom: number): void => {
      if (!this.canvasRef || !this.zoomDisplay || !this.zoomOutBtn || !this.zoomInBtn) return;

      this.zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      const scale = this.zoomLevel / 100;

      this.canvasRef.style.transform = `scale(${scale})`;
      this.canvasRef.style.transformOrigin = 'top left';
      this.canvasRef.style.cursor = this.zoomLevel > 100 ? 'move' : 'crosshair';

      this.zoomDisplay.textContent = `${this.zoomLevel}%`;

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
        const newZoom = Math.min(zoomX, zoomY, 100);

        updateZoom(Math.max(newZoom, MIN_ZOOM));
      });
    };

    const zoomToWidth = (): void => {
      requestAnimationFrame(() => {
        if (!this.currentImage) return;
        const container = getContainerDimensions();
        const imageWidth = this.currentImage.naturalWidth || this.currentImage.width;

        if (imageWidth <= 0) return;

        const newZoom = (container.width / imageWidth) * 100;
        updateZoom(Math.max(Math.min(newZoom, MAX_ZOOM), MIN_ZOOM));
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

    this.on(resetBtn, 'click', () => updateZoom(100));

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
