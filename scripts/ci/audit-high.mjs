import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Build-time picomatch ReDoS. No patched release exists (advisory covers <=4.0.7).
// Visitors never pass a glob to it. The checks below fail the gate when a patch
// ships or the advisory leaves npm audit, so this exception cannot sit unnoticed.
export const PICOMATCH_AUDIT_EXCEPTION = {
  id: 'GHSA-fc5q-39xc-vjpf',
  packageName: 'picomatch',
  acceptedLatest: '4.0.7',
  reason:
    'No patched picomatch release. The ReDoS is in the Vite/Astro build glob matcher, not on visitor requests.',
};

const EXCEPTION_FILE = 'scripts/ci/audit-high.mjs';

export function isNewerVersion(candidate, baseline) {
  const left = candidate.split('.').map((part) => Number.parseInt(part, 10));
  const right = baseline.split('.').map((part) => Number.parseInt(part, 10));
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;
    if (leftPart !== rightPart) return leftPart > rightPart;
  }
  return false;
}

function advisoryId(via) {
  const fromUrl = String(via.url ?? '')
    .split('/')
    .filter(Boolean)
    .pop();
  return fromUrl || null;
}

export function exceptionStaleReason(sawException, status) {
  const { id, acceptedLatest, packageName } = PICOMATCH_AUDIT_EXCEPTION;
  if (!sawException) {
    return `${id} is no longer reported by npm audit. Delete the exception in ${EXCEPTION_FILE}.`;
  }
  if (status.patchedVersions?.length) {
    const versions = status.patchedVersions.join(', ');
    return `${id} is patched in ${packageName}@${versions}. Upgrade and delete the exception in ${EXCEPTION_FILE}.`;
  }
  if (status.patchedVersions === null) {
    if (!status.registryLatest) {
      return `Could not verify that ${id} still has no patched ${packageName} release.`;
    }
    if (isNewerVersion(status.registryLatest, acceptedLatest)) {
      return `${packageName}@${status.registryLatest} is published (the exception accepted ${acceptedLatest}). Confirm it patches ${id}, upgrade, and delete the exception in ${EXCEPTION_FILE}.`;
    }
  }
  return null;
}

export function evaluateAudit(report, status) {
  const blocking = [];
  let sawException = false;

  for (const [name, info] of Object.entries(report.vulnerabilities ?? {})) {
    for (const via of info.via ?? []) {
      if (typeof via !== 'object' || via === null) continue;
      if (via.severity !== 'high' && via.severity !== 'critical') continue;
      const id = advisoryId(via);
      if (id === PICOMATCH_AUDIT_EXCEPTION.id) {
        sawException = true;
        continue;
      }
      blocking.push(`${via.severity} ${id ?? name} via ${name}: ${via.title}`);
    }
  }

  const stale = exceptionStaleReason(sawException, status);
  if (stale) blocking.unshift(stale);

  const notes = [];
  if (sawException && !stale) {
    notes.push(
      `accepting ${PICOMATCH_AUDIT_EXCEPTION.id}: ${PICOMATCH_AUDIT_EXCEPTION.reason} The gate fails on its own when a patched picomatch is published or this advisory leaves npm audit.`,
    );
  }

  return { ok: blocking.length === 0, blocking, notes };
}

async function readJson(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) return null;
  return response.json();
}

export async function loadPicomatchPatchStatus() {
  let patchedVersions = null;
  try {
    const advisory = await readJson(
      `https://api.github.com/advisories/${PICOMATCH_AUDIT_EXCEPTION.id}`,
      {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'havlinj-audit-gate',
      },
    );
    if (advisory) {
      patchedVersions = (advisory.vulnerabilities ?? [])
        .filter(
          (entry) =>
            entry.package?.ecosystem === 'npm' &&
            entry.package?.name === PICOMATCH_AUDIT_EXCEPTION.packageName,
        )
        .map((entry) => entry.first_patched_version)
        .filter(Boolean);
    }
  } catch {
    patchedVersions = null;
  }

  let registryLatest = null;
  try {
    const latest = await readJson(
      `https://registry.npmjs.org/${PICOMATCH_AUDIT_EXCEPTION.packageName}/latest`,
    );
    registryLatest = latest?.version ?? null;
  } catch {
    registryLatest = null;
  }

  return { patchedVersions, registryLatest };
}

async function main() {
  const report = JSON.parse(readFileSync(0, 'utf8'));
  if (report.error) {
    console.error(report.error.summary ?? report.error);
    process.exit(1);
  }

  const result = evaluateAudit(report, await loadPicomatchPatchStatus());
  for (const note of result.notes) console.log(`npm audit: ${note}`);
  if (!result.ok) {
    console.error(result.blocking.join('\n'));
    process.exit(1);
  }
  console.log('npm audit: no other blocking high or critical advisories');
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
