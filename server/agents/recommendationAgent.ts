import { db } from "../src/db.js";

export const recommendationAgent = {
  name: "Recommendation Agent",
  description: "Selects the best products from the catalog based on intent.",
  run: async (intentJson: string): Promise<string[]> => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set on the server.");

    const products = db.prepare("SELECT id, name, price_usd, rating, description FROM products").all() as any[];
    
    // Build product list for the LLM
    const productList = products.map((p, i) =>
      `${i + 1}. ID: ${p.id} | "${p.name}" | $${p.price_usd} USDC | rated ${p.rating} | ${p.description.slice(0, 80)}...`
    ).join("\n");

    const intent = JSON.parse(intentJson);

    const specificBookInstruction = intent.specificBook
      ? `\nIMPORTANT: The user asked for a specific book: "${intent.specificBook}". Select ONLY that exact book by matching its name. Do NOT add any other books.`
      : `\nIMPORTANT: Select EXACTLY ${intent.maxBooks} book(s) at most. Do NOT exceed this number. Prioritize relevance to the user's topics.`;

    const systemPrompt = `
      You are an AI shopping recommendation agent.
      Analyze the catalog and the user's intent.
      Select books that match the user's request without exceeding the intent budget.
      Never recommend more than ${intent.maxBooks} book(s).
      Return strictly a JSON array of selected product IDs. Example: ["ebook-001"]
      Output ONLY the raw JSON array.
      
      User Intent:
      ${intentJson}
      ${specificBookInstruction}
      
      Available Products:
      ${productList}
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const text = data.choices?.[0]?.message?.content?.trim() || "[]";
    
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr) as string[];
  }
};
