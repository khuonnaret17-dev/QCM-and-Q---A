
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client using the environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates quiz questions based on a subject and type using Gemini.
 * Uses gemini-3-pro-preview for complex Khmer language generation tasks as recommended for complex text tasks.
 */
export const generateQuizQuestions = async (subject: string, type: 'mcq' | 'short') => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY is not configured, skipping AI generation.");
    return [];
  }

  const prompt = `You are an expert educator specializing in Cambodian civil service exams. 
  Generate 10 high-quality quiz questions about the subject "${subject}" in Khmer language.
  
  For type "mcq" (Multiple Choice Questions):
  - Provide exactly 4 options for each question.
  - Indicate the correct option with a 0-based index (0-3).
  
  For type "short" (Short Answer Questions):
  - Provide a clear question and a concise correct answer text.
  
  Return the result as a JSON array of objects following the quiz question schema.`;

  try {
    // Calling generateContent with the gemini-3-pro-preview model as per guidelines for complex text tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              question: { type: Type.STRING },
              type: { 
                type: Type.STRING,
                description: "The type of question: 'mcq' or 'short'"
              },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Required for mcq, exactly 4 strings."
              },
              correct: { 
                type: Type.NUMBER,
                description: "Required for mcq, 0-3 index."
              },
              answer: { 
                type: Type.STRING,
                description: "Required for short, the correct answer text."
              },
              isActive: { type: Type.BOOLEAN }
            },
            required: ["subject", "question", "type"],
            propertyOrdering: ["subject", "question", "type", "options", "correct", "answer", "isActive"]
          }
        }
      }
    });

    // Accessing .text property directly as per SDK guidelines (property, not a method).
    const jsonStr = response.text?.trim() || '';
    if (!jsonStr) return [];
    
    const parsed = JSON.parse(jsonStr);
    return parsed.map((q: any) => ({
      ...q,
      subject: q.subject || subject,
      isActive: q.isActive ?? true
    }));
  } catch (error) {
    console.error("Error generating quiz questions via Gemini:", error);
    return [];
  }
};
