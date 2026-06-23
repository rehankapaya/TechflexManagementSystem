import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API by fetching the key from localStorage
export const getGeminiAPI = () => {
  const apiKey = localStorage.getItem('IIC_GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('Gemini API Key is not set. Please set it in the IIC Settings.');
  }
  return new GoogleGenerativeAI(apiKey);
};

const MODEL_FALLBACKS = [
  "gemini-2.5-flash", // Future-proofing
  "gemini-2.0-flash", // Current latest fast model
  "gemini-2.0-flash-lite", // Extremely fast backup
  "gemini-1.5-flash", // Standard stable flash
  "gemini-1.5-flash-8b", // High throughput backup
  "gemini-1.5-pro" // Heavy lifter
];

const executeWithFallback = async (genAI, prompt) => {
  let lastError;
  for (const modelName of MODEL_FALLBACKS) {
    try {
      console.log(`Attempting AI generation with model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.warn(`Model ${modelName} failed:`, error.message);
      lastError = error;
      // If the API key itself is completely invalid, don't keep trying
      if (error.message.includes('API key not valid')) {
        throw error;
      }
    }
  }
  throw new Error(`All AI models failed. Last error: ${lastError.message}`);
};

export const generateAIRecommendations = async (contextData) => {
  try {
    const genAI = getGeminiAPI();
    const prompt = `You are a strategic AI data analyst and executive advisor for an educational institution.
Analyze the following data and provide exactly 3 highly actionable, short, and punchy recommendations to improve admissions, revenue, and student retention. 

CRITICAL RULES:
- Keep the entire response extremely brief (under 150 words total).
- Each recommendation must be a single, concise bullet point (maximum 2 sentences).
- Do NOT include long introductory or concluding paragraphs.
- Format the output beautifully using markdown with emojis.

Institution Data Context:
${JSON.stringify(contextData, null, 2)}
`;

    return await executeWithFallback(genAI, prompt);
  } catch (error) {
    console.error("Error generating recommendations:", error);
    throw error;
  }
};

export const askAIAssistant = async (query, contextData) => {
  try {
    const genAI = getGeminiAPI();
    const prompt = `You are the primary AI Assistant for the "Institution Intelligence Center" (IIC) module in an educational portal. Your job is to help administrators understand their data, find trends, and manage their institution more effectively.
Answer the user's query thoughtfully based on the data provided below. Provide actionable advice and clear insights. If the data explicitly lacks the answer, explain what data is available and try to provide the closest relevant insight instead of just refusing. Use markdown for readability.

Institution Data Context:
${JSON.stringify(contextData, null, 2)}

User Query: ${query}
`;

    return await executeWithFallback(genAI, prompt);
  } catch (error) {
    console.error("Error asking AI assistant:", error);
    throw error;
  }
};
