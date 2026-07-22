// Validates a Brazilian CNPJ (checksum digits included). Accepts both the
// legacy all-numeric format and the alphanumeric format Receita Federal
// starts issuing in 2026 (IN RFB 2.229/2024): the first 12 positions
// (root + branch) may be letters or digits, the last 2 (check digits) are
// always numeric. Each character's value for the checksum is its ASCII
// code minus 48 — for digits this equals the digit's face value (ASCII
// "0" is 48), so the same formula already covers pure-numeric CNPJs
// exactly as before.
export function isValidCnpj(raw: string): boolean {
  const cnpj = raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) return false;
  if (/^(.)\1{13}$/.test(cnpj)) return false; // all same character

  const charValue = (c: string) => c.charCodeAt(0) - 48;

  const calcCheckDigit = (base: string, weights: number[]) => {
    const sum = base
      .split("")
      .reduce((acc, char, i) => acc + charValue(char) * weights[i], 0);
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
