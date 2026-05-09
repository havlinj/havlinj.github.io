/**
 * pngjs v7 ships without bundled .d.ts; Astro check type-checks e2e helpers that import it.
 */
declare module 'pngjs' {
  export class PNG {
    width: number;
    height: number;
    data: Buffer;
    static sync: {
      read(buffer: Buffer): PNG;
    };
  }
}
