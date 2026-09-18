/**
 * The M of Momentum, drawn as the move it names.
 *
 * ONE SOURCE, BECAUSE A LOGO IN TWO FILES IS A LOGO THAT DRIFTS. The site
 * header, the footer and anything the desk grows later read this rather than
 * carrying their own copy of the path -- the same reason `baselineLabel` is
 * exported rather than typed at each call site.
 *
 * `stroke="currentColor"` rather than the accent hex: the consumer sets the
 * colour with a class, so the mark inherits a theme instead of asserting one.
 * The standalone files under `public/brand/` cannot do that, because
 * `currentColor` does not inherit through an `img` tag -- which is why those
 * exist per-ground and this one does not.
 *
 * The geometry is `public/brand/mark.svg` and the two must stay in step. Retrace
 * at a third of the height against a first peak at a fifth: deeper stops reading
 * as momentum, shallower closes the middle vertex before 16px.
 */
export function BrandMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <polyline
        points="9,52 21,19 32,34 43,10 55,52"
        fill="none"
        stroke="currentColor"
        strokeWidth="7.5"
        strokeLinejoin="miter"
        strokeMiterlimit="3"
      />
    </svg>
  );
}
