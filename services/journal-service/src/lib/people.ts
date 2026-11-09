// Read-only helpers that resolve user ids to display names (iam.users).
export const NAME = (col: string) =>
  `(SELECT first_name || ' ' || last_name FROM iam.users WHERE id = ${col})`;
