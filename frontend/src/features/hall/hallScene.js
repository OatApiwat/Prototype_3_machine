// Shared geometry of the HAll oven drawings (mm, from the oven layout)
export const XOV = 1900;
export const GLUE0 = [134, 239, 172],
  GLUE1 = [21, 128, 61];
export const mix = (a, b, u) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * u)},${Math.round(a[1] + (b[1] - a[1]) * u)},${Math.round(a[2] + (b[2] - a[2]) * u)})`;
