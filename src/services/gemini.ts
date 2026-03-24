import { GoogleGenAI, Type } from '@google/genai';
import { AnswerRecord, EvaluationResult, FinalReport } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function evaluateAnswer(
  topicContext: string,
  question: string,
  userAnswer: string
): Promise<EvaluationResult> {
  const prompt = `
You are an expert Salesforce B2C Commerce (SFCC) technical evaluator.
Evaluate the user's answer to the following question based on the provided topic context.

Topic Context:
${topicContext}

Question:
${question}

User's Answer:
${userAnswer}

Evaluate the answer silently using:
- correctness
- depth
- clarity
- architectural reasoning
- awareness of trade-offs

Return a JSON object with:
1. "score": A number from 0 to 10.
2. "reasoning": A brief internal explanation of why you gave this score.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
        },
        required: ['score', 'reasoning'],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Failed to evaluate answer');
  }

  return JSON.parse(text) as EvaluationResult;
}

export async function generateFinalReport(
  history: AnswerRecord[]
): Promise<FinalReport> {
  const historyText = history
    .map(
      (h, i) =>
        `Q${i + 1} (${h.topicName} - ${h.difficulty}): ${h.question}\nUser Answer: ${h.userAnswer}\nScore: ${h.score}/10\nReasoning: ${h.reasoning}`
    )
    .join('\n\n');

  const prompt = `
You are a Senior SFCC Assessor. Based on the user's performance history, generate a final assessment report.

Performance History:
${historyText}

Output a JSON object with the following structure:
- "skillMap": An array of objects with "topic" (string) and "score" (number 0-10). Include all topics tested.
- "seniority": A string classification ("Junior", "Mid", or "Senior").
- "curriculumPath": A string recommendation ("8-week", "12-week", or "15-week").
- "strengths": An array of strings (max 3).
- "weaknesses": An array of strings (max 3).
- "nextSteps": An array of strings (max 3).
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          skillMap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                score: { type: Type.NUMBER },
              },
              required: ['topic', 'score'],
            },
          },
          seniority: { type: Type.STRING },
          curriculumPath: { type: Type.STRING },
          strengths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          weaknesses: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          nextSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'skillMap',
          'seniority',
          'curriculumPath',
          'strengths',
          'weaknesses',
          'nextSteps',
        ],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Failed to generate report');
  }

  return JSON.parse(text) as FinalReport;
}
