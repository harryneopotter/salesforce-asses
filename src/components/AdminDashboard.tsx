import React, { useEffect, useState } from 'react';
import { db, auth, loginWithGoogle, logout, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { AnswerRecord, FinalReport } from '../types';
import { ShieldAlert, LogOut, ArrowLeft, Loader2, Calendar, Hexagon, ChevronRight } from 'lucide-react';
import { RadarChart } from './RadarChart';

interface AssessmentResult {
  id: string;
  timestamp: string;
  userName?: string;
  history: AnswerRecord[];
  finalReport: FinalReport;
}

export default function AdminDashboard() {
  const [user, setUser] = useState(auth.currentUser);
  const [assessments, setAssessments] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (!u) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(collection(db, 'assessments'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: AssessmentResult[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as AssessmentResult);
      });
      setAssessments(results);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error(err);
      if (err.message.includes('Missing or insufficient permissions')) {
        setError("You do not have permission to view this data. Make sure you are logged in with the admin email.");
      } else {
        setError("Failed to load assessments.");
      }
      setLoading(false);
      handleFirestoreError(err, OperationType.GET, 'assessments');
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/30 to-transparent blur-3xl rounded-full mix-blend-screen" />
        </div>
        
        <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-6 relative z-10 shadow-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <ShieldAlert className="w-8 h-8 text-blue-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
            <p className="text-zinc-400">Sign in with your admin Google account to view assessment results.</p>
          </div>
          <button
            onClick={loginWithGoogle}
            className="w-full py-3 px-4 bg-white hover:bg-zinc-200 text-zinc-950 font-medium rounded-xl transition-colors"
          >
            Sign in with Google
          </button>
          <div className="pt-4 border-t border-zinc-800">
            <a href="#" onClick={() => window.location.hash = ''} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Return to Assessment
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (selectedAssessment) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/30 to-transparent blur-3xl rounded-full mix-blend-screen" />
        </div>

        <header className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedAssessment(null)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="font-semibold tracking-tight">Assessment Details: {selectedAssessment.userName || 'Anonymous'}</h1>
            </div>
            <div className="text-sm text-zinc-500 font-mono">
              {new Date(selectedAssessment.timestamp).toLocaleString()}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-12 space-y-12 flex-grow w-full relative z-10">
          {/* Summary Section */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg">
              <div className="text-sm font-mono text-zinc-500 mb-2 uppercase tracking-wider">Classification</div>
              <div className="text-3xl font-semibold text-blue-400">{selectedAssessment.finalReport.seniority}</div>
            </div>
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg">
              <div className="text-sm font-mono text-zinc-500 mb-2 uppercase tracking-wider">Recommended Path</div>
              <div className="text-3xl font-semibold text-white">{selectedAssessment.finalReport.curriculumPath}</div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg space-y-6">
            <h3 className="text-lg font-medium text-white">Skill Map</h3>
            <RadarChart data={selectedAssessment.finalReport.skillMap} />
          </div>

          {/* Detailed Log */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Detailed Assessment Log</h3>
            {selectedAssessment.history.map((record, i) => (
              <div key={i} className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 space-y-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                    <span>Q{i + 1}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    <span>{record.topicName}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    <span className={record.difficulty === 'senior' ? 'text-amber-400' : 'text-blue-400'}>
                      {record.difficulty}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-400">
                    {record.score}/10
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-zinc-500 mb-1">Question</div>
                  <div className="text-zinc-200 font-medium">{record.question}</div>
                </div>
                
                <div>
                  <div className="text-sm text-zinc-500 mb-1">Candidate's Answer</div>
                  <div className="text-zinc-300 bg-zinc-950 p-4 rounded-xl border border-zinc-800/50 whitespace-pre-wrap">
                    {record.userAnswer}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-zinc-500 mb-1">AI Evaluation Reasoning</div>
                  <div className="text-zinc-400 italic">
                    {record.reasoning}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        <footer className="mt-auto border-t border-zinc-800/50 bg-zinc-950/50 py-6 relative z-10">
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Hexagon className="w-4 h-4" />
              <span>Powered by <a href="https://www.bluepanda.in" target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-blue-400 transition-colors font-medium">Blue Panda</a></span>
            </div>
            <div className="text-zinc-600 text-xs">
              Responsible Infrastructure & Applied AI
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/30 to-transparent blur-3xl rounded-full mix-blend-screen" />
      </div>

      <header className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <ShieldAlert className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="font-semibold tracking-tight">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">{user.email}</span>
            <button 
              onClick={logout}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <a href="#" onClick={() => window.location.hash = ''} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white" title="Return to App">
              <Hexagon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 flex-grow w-full relative z-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Completed Assessments</h2>
            <div className="text-sm text-zinc-500">
              Total: {assessments.length}
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : assessments.length === 0 && !error ? (
            <div className="text-center py-20 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
              <p className="text-zinc-400">No assessments have been completed yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {assessments.map((assessment) => (
                <button
                  key={assessment.id}
                  onClick={() => setSelectedAssessment(assessment)}
                  className="flex items-center justify-between p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-colors text-left group shadow-sm hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-white">
                        {assessment.userName || 'Anonymous'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-mono border border-blue-500/20">
                        {assessment.finalReport.seniority}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-xs font-mono text-zinc-400">
                        {assessment.history.length} Questions
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(assessment.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 rounded-full bg-zinc-800 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="mt-auto border-t border-zinc-800/50 bg-zinc-950/50 py-6 relative z-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Hexagon className="w-4 h-4" />
            <span>Powered by <a href="https://www.bluepanda.in" target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-blue-400 transition-colors font-medium">Blue Panda</a></span>
          </div>
          <div className="text-zinc-600 text-xs">
            Responsible Infrastructure & Applied AI
          </div>
        </div>
      </footer>
    </div>
  );
}
