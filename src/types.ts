export interface InterviewQuestion {
  question: string;
  difficulty: 'junior' | 'mid' | 'senior';
}

export interface Topic {
  name: string;
  core_concepts: string[];
  senior_explanation?: string;
  seniorexplanation?: string;
  architecture_patterns: string[];
  integration_patterns: string[];
  performance_considerations: string[];
  security_considerations: string[];
  common_pitfalls: string[];
  realworldexamples?: string[];
  real_world_examples?: string[];
  interview_questions: InterviewQuestion[];
}

export interface KnowledgeBase {
  topics: Topic[];
}

export interface FlatQuestion {
  id: string;
  topicName: string;
  question: string;
  difficulty: string;
  topicContext: string;
}

export interface EvaluationResult {
  score: number;
  reasoning: string;
}

export interface AnswerRecord {
  questionId: string;
  topicName: string;
  question: string;
  difficulty: string;
  userAnswer: string;
  score: number;
  reasoning: string;
}

export interface FinalReport {
  skillMap: { topic: string; score: number }[];
  seniority: string;
  curriculumPath: string;
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
}
