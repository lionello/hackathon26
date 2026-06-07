import { getOptionalEnv } from "../env.js";

export async function extractFlyerJsonFromImage(
  imageUrl: string,
): Promise<unknown> {
  // The `ai_runner` model provider service injects AI_RUNNER_URL / AI_RUNNER_MODEL.
  // VISION_* are explicit overrides (e.g. pointing at a non-Compose endpoint).
  const baseUrl =
    getOptionalEnv("VISION_BASE_URL") || getOptionalEnv("AI_RUNNER_URL");
  const model =
    getOptionalEnv("VISION_MODEL") || getOptionalEnv("AI_RUNNER_MODEL");
  const apiKey = getOptionalEnv("OPENAI_API_KEY") || "dmr-local";
  if (!baseUrl || !model) {
    throw new Error(
      "Vision client requires a base URL and model (AI_RUNNER_URL/AI_RUNNER_MODEL from the model provider, or VISION_BASE_URL/VISION_MODEL overrides)",
    );
  }

  const image = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
  if (!image.ok) {
    throw new Error(`Image download failed: ${image.status}`);
  }
  const contentType = image.headers.get("content-type") ?? "image/jpeg";
  const bytes = Buffer.from(await image.arrayBuffer());
  const dataUrl = `data:${contentType};base64,${bytes.toString("base64")}`;

  // String-concat (not `new URL("/chat/completions", base)`) — a leading-slash
  // absolute path would drop any base path like `/engines/v1`.
  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract supermarket flyer sale items as JSON: {items:[{name,price_text,valid_from,valid_to,image_url,url}]}. Preserve multi-pack text in name.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`Vision request failed: ${response.status}`);
  }
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
}
