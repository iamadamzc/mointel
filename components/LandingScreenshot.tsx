import type { Shot } from '@/lib/public/landingCopy';

/**
 * A slot is ready only with an image (a sized static file) AND a caption whose {date} and
 * {time} have been filled from the capture. Commercial read 43 (268a988d): an empty slot
 * would print a literal "{date}" and an aria-label for an image that is not there, so a slot
 * that is not ready renders NOTHING, and sections can ship as their images land.
 */
export function shotIsReady(shot: Shot): boolean {
  return Boolean(shot.src && shot.width && shot.height) && !/\{(date|time)\}/.test(shot.caption);
}

export function LandingScreenshot({ shot }: { shot: Shot }) {
  if (!shotIsReady(shot)) return null;
  return (
    <figure className="flex flex-col gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- a static file, sized; no optimiser on this box. */}
      <img
        src={shot.src}
        alt={shot.alt}
        width={shot.width}
        height={shot.height}
        loading={shot.slot === 1 ? 'eager' : 'lazy'}
        className="h-auto w-full rounded border border-line"
      />
      <figcaption className="text-xs leading-normal text-ink-3">{shot.caption}</figcaption>
    </figure>
  );
}
