declare module 'node:fs' {
  export function readFileSync(
    _path: string,
    _encoding: BufferEncoding | { encoding: BufferEncoding },
  ): string;
}

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
  export function resolve(..._parts: string[]): string;
  export function isAbsolute(_path: string): boolean;
  export function dirname(_path: string): string;
  const path: {
    join(..._parts: string[]): string;
    extname(_path: string): string;
    resolve(..._parts: string[]): string;
    isAbsolute(_path: string): boolean;
    dirname(_path: string): string;
  };
  export default path;
}

declare module 'node:child_process' {
  export function execFileSync(
    _file: string,
    _args?: readonly string[],
    _options?: {
      cwd?: string;
      env?: Record<string, string | undefined>;
      stdio?: 'pipe' | 'inherit' | readonly ('pipe' | 'inherit' | 'ignore')[];
    },
  ): Buffer | string;
}

declare module 'node:url' {
  export function fileURLToPath(_url: string | URL): string;
}

declare const process: {
  cwd(): string;
  env: Record<string, string | undefined>;
};

type BufferEncoding = 'utf8' | 'utf-8' | 'ascii' | 'binary' | 'base64' | 'hex';
