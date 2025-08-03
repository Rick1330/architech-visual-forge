/**
 * Accessibility utilities and helpers
 * Provides WCAG 2.1 AA compliant accessibility features
 */

/**
 * ARIA live region announcer for screen readers
 */
class LiveAnnouncer {
  private static instance: LiveAnnouncer;
  private liveRegion: HTMLElement | null = null;

  private constructor() {
    this.createLiveRegion();
  }

  static getInstance(): LiveAnnouncer {
    if (!LiveAnnouncer.instance) {
      LiveAnnouncer.instance = new LiveAnnouncer();
    }
    return LiveAnnouncer.instance;
  }

  private createLiveRegion() {
    if (typeof document === 'undefined') return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';
    document.body.appendChild(this.liveRegion);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = '';
      }
    }, 1000);
  }
}

export const liveAnnouncer = LiveAnnouncer.getInstance();

/**
 * Focus management utilities
 */
export class FocusManager {
  private static focusStack: HTMLElement[] = [];

  /**
   * Save current focus and move to new element
   */
  static saveFocus(): HTMLElement | null {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
      return activeElement;
    }
    return null;
  }

  /**
   * Restore previously saved focus
   */
  static restoreFocus(): boolean {
    const elementToFocus = this.focusStack.pop();
    if (elementToFocus && this.isElementVisible(elementToFocus)) {
      elementToFocus.focus();
      return true;
    }
    return false;
  }

  /**
   * Focus first focusable element in container
   */
  static focusFirst(container: HTMLElement): boolean {
    const focusableElement = this.getFirstFocusableElement(container);
    if (focusableElement) {
      focusableElement.focus();
      return true;
    }
    return false;
  }

  /**
   * Focus last focusable element in container
   */
  static focusLast(container: HTMLElement): boolean {
    const focusableElements = this.getFocusableElements(container);
    const lastElement = focusableElements[focusableElements.length - 1];
    if (lastElement) {
      lastElement.focus();
      return true;
    }
    return false;
  }

  /**
   * Get all focusable elements in container
   */
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]'
    ].join(',');

    const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
    return elements.filter(element => this.isElementVisible(element));
  }

  /**
   * Get first focusable element in container
   */
  static getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
    const focusableElements = this.getFocusableElements(container);
    return focusableElements[0] || null;
  }

  /**
   * Trap focus within container
   */
  static trapFocus(container: HTMLElement): () => void {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = this.getFocusableElements(container);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  private static isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetHeight > 0 &&
           element.offsetWidth > 0;
  }
}

/**
 * Keyboard navigation utilities
 */
export class KeyboardNavigationManager {
  /**
   * Handle arrow key navigation in a grid
   */
  static handleGridNavigation(
    event: KeyboardEvent,
    currentIndex: number,
    itemsPerRow: number,
    totalItems: number,
    onNavigate: (newIndex: number) => void
  ) {
    const { key } = event;
    let newIndex = currentIndex;

    switch (key) {
      case 'ArrowLeft':
        newIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
        break;
      case 'ArrowRight':
        newIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
        newIndex = currentIndex - itemsPerRow;
        if (newIndex < 0) {
          newIndex = Math.floor((totalItems - 1) / itemsPerRow) * itemsPerRow + (currentIndex % itemsPerRow);
          if (newIndex >= totalItems) {
            newIndex -= itemsPerRow;
          }
        }
        break;
      case 'ArrowDown':
        newIndex = currentIndex + itemsPerRow;
        if (newIndex >= totalItems) {
          newIndex = currentIndex % itemsPerRow;
        }
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = totalItems - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    onNavigate(newIndex);
  }

  /**
   * Handle list navigation with arrow keys
   */
  static handleListNavigation(
    event: KeyboardEvent,
    currentIndex: number,
    totalItems: number,
    onNavigate: (newIndex: number) => void
  ) {
    const { key } = event;
    let newIndex = currentIndex;

    switch (key) {
      case 'ArrowUp':
        newIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
        break;
      case 'ArrowDown':
        newIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = totalItems - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    onNavigate(newIndex);
  }
}

/**
 * Color contrast utilities
 */
export class ColorContrastChecker {
  /**
   * Calculate relative luminance of a color
   */
  static getRelativeLuminance(r: number, g: number, b: number): number {
    const sRGB = [r, g, b].map(value => {
      value = value / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  }

  /**
   * Calculate contrast ratio between two colors
   */
  static getContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 1;
    
    const l1 = this.getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = this.getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Check if color combination meets WCAG contrast requirements
   */
  static meetsWCAGAA(foreground: string, background: string, isLargeText = false): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return isLargeText ? ratio >= 3 : ratio >= 4.5;
  }

  /**
   * Check if color combination meets WCAG AAA contrast requirements
   */
  static meetsWCAGAAA(foreground: string, background: string, isLargeText = false): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}