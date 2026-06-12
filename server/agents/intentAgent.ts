export interface IntentOutput {
  topics: string[];
  level: string;
  budget: number;
  maxBooks: number;
  specificBook?: string;
}

export const intentAgent = {
  name: "Intent Agent",
  description: "Parses user natural language into structured shopping intent.",
  run: async (prompt: string): Promise<IntentOutput> => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set on the server.");

    const systemPrompt = `
      Extract shopping intent from the user's prompt.
      Return strictly a JSON object matching: { "topics": string[], "level": string, "budget": number, "maxBooks": number, "specificBook": string | null }.
      "specificBook" should be the exact book name if the user asks for a specific book by name, otherwise null.
      If the user mentions a specific book name, set maxBooks to 1 and set budget to match that book's price if mentioned.
      If budget isn't specified, default to 30. If maxBooks isn't specified, default to 3. If the user asks for a specific book by name, always set maxBooks to 1.
      Output ONLY the raw JSON object.
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
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const text = data.choices?.[0]?.message?.content?.trim() || "{}";
    
    // Clean up markdown code blocks if any
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr) as IntentOutput;
  }
};
