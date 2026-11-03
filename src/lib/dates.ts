const FRENCH_MONTHS = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
];

export function monthYearToYm(value: string): string | null {
  const isoMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value.trim());
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  const match = /^([a-zA-ZÀ-ÿ]+)\s+(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const month = match[1]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const monthIndex = FRENCH_MONTHS.indexOf(month);
  return monthIndex < 0 ? null : `${match[2]}-${String(monthIndex + 1).padStart(2, "0")}`;
}
