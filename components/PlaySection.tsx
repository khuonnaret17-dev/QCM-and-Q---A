
import * as React from 'react';
import { Question } from '../types';

interface PlaySectionProps {
  quizData: Question[];
  subjectOrder: { mcq: string[], short: string[] };
  selectedSubject: string | null;
  selectedType: 'mcq' | 'short';
  onSelectSubject: (subject: string | null) => void;
  onSelectType: (type: 'mcq' | 'short') => void;
  onStartQuiz: (subject: string, partIndex: number, type: 'mcq' | 'short') => void;
}

const PlaySection: React.FC<PlaySectionProps> = ({ 
  quizData, 
  subjectOrder,
  selectedSubject, 
  selectedType, 
  onSelectSubject, 
  onSelectType, 
  onStartQuiz 
}) => {
  const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  const toKhmerNumeral = (n: number) => n.toString().split('').map(digit => KHMER_DIGITS[parseInt(digit)] || digit).join('');

  const activeQuestions = quizData.filter((q: Question) => q.isActive !== false);
  const rawSubjects = Array.from(new Set(activeQuestions.filter(q => q.type === selectedType).map((item: Question) => item.subject)));

  // Sort subjects based on order from Firebase
  const subjects = [...(subjectOrder[selectedType] || [])].filter(s => rawSubjects.includes(s));
  rawSubjects.forEach(s => { if(!subjects.includes(s)) subjects.push(s); });

  if (selectedSubject) {
    const subjectQuestions = activeQuestions.filter((q: Question) => q.subject === selectedSubject && q.type === selectedType);
    const totalQuestions = subjectQuestions.length;
    const itemsPerPart = 10;
    const totalParts = Math.ceil(totalQuestions / itemsPerPart);

    return (
      <div className="animate-fadeIn space-y-6">
        <div className="glass-card p-6 md:p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 mb-8 border border-white/50">
          <button onClick={() => onSelectSubject(null)} className="p-5 bg-maroon/5 hover:bg-maroon hover:text-white rounded-2xl transition-all active:scale-90 shrink-0 shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black heading-kh text-maroon">{selectedSubject}</h2>
            <p className="text-sm small-kh text-gray-500 mt-1">ប្រភេទ៖ {selectedType === 'mcq' ? 'QCM' : 'Q & A'} (ភាគនីមួយៗមាន ១០ សំណួរ)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: totalParts }).map((_, i) => (
            <button key={i} onClick={() => onStartQuiz(selectedSubject, i, selectedType)} className="glass-card p-8 rounded-[2rem] text-left transition-all active:scale-95 group shadow-md hover:shadow-xl">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black text-maroon/60 uppercase tracking-widest mb-2 block">ភាគទី {toKhmerNumeral(i + 1)}</span>
                  <h4 className="text-xl font-black heading-kh !text-maroon">សំណួរទី {toKhmerNumeral(i * 10 + 1)} ដល់ {toKhmerNumeral(Math.min((i + 1) * 10, totalQuestions))}</h4>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-maroon/5 flex items-center justify-center text-maroon group-hover:bg-maroon group-hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-center mb-10">
        <div className="bg-white/40 backdrop-blur-md p-1.5 rounded-[2rem] border border-white/60 shadow-lg flex">
          <button onClick={() => onSelectType('mcq')} className={`px-8 py-3 rounded-full font-black heading-kh text-sm transition-all flex items-center gap-2 ${selectedType === 'mcq' ? 'bg-white text-blue-700 shadow-md scale-105' : 'text-gray-500 hover:text-gray-700'}`}><span>🔘</span> QCM</button>
          <button onClick={() => onSelectType('short')} className={`px-8 py-3 rounded-full font-black heading-kh text-sm transition-all flex items-center gap-2 ${selectedType === 'short' ? 'bg-white text-orange-700 shadow-md scale-105' : 'text-gray-500 hover:text-gray-700'}`}><span>✍️</span> Q & A</button>
        </div>
      </div>
      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {subjects.map((sub: string, i: number) => {
            const count = activeQuestions.filter(q => q.subject === sub && q.type === selectedType).length;
            return (
              <button key={i} onClick={() => onSelectSubject(sub)} className="glass-card p-12 rounded-[3rem] text-center transition-all border-4 border-transparent hover:border-maroon/20 hover:shadow-2xl group flex flex-col items-center">
                <div className="w-24 h-24 bg-maroon/5 rounded-[2rem] flex items-center justify-center text-5xl mb-8 group-hover:scale-110 transition-transform">{selectedType === 'mcq' ? '📑' : '🖊️'}</div>
                <h3 className="text-3xl font-black mb-4 heading-kh !text-maroon">{sub}</h3>
                <div className={`flex items-center gap-2 font-black text-xs px-6 py-2 rounded-full text-white shadow-md ${selectedType === 'mcq' ? 'bg-blue-600' : 'bg-orange-600'}`}>
                  <span>មាន {toKhmerNumeral(count)} សំណួរ</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : <div className="py-24 text-center glass-card rounded-[3rem]">📭 មិនទាន់មានសំណួរ</div>}
    </div>
  );
};

export default PlaySection;
