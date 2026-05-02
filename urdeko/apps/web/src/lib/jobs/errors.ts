const IA_UNAVAILABLE_MESSAGE =
  "Le service IA est temporairement indisponible. Notre équipe a été notifiée, réessaie dans quelques instants.";

const IA_QUOTA_MESSAGE =
  "Le service IA est momentanément surchargé. Réessaie dans quelques minutes.";

const GENERIC_JOB_MESSAGE =
  "Une erreur est survenue pendant le traitement. Réessaie dans quelques instants.";

const sensitivePatterns = [
  /api\s*key/i,
  /permission_denied/i,
  /unauthenticated/i,
  /forbidden/i,
  /credential/i,
  /secret/i,
  /token/i,
  /gemini/i,
  /google/i,
];

export function publicJobError(error: unknown, fallback = GENERIC_JOB_MESSAGE): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!message) return fallback;

  if (/quota|rate.?limit|429|resource_exhausted/i.test(message)) {
    return IA_QUOTA_MESSAGE;
  }

  if (/403|401|leaked/i.test(message) || sensitivePatterns.some((pattern) => pattern.test(message))) {
    return IA_UNAVAILABLE_MESSAGE;
  }

  if (message.length > 220 || /^[{[]/.test(message.trim())) {
    return fallback;
  }

  return message;
}
