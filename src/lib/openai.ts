import OpenAI from "openai";

function initializeOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    return new Response("Missing OPENAI_API_KEY - make sure to add it to your .env file.", { status: 400 });
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  });
}

export { initializeOpenAI };

