export function applyMoneyMask(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  const cents = Number(digits).toString();
  const padded = cents.padStart(3, "0");

  const integerPart = padded.slice(0, -2);
  const decimalPart = padded.slice(-2);

  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `R$ ${formattedInteger},${decimalPart}`;
}
