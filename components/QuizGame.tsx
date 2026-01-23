
import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Question, QuizState } from '../types';

interface QuizGameProps {
  subject: string;
  partIndex: number;
  type: 'mcq' | 'short';
  allSubjectQuestions: Question[];
  onExit: () => void;
}

const QuizGame: React.FC<QuizGameProps> = ({ subject, partIndex, type, allSubjectQuestions, onExit }) => {
  const KHMER_PREFIXES = ['ក', 'ខ', 'គ', 'ឃ'];
  const SOUND_URLS = {
    correct: 'https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3',
    wrong: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3',
    reveal: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
  };

  const [isMuted, setIsMuted] = useState(false);
  const [shakeIndex, setShakeIndex] = useState<number | null>(null);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const wrongAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    correctAudioRef.current = new Audio(SOUND_URLS.correct);
    wrongAudioRef.current = new Audio(SOUND_URLS.wrong);
    return () => {
      correctAudioRef.current?.pause();
      wrongAudioRef.current?.pause();
    };
  }, []);

  const partQuestions = useMemo(() => {
    const start = partIndex * 10;
    const subset = allSubjectQuestions.filter(q => q.type === type).slice(start, start + 10);
    
    if (type === 'mcq') {
      return subset.map((q: Question) => {
        if (q.options) {
          const opts = q.options.map((opt, idx) => ({ text: opt, isCorrect: idx === q.correct }));
          const shuffled = [...opts].sort(() => Math.random() - 0.5);
          return { ...q, options: shuffled.map(o => o.text), correct: shuffled.findIndex(o => o.isCorrect) };
        }
        return q;
      }).sort(() => Math.random() - 0.5);
    }
    // For short answer, keep the original order for easier studying
    return subset;
  }, [allSubjectQuestions, partIndex, type]);

  const [state, setState] = useState<QuizState>({
    currentQuestionIndex: 0,
    score: 0,
    isFinished: false,
    selectedAnswer: null,
    userInput: '',
    showCorrect: false,
    userAnswers: [],
    isReviewing: false
  });

  const playSound = (t: 'correct' | 'wrong') => {
    if (isMuted) return;
    const audio = t === 'correct' ? correctAudioRef.current : wrongAudioRef.current;
    if (audio) { 
      audio.currentTime = 0; 
      audio.play().catch(() => {}); 
    }
  };

  const handleMCQSelect = (idx: number) => {
    if (state.selectedAnswer !== null || state.isFinished) return;
    const isCorrect = idx === partQuestions[state.currentQuestionIndex].correct;
    
    if (isCorrect) playSound('correct');
    else { playSound('wrong'); setShakeIndex(idx); setTimeout(() => setShakeIndex(null), 500); }

    setState(prev => ({
      ...prev,
      selectedAnswer: idx,
      showCorrect: true,
      score: isCorrect ? prev.score + 1 : prev.score,
      userAnswers: [...prev.userAnswers, idx]
    }));
  };

  const handleNext = () => {
    if (state.currentQuestionIndex + 1 < partQuestions.length) {
      setState(prev => ({ 
        ...prev, 
        currentQuestionIndex: prev.currentQuestionIndex + 1, 
        selectedAnswer: null, 
        userInput: '', 
        showCorrect: false 
      }));
    } else setState(prev => ({ ...prev, isFinished: true }));
  };

  // Short Answer List View
  if (type === 'short') {
    return (
      <div className="animate-fadeIn space-y-6">
        {/* Header for List View */}
        <div className="glass-card rounded-[2.5rem] p-6 md:p-8 flex items-center justify-between border border-white/50">
          <div className="flex items-center gap-4">
            <button onClick={onExit} className="w-12 h-12 flex items-center justify-center bg-maroon/5 text-maroon rounded-2xl hover:bg-maroon hover:text-white transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-black heading-kh text-maroon">{subject}</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">ភាគទី {partIndex + 1} - កម្រងសំណួរចម្លើយខ្លីៗ</p>
            </div>
          </div>
          <div className="hidden sm:block bg-maroon text-white px-5 py-2 rounded-full font-black text-xs uppercase shadow-lg shadow-maroon/20">
            សរុប៖ {partQuestions.length} សំណួរ
          </div>
        </div>

        {/* The List */}
        <div className="space-y-6 pb-20">
          {partQuestions.map((q, idx) => (
            <div key={idx} className="glass-card rounded-[2.5rem] p-8 md:p-10 border border-white/60 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1">
              <div className="flex gap-4 items-start mb-6">
                <span className="shrink-0 w-10 h-10 bg-maroon text-white flex items-center justify-center rounded-xl font-black text-sm">
                  {idx + 1}
                </span>
                <h3 className="text-lg md:text-xl font-bold heading-kh text-maroon leading-relaxed">
                  {q.question}
                </h3>
              </div>
              <div className="bg-green-50/50 border-2 border-green-500/20 rounded-3xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                </div>
                <div className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-3 heading-kh">ចម្លើយ ៖</div>
                <div className="text-gray-800 leading-loose small-kh font-medium text-base md:text-lg">
                  {q.answer}
                </div>
              </div>
            </div>
          ))}

          {/* Bottom Back Button */}
          <div className="flex justify-center pt-6">
            <button onClick={onExit} className="bg-maroon text-white font-black px-12 py-5 rounded-[2rem] shadow-2xl shadow-maroon/30 hover:scale-105 transition-all heading-kh text-lg">
              ត្រឡប់ទៅបញ្ជីភាគវិញ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MCQ Game Logic
  if (state.isReviewing) {
    return (
      <div className="glass-card rounded-[2.5rem] p-6 md:p-10 animate-fadeIn border-2 border-maroon/20 flex flex-col h-[85vh]">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-black heading-kh text-maroon">ពិនិត្យឡើងវិញ 👁️</h2>
          <button onClick={() => setState(prev => ({ ...prev, isReviewing: false }))} className="bg-maroon text-white px-6 py-2 rounded-full font-bold">ត្រឡប់ក្រោយ</button>
        </div>
        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-8">
          {partQuestions.map((q, qIdx) => (
            <div key={qIdx} className="bg-white/50 p-6 rounded-3xl border border-gray-100">
              <h4 className="font-bold mb-4 heading-kh text-maroon flex gap-3">
                <span className="shrink-0 bg-maroon/10 w-8 h-8 flex items-center justify-center rounded-lg">{qIdx + 1}</span>
                {q.question}
              </h4>
              <div className="grid gap-2">
                {q.options?.map((opt, oIdx) => {
                  const isCorrect = oIdx === q.correct;
                  const isUserChoice = oIdx === state.userAnswers[qIdx];
                  return (
                    <div key={oIdx} className={`p-3 rounded-xl border flex items-center gap-3 text-sm ${isCorrect ? 'bg-green-50 border-green-500 font-bold' : isUserChoice ? 'bg-red-50 border-red-500' : 'bg-white border-gray-100 opacity-60'}`}>
                      <span className="w-5">{KHMER_PREFIXES[oIdx]}.</span>
                      <span className="flex-1">{opt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (state.isFinished) {
    const percentage = Math.round((state.score / partQuestions.length) * 100);
    return (
      <div className="glass-card rounded-[3rem] p-12 text-center animate-fadeIn">
        <div className="text-8xl mb-6">🏆</div>
        <h2 className="text-3xl font-black mb-4 heading-kh text-maroon">លទ្ធផល</h2>
        <div className="text-8xl font-black text-indigo-600 my-8 tabular-nums">{percentage}%</div>
        <p className="text-xl mb-12 small-kh text-gray-600">អ្នកឆ្លើយត្រូវ {state.score} / {partQuestions.length}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
          <button onClick={() => setState(prev => ({ ...prev, isReviewing: true }))} className="w-full bg-white border-2 border-maroon text-maroon font-black py-4 rounded-2xl shadow-md">ពិនិត្យចម្លើយ 👁️</button>
          <button onClick={onExit} className="w-full bg-maroon text-white font-black py-4 rounded-2xl shadow-xl">ត្រឡប់ទៅវិញ 🏠</button>
        </div>
      </div>
    );
  }

  const currentQ = partQuestions[state.currentQuestionIndex];
  return (
    <div className="glass-card rounded-[3rem] p-8 md:p-12 animate-fadeIn border-2 border-white flex flex-col min-h-[550px]">
      <div className="flex justify-between items-start mb-10">
        <div className="flex flex-col">
          <span className="text-maroon font-black text-[10px] uppercase tracking-widest opacity-60">{subject} - QCM</span>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-maroon">{state.currentQuestionIndex + 1}</span>
            <span className="text-sm font-bold text-gray-400 mb-1">/ {partQuestions.length}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMuted(!isMuted)} className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-md ${isMuted ? 'bg-gray-100 text-gray-400' : 'bg-maroon/5 text-maroon'}`}>
            {isMuted ? '🔇' : '🔊'}
          </button>
          <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg font-black text-xl tabular-nums">ពិន្ទុ៖ {state.score}</div>
          <button onClick={() => { if(confirm("ចាកចេញ?")) onExit(); }} className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl">✕</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <h2 className="text-2xl font-bold mb-10 heading-kh text-maroon leading-relaxed">{currentQ.question}</h2>
        
        <div className="grid grid-cols-1 gap-4">
          {currentQ.options?.map((opt, i) => {
            let style = "bg-white border-gray-100 hover:border-indigo-300 text-gray-700";
            if (state.showCorrect) {
              if (i === currentQ.correct) style = "bg-green-50 border-green-500 text-green-800 ring-4 ring-green-100";
              else if (i === state.selectedAnswer) style = "bg-red-50 border-red-500 text-red-800";
              else style = "opacity-40 grayscale-[0.5]";
            }
            return (
              <button key={i} onClick={() => handleMCQSelect(i)} disabled={state.showCorrect} className={`text-left p-6 rounded-2xl border-2 transition-all font-bold text-lg flex items-center gap-5 small-kh ${style} ${shakeIndex === i ? 'animate-bounce' : ''}`}>
                <span className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-maroon font-black shrink-0">{KHMER_PREFIXES[i]}</span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {state.showCorrect && (
        <button onClick={handleNext} className="mt-12 w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-2xl text-xl animate-fadeIn hover:brightness-110 transition-all">
          {state.currentQuestionIndex + 1 === partQuestions.length ? "បង្ហាញលទ្ធផល ✨" : "សំណួរបន្ទាប់ →"}
        </button>
      )}
    </div>
  );
};

export default QuizGame;
