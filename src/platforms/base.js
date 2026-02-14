/**
 * BasePlatform - abstract base for all social media platforms
 */

export class BasePlatform {
  constructor({ name, maxLength = 280 }) {
    if (new.target === BasePlatform) {
      throw new Error('BasePlatform is abstract — use a subclass');
    }
    this.name = name;
    this.maxLength = maxLength;
    this.enabled = true;
  }

  /** Post content to the platform. Must be overridden. */
  async post(_message) {
    throw new Error(`${this.name}.post() not implemented`);
  }

  /** Verify credentials. Must be overridden. */
  async verifyToken() {
    throw new Error(`${this.name}.verifyToken() not implemented`);
  }
}
