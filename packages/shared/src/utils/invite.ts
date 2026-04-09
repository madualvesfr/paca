import { INVITE_CODE_PREFIX, INVITE_CODE_LENGTH } from "../constants/categories";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `${INVITE_CODE_PREFIX}-${code}`;
}

export function isValidInviteCode(code: string): boolean {
  const pattern = new RegExp(
    `^${INVITE_CODE_PREFIX}-[A-HJ-NP-Z2-9]{${INVITE_CODE_LENGTH}}$`
  );
  return pattern.test(code.toUpperCase());
}

export function normalizeInviteCode(code: string): string {
  return code.toUpperCase().trim();
}
