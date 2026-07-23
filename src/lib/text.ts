// Strips accents/case so admin-typed labels like "Endereço"/"Cidade"/"CNPJ"
// match regardless of exact casing/accenting. Pure string utility — safe to
// import from client components and server routes alike.
export function normalizeLabel(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
