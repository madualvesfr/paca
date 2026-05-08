import type { ZodIssue } from "zod";

type Validation = {
  amountPositive: string;
  descriptionRequired: string;
  descriptionTooLong: string;
  categoryInvalid: string;
  dateInvalid: string;
  nameRequired: string;
  nameTooLong: string;
  urlInvalid: string;
  emailInvalid: string;
  passwordTooShort: string;
  inviteCodeInvalid: string;
  monthInvalid: string;
  dayInvalid: string;
  generic: string;
};

/**
 * Translate a Zod issue to a localized message. The validation schemas in
 * @paca/shared ship with Portuguese fallback strings; this maps the issue's
 * field path + error code to the matching i18n key so users see the message
 * in their own language.
 */
export function localizeZodError(
  err: ZodIssue,
  v: Validation
): string {
  const path = String(err.path[0] ?? "");
  const code = err.code;

  if (path === "amount") return v.amountPositive;
  if (path === "description" && code === "too_small") return v.descriptionRequired;
  if (path === "description" && code === "too_big") return v.descriptionTooLong;
  if (path === "category_id") return v.categoryInvalid;
  if (path === "date") return v.dateInvalid;
  if (path === "display_name" && code === "too_small") return v.nameRequired;
  if (path === "display_name" && code === "too_big") return v.nameTooLong;
  if (path === "avatar_url") return v.urlInvalid;
  if (path === "email") return v.emailInvalid;
  if (path === "password") return v.passwordTooShort;
  if (path === "invite_code" || path === "code") return v.inviteCodeInvalid;
  if (path === "month") return v.monthInvalid;
  if (path === "due_day") return v.dayInvalid;

  return v.generic;
}
