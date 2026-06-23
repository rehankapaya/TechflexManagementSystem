export const getGroqAPIKey = () => {
  const apiKey = localStorage.getItem('IIC_GROQ_API_KEY') || import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API Key is not set. Please set it in the IIC header or .env file.');
  }
  return apiKey.trim();
};

const executeWithGroq = async (apiKey, prompt) => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Groq API Error: ${response.status} ${errorData?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

export const generateAIRecommendations = async (contextData) => {
  try {
    const apiKey = getGroqAPIKey();
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

    return await executeWithGroq(apiKey, prompt);
  } catch (error) {
    console.error("Error generating recommendations:", error);
    throw error;
  }
};

export const askAIAssistant = async (query, contextData) => {
  try {
    const apiKey = getGroqAPIKey();
    const prompt = `You are the primary AI Assistant for the "Institution Intelligence Center" (IIC) module in an educational portal. Your job is to help administrators understand their data, find trends, and manage their institution more effectively.
Answer the user's query thoughtfully based on the data provided below. Provide actionable advice and clear insights. If the data explicitly lacks the answer, explain what data is available and try to provide the closest relevant insight instead of just refusing. Use markdown for readability.

Institution Data Context:
${JSON.stringify(contextData, null, 2)}

User Query: ${query}
`;

    return await executeWithGroq(apiKey, prompt);
  } catch (error) {
    console.error("Error asking AI assistant:", error);
    throw error;
  }
};

export const generateMarketingPlan = async (contextData) => {
  try {
    const apiKey = getGroqAPIKey();
    const prompt = `You are an expert Social Media Manager and Marketing Strategist for an educational institution.
Your goal is to increase admissions and drive social media engagement using the institution's current active courses.

Using the provided data about the institution's courses and students, generate a comprehensive 7-day daily posting schedule.

CRITICAL RULES:
- Focus on the active courses and areas needing admission boosts.
- Target the right audience for each course.
- Provide everything A to Z for each post including: 
  - Day & Topic
  - Target Audience
  - Visual Design Idea (describe what the graphic/video should look like)
  - AI Image Generation Prompt (a highly detailed Midjourney/DALL-E prompt to generate the design)
  - Full Post Caption
  - Hashtags
- Use clean Markdown formatting with headers (### Day 1: [Topic]), bold text, and bullet points.
- Do not add conversational fluff before or after the plan.

Institution Data Context:
${JSON.stringify(contextData, null, 2)}
`;

    return await executeWithGroq(apiKey, prompt);
  } catch (error) {
    console.error("Error generating marketing plan:", error);
    throw error;
  }
};
