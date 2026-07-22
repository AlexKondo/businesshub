// Generic input mask, admin-configured per field: "9" = digit-only
// position, "Z" = alphanumeric (letter or digit) position, any other
// character in the pattern is a literal inserted automatically. Example:
// "ZZ.ZZZ.ZZZ/ZZZZ-99" for a CNPJ (accepts both the legacy all-numeric
// format and the alphanumeric format).
export function applyMask(raw: string, pattern: string): string {
  const input = raw.toUpperCase();
  let result = "";
  let i = 0;

  for (const patternChar of pattern) {
    if (i >= input.length) break;

    if (patternChar === "9") {
      while (i < input.length && !/[0-9]/.test(input[i])) i++;
      if (i >= input.length) break;
      result += input[i];
      i++;
    } else if (patternChar === "Z") {
      while (i < input.length && !/[0-9A-Z]/.test(input[i])) i++;
      if (i >= input.length) break;
      result += input[i];
      i++;
    } else {
      result += patternChar;
      if (input[i] === patternChar) i++;
    }
  }

  return result;
}

// A mask "looks like" a CNPJ when, ignoring literals, it's 12 alphanumeric
// positions (9 or Z — either digit-only or letter-or-digit both satisfy a
// CNPJ base) followed by 2 digit-only positions (check digits are always
// numeric, in both the legacy and the alphanumeric format).
export function isCnpjShapedMask(pattern: string): boolean {
  const positions = pattern.replace(/[^9Z]/gi, "").toUpperCase();
  return /^[9Z]{12}99$/.test(positions);
}
