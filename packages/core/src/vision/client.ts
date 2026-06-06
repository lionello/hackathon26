import { getOptionalEnv } from "../env.js";

export async function extractFlyerJsonFromImage(imageUrl: string): Promise<unknown> {
  const baseUrl = getOptionalEnv("VISION_BASE_URL");
  const model = getOptionalEnv("VISION_MODEL");
  const apiKey = getOptionalEnv("VISION_API_KEY");
  if (!baseUrl || !model || !apiKey) {
    throw new Error("Vision client requires VISION_BASE_URL, VISION_MODEL, and VISION_API_KEY");
  }

  const image = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
  if (!image.ok) {
    throw new Error(`Image download failed: ${image.status}`);
  }
  const contentType = image.headers.get("content-type") ?? "image/jpeg";
  const bytes = Buffer.from(await image.arrayBuffer());
  const dataUrl = `data:${contentType};base64,${bytes.toString("base64")}`;

  const response = await fetch(new URL("/chat/completions", baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract supermarket flyer sale items as JSON: {items:[{name,price_text,valid_from,valid_to,image_url,url}]}. Preserve multi-pack text in name." },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ]
    })
  });
  if (!response.ok) {
    throw new Error(`Vision request failed: ${response.status}`);
  }
  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
}
