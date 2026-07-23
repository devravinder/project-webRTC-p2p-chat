// Deliberately excludes visually-ambiguous characters (0/O, 1/I/L).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;
/** PeerJS namespaces all peer IDs on its shared public broker, so prefix ours to lower collision odds with unrelated apps. */
const PREFIX = "meet-";

export function generateShortCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${PREFIX}${code}`;
}

export function formatCodeForDisplay(code: string): string {
  const raw = code.startsWith(PREFIX) ? code.slice(PREFIX.length) : code;
  return raw.match(/.{1,3}/g)?.join("-") ?? raw;
}

export function normalizeEnteredCode(input: string): string {
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/^MEET-/i, "")
    .replace(/[^A-Z0-9]/g, "");
  return `${PREFIX}${cleaned}`;
}
