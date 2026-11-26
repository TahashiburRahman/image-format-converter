declare module 'utif2' {
  export interface IFD {
    width: number;
    height: number;
    t256?: number[];
    t257?: number[];
    t258?: number[];
    subIFD?: IFD[];
    [key: string]: unknown;
  }

  export function decode(buffer: ArrayBuffer): IFD[];
  export function decodeImage(buffer: ArrayBuffer, ifd: IFD, ifds?: IFD[]): void;
  export function toRGBA8(ifd: IFD): Uint8Array;
  export function encodeImage(
    rgba: Uint8Array | Uint8ClampedArray,
    width: number,
    height: number,
    metadata?: Record<string, unknown>
  ): ArrayBuffer;
}
