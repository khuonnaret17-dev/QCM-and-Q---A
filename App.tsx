
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Question, AppMode, SelectedQuizInfo, UserRole } from './types';
import { INITIAL_QUESTIONS, SECRET_CODE } from './constants';
import Header from './components/Header';
import AuthSection from './components/AuthSection';
import CreateSection from './components/CreateSection';
import PlaySection from './components/PlaySection';
import QuizGame from './components/QuizGame';
import { initFirebase, syncQuestionsToFirebase, listenToQuestions } from './services/firebaseService';

const App: React.FC = () => {
  const [quizData, setQuizData] = useState<Question[]>([]);
  const [subjectOrder, setSubjectOrder] = useState<{ mcq: string[], short: string[] }>({ mcq: [], short: [] });
  const [mode, setMode] = useState<AppMode>('play');
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [activeQuiz, setActiveQuiz] = useState<SelectedQuizInfo | null>(null);
  
  const [playSubject, setPlaySubject] = useState<string | null>(null);
  const [playType, setPlayType] = useState<'mcq' | 'short'>('mcq');

  const [isInitialized, setIsInitialized] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean | 'error'>(false);

  useEffect(() => {
    initFirebase();
    const saved = localStorage.getItem('quiz_data');
    const savedOrder = localStorage.getItem('subject_order');
    
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) setQuizData(parsed);
      } catch (e) {}
    }
    if (savedOrder) {
      try { setSubjectOrder(JSON.parse(savedOrder)); } catch (e) {}
    }

    const unsubscribe = listenToQuestions(
      (remoteData, remoteOrder) => {
        setQuizData(remoteData);
        if (remoteOrder) setSubjectOrder(remoteOrder);
        
        localStorage.setItem('quiz_data', JSON.stringify(remoteData));
        if (remoteOrder) localStorage.setItem('subject_order', JSON.stringify(remoteOrder));
        
        setIsCloudConnected(true);
        setIsInitialized(true);
      },
      (error) => {
        setIsCloudConnected('error');
        if (!isInitialized) {
          if (quizData.length === 0 && !saved) setQuizData(INITIAL_QUESTIONS);
          setIsInitialized(true);
        }
      }
    );

    const timer = setTimeout(() => { if (!isInitialized) setIsInitialized(true); }, 3000);
    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);

  const handleSyncData = (newData: Question[], newOrder?: { mcq: string[], short: string[] }) => {
    const updatedOrder = newOrder || subjectOrder;
    setQuizData(newData);
    setSubjectOrder(updatedOrder);
    
    localStorage.setItem('quiz_data', JSON.stringify(newData));
    localStorage.setItem('subject_order', JSON.stringify(updatedOrder));
    
    if (userRole === 'admin') {
      syncQuestionsToFirebase(newData, updatedOrder)
        .then(() => setIsCloudConnected(true))
        .catch(() => setIsCloudConnected('error'));
    }
  };

  const handleReorderSubject = (type: 'mcq' | 'short', direction: 'up' | 'down', subjectName: string) => {
    const currentOrder = [...(subjectOrder[type] || [])];
    const index = currentOrder.indexOf(subjectName);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      [currentOrder[index], currentOrder[index - 1]] = [currentOrder[index - 1], currentOrder[index]];
    } else if (direction === 'down' && index < currentOrder.length - 1) {
      [currentOrder[index], currentOrder[index + 1]] = [currentOrder[index + 1], currentOrder[index]];
    }

    handleSyncData(quizData, { ...subjectOrder, [type]: currentOrder });
  };

  const handleAddQuestion = (q: Question) => {
    const newData = [...quizData, { ...q, isActive: q.isActive ?? true }];
    const newOrder = { ...subjectOrder };
    if (!newOrder[q.type].includes(q.subject)) {
      newOrder[q.type] = [...newOrder[q.type], q.subject];
    }
    handleSyncData(newData, newOrder);
  };

  const handleUpdateQuestion = (idx: number, updatedQ: Question) => handleSyncData(quizData.map((q, i) => i === idx ? { ...updatedQ } : q));
  const handleRemoveQuestion = (idx: number) => handleSyncData(quizData.filter((_, i) => i !== idx));
  
  const handleToggleSubject = (sub: string, type: 'mcq' | 'short', active: boolean) => {
    handleSyncData(quizData.map(q => (q.subject === sub && q.type === type) ? { ...q, isActive: active } : q));
  };

  const handleRemoveSubject = (sub: string, type: 'mcq' | 'short') => { 
    const typeText = type === 'mcq' ? 'QCM' : 'Q & A';
    if (confirm(`លុបមុខវិជ្ជា "${sub}" ក្នុងផ្នែក ${typeText}?`)) {
      const newData = quizData.filter(q => !(q.subject === sub && q.type === type));
      const newOrder = { ...subjectOrder, [type]: subjectOrder[type].filter(s => s !== sub) };
      handleSyncData(newData, newOrder); 
    }
  };

  const handleBatchAdd = (qs: Question[]) => {
    const newData = [...quizData, ...qs.map(q => ({ ...q, isActive: q.isActive ?? true }))];
    const newOrder = { ...subjectOrder };
    qs.forEach(q => {
      if (!newOrder[q.type].includes(q.subject)) {
        newOrder[q.type] = [...newOrder[q.type], q.subject];
      }
    });
    handleSyncData(newData, newOrder);
  };

  const handleLogout = () => { setUserRole(null); setPlaySubject(null); setActiveQuiz(null); };
  const handleGoHome = () => { setPlaySubject(null); setActiveQuiz(null); };

  if (!isInitialized) return null;

  if (!userRole) {
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="khmer-decorative-frame text-center animate-fadeIn !py-12">
            <div className="khmer-corner corner-tl"></div><div className="khmer-corner corner-tr"></div>
            <div className="khmer-corner corner-bl"></div><div className="khmer-corner corner-br"></div>
            <h1 className="text-3xl md:text-5xl font-black heading-kh text-maroon py-6 px-4">ប្រព័ន្ធគ្រប់គ្រងសំណួរចម្លើយ</h1>
          </div>
          <AuthSection onLogin={(role) => setUserRole(role)} secretCode={SECRET_CODE} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 md:py-12">
      <div className="max-w-4xl mx-auto">
        <Header mode={mode} role={userRole} totalQuestions={quizData.length} setMode={(m: AppMode) => { setMode(m); setActiveQuiz(null); }} onLogout={handleLogout} />
        <main className="mt-8">
          {mode === 'play' ? (
            activeQuiz ? (
              <QuizGame 
                subject={activeQuiz.subject} 
                partIndex={activeQuiz.partIndex}
                type={activeQuiz.type}
                allSubjectQuestions={quizData.filter(q => q.subject === activeQuiz.subject && q.type === activeQuiz.type)}
                onExit={() => setActiveQuiz(null)}
                onGoHome={handleGoHome}
              />
            ) : (
              <PlaySection 
                quizData={quizData} 
                subjectOrder={subjectOrder}
                selectedSubject={playSubject}
                selectedType={playType}
                onSelectSubject={(s) => setPlaySubject(s)}
                onSelectType={(t) => { setPlayType(t); setPlaySubject(null); }}
                onStartQuiz={(subject, partIndex, type) => setActiveQuiz({ subject, partIndex, type })} 
              />
            )
          ) : (
            <CreateSection 
              quizData={quizData} 
              subjectOrder={subjectOrder}
              onAdd={handleAddQuestion} 
              onUpdate={handleUpdateQuestion} 
              onRemove={handleRemoveQuestion} 
              onToggleSubject={handleToggleSubject} 
              onRemoveSubject={handleRemoveSubject} 
              onReorderSubject={handleReorderSubject}
              onBatchAdd={handleBatchAdd} 
              onLogout={handleLogout} 
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
