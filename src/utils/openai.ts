import { OpenAIApiRequest, OpenAiApiResponse } from "../types/openai";

export class OpenAI {
  private readonly headers: Record<string, string>;
  private readonly baseUrl = "https://api.openai.com";

  constructor(apiKey: string) {
    this.headers = {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    };
  }

  public async createCompletion({ model, messages }: OpenAIApiRequest) {
    const data = JSON.stringify({
      model,
      messages,
    });
    const apiResp = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: data,
    })
      .then((res): Promise<OpenAiApiResponse> => res.json())
      .catch((err) => {
        console.log(`OpenAI API error: ${err}`);
        return null;
      });
    console.log(`apiResp: ${JSON.stringify(apiResp)}`);
    if (!apiResp) return "";
    return apiResp;
  }
}
