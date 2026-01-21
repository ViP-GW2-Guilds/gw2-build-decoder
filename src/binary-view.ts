/**
 * Utility for reading binary data from an ArrayBuffer with position tracking
 */
export class BinaryView {
  private view: DataView;
  private pos: number;

  /**
   * Create a new BinaryView
   * @param buffer - The ArrayBuffer to read from
   * @param offset - Starting position (default: 0)
   */
  constructor(buffer: ArrayBuffer, offset: number = 0) {
    this.view = new DataView(buffer);
    this.pos = offset;
  }

  /**
   * Read a byte at the current position + offset without advancing position
   * @param offset - Offset from current position
   * @returns The byte value
   */
  peekByte(offset: number = 0): number {
    return this.view.getUint8(this.pos + offset);
  }

  /**
   * Read a byte and advance position
   * @returns The byte value
   */
  readByte(): number {
    return this.view.getUint8(this.pos++);
  }

  /**
   * Read a uint16 (little-endian) and advance position
   * @returns The uint16 value
   */
  readUInt16LE(): number {
    const value = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return value;
  }

  /**
   * Skip forward by N bytes
   * @param bytes - Number of bytes to skip
   */
  skip(bytes: number): void {
    this.pos += bytes;
  }

  /**
   * Create a new BinaryView at current position + offset
   * @param offset - Offset from current position
   * @returns New BinaryView instance
   */
  slice(offset: number): BinaryView {
    return new BinaryView(this.view.buffer as ArrayBuffer, this.pos + offset);
  }

  /**
   * Get current position
   */
  get position(): number {
    return this.pos;
  }

  /**
   * Get the underlying buffer
   */
  get buffer(): ArrayBuffer {
    return this.view.buffer as ArrayBuffer;
  }
}
