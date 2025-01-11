export class MathUtils {
  /**
   * Rounds a number down to the specified decimal places.
   * @param value - The number to round down.
   * @param decimals - The number of decimal places to keep.
   * @returns The rounded down value.
   */
  static floor(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.floor(value * factor) / factor;
  }

  /**
   * Rounds a number to the specified decimal places.
   * @param value - The number to round.
   * @param decimals - The number of decimal places to keep.
   * @returns The rounded value.
   */
  static round(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
}
