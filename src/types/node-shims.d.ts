declare module 'node:fs/promises' {
  export interface DirEntryLike {
    name: string;
    isFile(): boolean;
  }

  export function readdir(
    _path: string,
    _options?: { withFileTypes?: boolean },
  ): Promise<DirEntryLike[]>;
}

declare module 'node:path' {
  export function join(..._parts: string[]): string;
  export function extname(_path: string): string;
}

declare const process: {
  cwd(): string;
};
