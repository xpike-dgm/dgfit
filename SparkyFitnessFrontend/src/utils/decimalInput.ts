/**
 * Turkish keyboards type "78,5"; the app's state and API always use "78.5".
 * Keeps digits, one sign and the decimal point so half-typed values ("-",
 * "12.") survive while the person is still typing.
 */
export const normalizeDecimalInput = (raw: string): string =>
  raw.replace(/,/g, '.').replace(/[^\d.+\-eE]/g, '');

/** Parses a typed decimal that may use a comma ("78,5" -> 78.5). */
export const parseDecimalInput = (raw: string): number =>
  parseFloat(normalizeDecimalInput(raw));
