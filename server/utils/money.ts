// x * 100 is inexact in floating point (524.8 * 100 = 52479.99…), toFixed is not.
export const hasAtMostTwoDecimals = (value: number): boolean =>
  Number(value.toFixed(2)) === value;
