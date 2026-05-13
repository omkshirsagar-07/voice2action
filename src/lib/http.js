export async function readJsonResponse(response) {
  let rawBody = "";

  try {
    rawBody = await response.text();
  } catch (_readError) {
    rawBody = "";
  }

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch (_parseError) {
    throw new Error("The server returned an invalid response.");
  }
}

export async function readRequestJson(request) {
  try {
    return await request.json();
  } catch (_parseError) {
    return null;
  }
}

export function getResponseErrorMessage(response, payload, fallbackMessage) {
  if (payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (response.status >= 500) {
    return "The server hit an unexpected error. Please try again.";
  }

  return fallbackMessage;
}

export function createJsonErrorResponse(error, fallbackMessage = "Unexpected server error.", status = 500) {
  let message =
    error && typeof error.message === "string" && error.message.trim()
      ? error.message
      : fallbackMessage;

  return Response.json(
    {
      message,
    },
    { status }
  );
}
