export function formatCep(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isValidCep(raw: string) {
  return raw.replace(/\D/g, "").length === 8;
}

// Looks up a Brazilian CEP via the public ViaCEP API. Returns null on any
// failure (invalid CEP, network error, unknown CEP) so the caller can fall
// back to manual entry.
export async function lookupCep(
  raw: string
): Promise<{ street: string; city: string; state: string } | null> {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await res.json();
    if (data?.erro) return null;
    return {
      street: (data.logradouro as string) ?? "",
      city: (data.localidade as string) ?? "",
      state: (data.uf as string) ?? "",
    };
  } catch {
    return null;
  }
}
