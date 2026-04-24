/**
 * pngjs v7 ships without bundled .d.ts; Astro check type-checks e2e helpers that import it.
 */
declare module 'pngjs' {
  export class PNG {
    width: number;
    height: number;
    data: Buffer;
    static sync: {
      // eslint-disable-next-line no-unused-vars -- ambient API shape (param is not “used” in .d.ts)
      read(buffer: Buffer): PNG;
    };
  }
}
