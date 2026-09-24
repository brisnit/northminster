/**
 * When true, content that Northminster still needs to confirm is shown with
 * a visible "Needs confirmation" marker so reviewers can find it.
 * Set to false (or run with PUBLIC_HIDE_CONTENT_FLAGS=true) for launch —
 * after the items in docs/CONTENT-FLAGS.md have been resolved.
 */
export const SHOW_CONTENT_FLAGS = import.meta.env.PUBLIC_HIDE_CONTENT_FLAGS !== 'true';
