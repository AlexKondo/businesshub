// Validates a Brazilian CNPJ (checksum digits included), format-only for
// now — the platform doesn't validate other countries' tax ids yet.
export function isValidCnpj(raw: string): boolean {
  const cnpj = raw.replace(/\D/g, "");
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // all same digit

  const calcCheckDigit = (base: string, weights: number[]) => {
    const sum = base
      .split("")
      .reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const digit1 = calcCheckDigit(cnpj.slice(0, 12), weights1);
  const digit2 = calcCheckDigit(cnpj.slice(0, 12) + digit1, weights2);

  return cnpj === cnpj.slice(0, 12) + String(digit1) + String(digit2);
}

export function formatCnpj(raw: string): string {
  const cnpj = raw.replace(/\D/g, "").slice(0, 14);
  return cnpj
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
