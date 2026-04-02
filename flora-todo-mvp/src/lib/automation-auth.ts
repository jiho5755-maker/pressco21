import { getEnv } from "@/src/lib/env";

function readProvidedAutomationKey(request: Request) {
  const bearer = request.headers.get("authorization");

  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice(7).trim();
  }

  return request.headers.get("x-flora-automation-key")?.trim() ?? "";
}

export function isAutomationRequestAuthorized(request: Request) {
  const expected = getEnv().automationApiKey;
  const provided = readProvidedAutomationKey(request);
  return Boolean(provided) && provided === expected;
}

export function buildAutomationUnauthorizedResponse() {
  return Response.json(
    {
      ok: false,
      error: "Unauthorized",
    },
    { status: 401 },
  );
}
