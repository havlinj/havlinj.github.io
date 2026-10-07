import esbuild from 'esbuild';
import { resolve } from 'node:path';

const ENTRY = resolve('src/scripts/dichrom-hero-early.ts');

export function dichromHeroEarlyInlineScript(): string {
  const built = esbuild.buildSync({
    entryPoints: [ENTRY],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'DichromHeroEarly',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    legalComments: 'none',
  });
  const program = built.outputFiles[0]?.text ?? '';
  if (!program.includes('assignDichromHeroSrc')) {
    throw new Error('hero early bundle is missing assignDichromHeroSrc');
  }
  return `${program}\nDichromHeroEarly.assignDichromHeroSrc();`;
}
