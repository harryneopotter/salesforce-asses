import kbData from '../data/kb.json';
import { FlatQuestion, KnowledgeBase } from '../types';

const kb = kbData as KnowledgeBase;

export function getAllQuestions(): FlatQuestion[] {
  const questions: FlatQuestion[] = [];
  kb.topics.forEach((topic, tIndex) => {
    const context = `
Topic: ${topic.name}
Core Concepts: ${topic.core_concepts.join(' ')}
Explanation: ${topic.senior_explanation || topic.seniorexplanation || ''}
Architecture Patterns: ${topic.architecture_patterns.join(' ')}
Integration Patterns: ${topic.integration_patterns.join(' ')}
Performance Considerations: ${topic.performance_considerations.join(' ')}
Security Considerations: ${topic.security_considerations.join(' ')}
Common Pitfalls: ${topic.common_pitfalls.join(' ')}
`;
    topic.interview_questions.forEach((q, qIndex) => {
      questions.push({
        id: `t${tIndex}-q${qIndex}`,
        topicName: topic.name,
        question: q.question,
        difficulty: q.difficulty,
        topicContext: context.trim(),
      });
    });
  });
  return questions;
}

export function getNextQuestion(
  allQuestions: FlatQuestion[],
  askedIds: Set<string>,
  lastScore?: number,
  lastTopic?: string,
  lastDifficulty?: string
): FlatQuestion | null {
  const available = allQuestions.filter((q) => !askedIds.has(q.id));
  if (available.length === 0) return null;

  // First question
  if (lastScore === undefined) {
    // Start with a mid-level question from a random topic
    const midQuestions = available.filter((q) => q.difficulty === 'mid');
    if (midQuestions.length > 0) {
      return midQuestions[Math.floor(Math.random() * midQuestions.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  // Adaptive logic
  if (lastScore >= 7) {
    // Answered well -> increase difficulty or move to deeper topic
    if (lastDifficulty === 'mid' || lastDifficulty === 'junior') {
      // Try senior in same topic
      const seniorSameTopic = available.filter(
        (q) => q.topicName === lastTopic && q.difficulty === 'senior'
      );
      if (seniorSameTopic.length > 0) return seniorSameTopic[Math.floor(Math.random() * seniorSameTopic.length)];
    }
    // Move to a new topic at senior or mid
    const seniorOther = available.filter((q) => q.difficulty === 'senior' && q.topicName !== lastTopic);
    if (seniorOther.length > 0) return seniorOther[Math.floor(Math.random() * seniorOther.length)];
    const midOther = available.filter((q) => q.difficulty === 'mid' && q.topicName !== lastTopic);
    if (midOther.length > 0) return midOther[Math.floor(Math.random() * midOther.length)];
  } else {
    // Struggled -> reduce difficulty or switch topics
    if (lastDifficulty === 'senior') {
      // Try mid in same topic
      const midSameTopic = available.filter(
        (q) => q.topicName === lastTopic && q.difficulty === 'mid'
      );
      if (midSameTopic.length > 0) return midSameTopic[Math.floor(Math.random() * midSameTopic.length)];
    }
    // Move to a new topic at mid or junior
    const midOther = available.filter((q) => q.difficulty === 'mid' && q.topicName !== lastTopic);
    if (midOther.length > 0) return midOther[Math.floor(Math.random() * midOther.length)];
    const juniorOther = available.filter((q) => q.difficulty === 'junior' && q.topicName !== lastTopic);
    if (juniorOther.length > 0) return juniorOther[Math.floor(Math.random() * juniorOther.length)];
  }

  // Fallback: just pick a random available question
  return available[Math.floor(Math.random() * available.length)];
}
