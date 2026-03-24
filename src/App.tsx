import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, CheckCircle, ArrowRight, ShieldAlert, Hexagon, Activity, Archive, Terminal, AlertTriangle, ChevronRight } from 'lucide-react';
import { FlatQuestion, AnswerRecord, FinalReport } from './types';
import { getAllQuestions, getNextQuestion } from './engine/adaptive';
import { evaluateAnswer, generateFinalReport } from './services/gemini';
import { RadarChart } from './components/RadarChart';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import AdminDashboard from './components/AdminDashboard';

type AppState = 'INTRO' | 'ASKING' | 'EVALUATING' | 'GENERATING_REPORT' | 'RESULTS';

export default function App() {
  const [appState, setAppState] = useState<AppState>('INTRO');
  const [questions, setQuestions] = useState<FlatQuestion[]>([]);
  const [askedIds, setAskedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<AnswerRecord[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<FlatQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [logs, setLogs] = useState<{time: string, level: string, msg: string}[]>([]);
  const [userName, setUserName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);

  useEffect(() => {
    setQuestions(getAllQuestions());
    
    const handleHashChange = () => {
      setIsAdminView(window.location.hash === '#admin');
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const addLog = (level: string, msg: string) => {
    setLogs(prev => [...prev, {
      time: new Date().toISOString(),
      level,
      msg
    }]);
  };

  const startAssessment = () => {
    setLogs([]);
    addLog('INFO', 'Initializing test suite: SFCC-SENIOR-EVAL');
    const nextQ = getNextQuestion(questions, askedIds);
    if (nextQ) {
      addLog('INFO', `Loaded module: ${nextQ.topicName}`);
      setCurrentQuestion(nextQ);
      setAskedIds(new Set([nextQ.id]));
      setAppState('ASKING');
    } else {
      addLog('ERROR', 'Knowledge base empty or unreachable.');
      setError('No questions available in the knowledge base.');
    }
  };

  const submitAnswer = async () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    if (userAnswer.trim().toLowerCase() === 'stop') {
      await finishAssessment();
      return;
    }

    setAppState('EVALUATING');
    setError(null);
    addLog('INFO', `Submitting payload for TEST-${String(history.length + 1).padStart(3, '0')}`);
    addLog('DEBUG', 'Awaiting evaluation matrix...');

    try {
      const evaluation = await evaluateAnswer(
        currentQuestion.topicContext,
        currentQuestion.question,
        userAnswer
      );

      addLog('SUCCESS', `Evaluation complete. Score: ${evaluation.score}/10`);

      const record: AnswerRecord = {
        questionId: currentQuestion.id,
        topicName: currentQuestion.topicName,
        question: currentQuestion.question,
        difficulty: currentQuestion.difficulty,
        userAnswer,
        score: evaluation.score,
        reasoning: evaluation.reasoning,
      };

      const newHistory = [...history, record];
      setHistory(newHistory);
      setUserAnswer('');

      const nextQ = getNextQuestion(
        questions,
        askedIds,
        evaluation.score,
        currentQuestion.topicName,
        currentQuestion.difficulty
      );

      if (nextQ) {
        addLog('INFO', `Loading next module: ${nextQ.topicName}`);
        setAskedIds(new Set([...Array.from(askedIds), nextQ.id]));
        setCurrentQuestion(nextQ);
        setAppState('ASKING');
      } else {
        addLog('INFO', 'Test suite exhausted. Initiating final sequence.');
        await finishAssessment(newHistory);
      }
    } catch (err: any) {
      console.error(err);
      addLog('ERROR', 'Evaluation failed. Retrying...');
      setError('Failed to evaluate answer. Please try again.');
      setAppState('ASKING');
    }
  };

  const finishAssessment = async (currentHistory = history) => {
    if (currentHistory.length === 0) {
      setAppState('INTRO');
      return;
    }
    setAppState('GENERATING_REPORT');
    setError(null);
    addLog('INFO', 'Compiling diagnostic report...');
    try {
      const report = await generateFinalReport(currentHistory);
      setFinalReport(report);
      addLog('SUCCESS', 'Report generated successfully.');
      
      addLog('INFO', 'Writing to persistent storage...');
      try {
        await addDoc(collection(db, 'assessments'), {
          timestamp: new Date().toISOString(),
          userName: userName || 'Anonymous',
          history: currentHistory,
          finalReport: report
        });
        addLog('SUCCESS', 'Storage write confirmed.');
      } catch (err) {
        addLog('ERROR', 'Storage write failed.');
        handleFirestoreError(err, OperationType.CREATE, 'assessments');
      }

      setAppState('RESULTS');
    } catch (err: any) {
      console.error(err);
      addLog('ERROR', 'Report generation failed.');
      setError('Failed to generate final report.');
      setAppState('ASKING');
    }
  };

  if (isAdminView) {
    return <AdminDashboard />;
  }

  return (
    <div className="flex h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-60 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-subtle)] hidden md:flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-[var(--color-border-subtle)]">
          <Hexagon className="w-5 h-5 text-[var(--color-accent-cyan)] mr-2" />
          <span className="font-mono font-semibold tracking-wide text-sm">BLUE PANDA</span>
        </div>
        
        <nav className="flex-1 py-4">
          <div className="px-4 mb-2 text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-widest">
            Diagnostics
          </div>
          
          <button 
            onClick={() => appState === 'INTRO' || appState === 'RESULTS' ? setAppState('INTRO') : null}
            className={`w-full flex items-center px-4 py-2 text-sm transition-colors ${appState === 'INTRO' || appState === 'RESULTS' ? 'bg-[var(--color-bg-active)] border-l-2 border-[var(--color-accent-cyan)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] border-l-2 border-transparent'}`}
          >
            <Activity className="w-4 h-4 mr-3" />
            Dashboard
          </button>

          <div className={`w-full flex items-center px-4 py-2 text-sm transition-colors ${appState === 'ASKING' || appState === 'EVALUATING' || appState === 'GENERATING_REPORT' ? 'bg-[var(--color-bg-active)] border-l-2 border-[var(--color-accent-cyan)] text-white' : 'text-[var(--color-text-secondary)] border-l-2 border-transparent'}`}>
            <Terminal className="w-4 h-4 mr-3" />
            Active Test
          </div>
          
          {(appState === 'ASKING' || appState === 'EVALUATING' || appState === 'GENERATING_REPORT') && (
            <div className="pl-11 pr-4 py-1 flex flex-col gap-2 border-l-2 border-[var(--color-accent-cyan)] bg-[var(--color-bg-active)]">
              {history.map((h, i) => (
                <div key={i} className="flex items-center text-xs font-mono text-[var(--color-text-secondary)]">
                  <CheckCircle className="w-3 h-3 mr-2 text-[var(--color-accent-emerald)]" />
                  TEST-{String(i + 1).padStart(3, '0')}
                </div>
              ))}
              <div className="flex items-center text-xs font-mono text-[var(--color-accent-amber)] animate-pulse">
                <ChevronRight className="w-3 h-3 mr-2" />
                TEST-{String(history.length + 1).padStart(3, '0')}
              </div>
            </div>
          )}

          <a href="#admin" className="w-full flex items-center px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] border-l-2 border-transparent transition-colors mt-2">
            <Archive className="w-4 h-4 mr-3" />
            Archives
          </a>
        </nav>

        <div className="p-4 border-t border-[var(--color-border-subtle)] text-[10px] font-mono text-[var(--color-text-muted)] flex items-center justify-between">
          <span>v2.4.1-stable</span>
          <a href="#admin" title="Admin Dashboard" className="hover:text-[var(--color-accent-cyan)] transition-colors">
            <ShieldAlert className="w-3 h-3" />
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-subtle)] flex items-center justify-between px-6">
          <div className="font-mono text-sm text-[var(--color-text-secondary)]">
            {appState === 'INTRO' && 'SYS > READY'}
            {appState === 'ASKING' && `SYS > RUNNING > TEST-${String(history.length + 1).padStart(3, '0')}${userName ? ` [${userName}]` : ''}`}
            {appState === 'EVALUATING' && `SYS > ANALYZING${userName ? ` [${userName}]` : ''}`}
            {appState === 'GENERATING_REPORT' && `SYS > COMPILING${userName ? ` [${userName}]` : ''}`}
            {appState === 'RESULTS' && `SYS > COMPLETE${userName ? ` [${userName}]` : ''}`}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-mono text-[var(--color-text-muted)] tabular-nums">
              {new Date().toISOString()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              
              {/* INTRO STATE */}
              {appState === 'INTRO' && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-[48px] font-bold tracking-tight text-[var(--color-text-primary)] leading-none mb-4">
                      SFCC Diagnostic Suite
                    </h2>
                    <p className="text-[14px] text-[var(--color-text-secondary)] max-w-2xl">
                      This engine executes a rigorous evaluation of architectural reasoning, system depth, and trade-off awareness across core Salesforce B2C Commerce domains.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
                      <div className="text-[12px] font-mono uppercase tracking-widest text-[var(--color-text-secondary)] mb-2">Protocol</div>
                      <div className="text-[14px] text-[var(--color-text-primary)]">Adaptive scaling based on real-time telemetry.</div>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
                      <div className="text-[12px] font-mono uppercase tracking-widest text-[var(--color-text-secondary)] mb-2">Output</div>
                      <div className="text-[14px] text-[var(--color-text-primary)]">Silent evaluation. Comprehensive metrics generated post-run.</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowNameModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)] font-mono text-sm hover:bg-[var(--color-accent-cyan)] hover:text-[#000] transition-colors rounded"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    INITIALIZE SUITE
                  </button>

                  {/* NAME MODAL */}
                  <AnimatePresence>
                    {showNameModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="w-full max-w-md bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-lg shadow-2xl overflow-hidden"
                        >
                          <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--color-text-secondary)] uppercase tracking-widest">
                              <Terminal className="w-4 h-4" />
                              Candidate Identification
                            </div>
                            <button onClick={() => setShowNameModal(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
                              <Square className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="p-6 space-y-4">
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              Please enter your name to initialize the diagnostic suite. This will be recorded in the final evaluation report.
                            </p>
                            <input
                              type="text"
                              value={userName}
                              onChange={(e) => setUserName(e.target.value)}
                              placeholder="Enter your name..."
                              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border-default)] focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)] outline-none rounded p-3 text-sm text-[var(--color-text-primary)] font-mono transition-all"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && userName.trim()) {
                                  setShowNameModal(false);
                                  startAssessment();
                                }
                              }}
                            />
                            <div className="flex justify-end pt-2">
                              <button
                                onClick={() => {
                                  if (userName.trim()) {
                                    setShowNameModal(false);
                                    startAssessment();
                                  }
                                }}
                                disabled={!userName.trim()}
                                className="inline-flex items-center gap-2 px-6 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)] font-mono text-sm hover:bg-[var(--color-accent-cyan)] hover:text-[#000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
                              >
                                PROCEED <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* ASKING STATE */}
              {appState === 'ASKING' && currentQuestion && (
                <motion.div
                  key="asking"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  {/* Test Card Header */}
                  <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[var(--color-accent-amber)] animate-pulse" />
                        <span className="font-mono text-[12px] text-[var(--color-text-secondary)] uppercase tracking-widest">
                          RUNNING
                        </span>
                        <span className="font-mono text-[12px] text-[var(--color-text-primary)]">
                          TEST-{String(history.length + 1).padStart(3, '0')}
                        </span>
                      </div>
                      <div className="font-mono text-[12px] text-[var(--color-text-muted)] tabular-nums">
                        {currentQuestion.topicName}
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)] leading-relaxed">
                        {currentQuestion.question}
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[12px] font-mono text-[var(--color-text-secondary)]">
                          <span>INPUT_REQUIRED</span>
                          <span className={currentQuestion.difficulty === 'senior' ? 'text-[var(--color-accent-amber)]' : 'text-[var(--color-accent-cyan)]'}>
                            LVL: {currentQuestion.difficulty.toUpperCase()}
                          </span>
                        </div>
                        <textarea
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          placeholder="> Enter diagnostic response..."
                          className="w-full h-48 p-4 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] rounded focus:ring-1 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)] outline-none resize-none text-[13px] font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-all"
                          autoFocus
                        />
                        
                        {error && (
                          <div className="flex items-center gap-2 p-3 bg-[var(--color-accent-coral)]/10 border border-[var(--color-accent-coral)]/20 text-[var(--color-accent-coral)] text-[13px] font-mono rounded">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => finishAssessment()}
                            className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                          >
                            <Square className="w-3 h-3" />
                            ABORT
                          </button>
                          
                          <button
                            onClick={submitAnswer}
                            disabled={!userAnswer.trim()}
                            className="inline-flex items-center gap-2 px-6 py-2 bg-[var(--color-text-primary)] hover:bg-white text-black font-mono text-[12px] font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            EXECUTE
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* EVALUATING / GENERATING STATE (LOG CONSOLE) */}
              {(appState === 'EVALUATING' || appState === 'GENERATING_REPORT') && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-lg overflow-hidden flex flex-col h-[400px]"
                >
                  <div className="flex items-center px-4 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-accent-cyan)] animate-pulse" />
                      <span className="font-mono text-[12px] text-[var(--color-text-secondary)] uppercase tracking-widest">
                        SYSTEM LOGS
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-4 overflow-auto font-mono text-[13px] space-y-2">
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="text-[var(--color-text-muted)] tabular-nums shrink-0">
                          {log.time}
                        </span>
                        <span className={`shrink-0 w-20 ${
                          log.level === 'INFO' ? 'text-[var(--color-accent-cyan)]' :
                          log.level === 'WARN' ? 'text-[var(--color-accent-amber)]' :
                          log.level === 'ERROR' ? 'text-[var(--color-accent-coral)]' :
                          log.level === 'SUCCESS' ? 'text-[var(--color-accent-emerald)]' :
                          'text-[var(--color-text-secondary)]'
                        }`}>
                          [{log.level}]
                        </span>
                        <span className="text-[var(--color-text-primary)] break-all">
                          {log.msg}
                        </span>
                      </div>
                    ))}
                    <div className="flex gap-4 animate-pulse">
                      <span className="text-[var(--color-text-muted)] tabular-nums shrink-0">
                        {new Date().toISOString()}
                      </span>
                      <span className="text-[var(--color-text-secondary)] shrink-0 w-20">
                        [WAIT]
                      </span>
                      <span className="text-[var(--color-text-secondary)]">
                        Processing...
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* RESULTS STATE */}
              {appState === 'RESULTS' && finalReport && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-lg p-8 text-center">
                    <div className="text-[12px] font-mono text-[var(--color-text-secondary)] uppercase tracking-widest mb-4">
                      TEST COMPLETE {userName ? `FOR ${userName.toUpperCase()}` : ''}
                    </div>
                    <div className="text-[64px] font-bold text-[var(--color-accent-cyan)] leading-none mb-4 tabular-nums">
                      {finalReport.seniority}
                    </div>
                    <div className="w-32 h-1 bg-[var(--color-border-subtle)] mx-auto mb-4 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-[var(--color-accent-cyan)] w-full" />
                    </div>
                    <div className="text-[14px] text-[var(--color-text-secondary)] font-mono">
                      {history.length} modules evaluated
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-6 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
                      <div className="text-[12px] font-mono text-[var(--color-text-secondary)] uppercase tracking-widest mb-2">
                        Recommended Path
                      </div>
                      <div className="text-[24px] font-semibold text-[var(--color-text-primary)]">
                        {finalReport.curriculumPath}
                      </div>
                    </div>
                    
                    <div className="p-6 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
                      <div className="text-[12px] font-mono text-[var(--color-text-secondary)] uppercase tracking-widest mb-4">
                        Skill Matrix
                      </div>
                      <div className="h-48">
                        <RadarChart data={finalReport.skillMap} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-6 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-accent-emerald)]/20 border-l-2 border-l-[var(--color-accent-emerald)]">
                      <h3 className="text-[12px] font-mono text-[var(--color-text-secondary)] uppercase tracking-widest mb-4">
                        Strengths
                      </h3>
                      <ul className="space-y-3">
                        {finalReport.strengths.map((s, i) => (
                          <li key={i} className="text-[13px] text-[var(--color-text-primary)] flex gap-3">
                            <CheckCircle className="w-4 h-4 text-[var(--color-accent-emerald)] shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-6 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-accent-amber)]/20 border-l-2 border-l-[var(--color-accent-amber)]">
                      <h3 className="text-[12px] font-mono text-[var(--color-text-secondary)] uppercase tracking-widest mb-4">
                        Areas for Growth
                      </h3>
                      <ul className="space-y-3">
                        {finalReport.weaknesses.map((w, i) => (
                          <li key={i} className="text-[13px] text-[var(--color-text-primary)] flex gap-3">
                            <AlertTriangle className="w-4 h-4 text-[var(--color-accent-amber)] shrink-0 mt-0.5" />
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
                    <h3 className="text-[12px] font-mono text-[var(--color-text-secondary)] uppercase tracking-widest mb-4">
                      Execution Plan
                    </h3>
                    <ul className="space-y-4">
                      {finalReport.nextSteps.map((step, i) => (
                        <li key={i} className="flex gap-4 text-[13px] text-[var(--color-text-primary)]">
                          <span className="font-mono text-[var(--color-accent-cyan)] shrink-0">
                            [{String(i + 1).padStart(2, '0')}]
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-start pt-4">
                    <button
                      onClick={() => {
                        setHistory([]);
                        setAskedIds(new Set());
                        setAppState('INTRO');
                      }}
                      className="inline-flex items-center gap-2 px-6 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] hover:border-[var(--color-border-focus)] text-[var(--color-text-primary)] font-mono text-[12px] rounded transition-colors"
                    >
                      <Square className="w-3 h-3" />
                      RESET SUITE
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="h-12 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--color-text-muted)]">
            <Hexagon className="w-3 h-3" />
            <span>POWERED BY <a href="https://www.bluepanda.in" target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] transition-colors">BLUE PANDA</a></span>
          </div>
          <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-widest">
            Responsible Infrastructure & Applied AI
          </div>
        </footer>
      </div>
    </div>
  );
}
