
import * as React from 'react';
import { useState, useMemo } from 'react';
import { Question } from '../types';

interface CreateSectionProps {
  quizData: Question[];
  subjectOrder: { mcq: string[], short: string[] };
  onAdd: (q: Question) => void;
  onUpdate: (index: number, q: Question) => void;
  onRemove: (index: number) => void;
  onToggleSubject: (subject: string, type: 'mcq' | 'short', active: boolean) => void;
  onRemoveSubject: (subject: string, type: 'mcq' | 'short') => void;
  onReorderSubject: (type: 'mcq' | 'short', direction: 'up' | 'down', subjectName: string) => void;
  onUpdateSubjectOrder: (type: 'mcq' | 'short', newOrder: string[]) => void;
  onBatchAdd: (qs: Question[]) => void;
  onLogout: () => void;
}

// Fixed: Removed onReorderSubject from SubjectCard props as it is no longer used by this component
const SubjectCard: React.FC<{
  sub: { name: string, isActive: boolean, count: number, type: 'mcq' | 'short' };
  index: number;
  isDragging: boolean;
  onToggleSubject: (subject: string, type: 'mcq' | 'short', active: boolean) => void;
  onRemoveSubject: (subject: string, type: 'mcq' | 'short') => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}> = ({ sub, index, isDragging, onToggleSubject, onRemoveSubject, onDragStart, onDragOver, onDragEnd }) => {
  const [isOver, setIsOver] = useState(false);

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); onDragOver(e, index); }}
      onDragLeave={() => setIsOver(false)}
      onDragEnd={() => { setIsOver(false); onDragEnd(); }}
      onDrop={() => setIsOver(false)}
      className={`p-6 rounded-[2rem] border transition-all flex flex-col justify-between cursor-grab active:cursor-grabbing relative 
        ${isOver ? 'drag-over' : ''} 
        ${isDragging ? 'dragging-item' : ''}
        ${sub.isActive ? 'bg-white border-gray-100 shadow-sm hover:shadow-md' : 'bg-gray-100 border-gray-200 grayscale opacity-60'}`}
    >
      <div className="pointer-events-none">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2 overflow-hidden">
             <div className="text-gray-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 7a2 2 0 100-4 2 2 0 000 4zM13 7a2 2 0 100-4 2 2 0 000 4zM7 11a2 2 0 100-4 2 2 0 000 4zM13 11a2 2 0 100-4 2 2 0 000 4zM7 15a2 2 0 100-4 2 2 0 000 4zM13 15a2 2 0 100-4 2 2 0 000 4z"/></svg>
             </div>
             <h3 className="text-lg font-black heading-kh text-maroon truncate">{sub.name}</h3>
          </div>
          <div className="flex flex-col gap-1 items-end">
             <span className="text-[9px] font-black bg-gray-50 px-3 py-1 rounded-full text-gray-400">{sub.count} សំណួរ</span>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 mt-4 pointer-events-auto">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleSubject(sub.name, sub.type, !sub.isActive); }}
          className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${sub.isActive ? 'bg-maroon/5 text-maroon hover:bg-maroon hover:text-white' : 'bg-green-500 text-white hover:brightness-110'}`}
        >
          {sub.isActive ? '❌ បិទមុខវិជ្ជា' : '✅ បើកមុខវិជ្ជា'}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onRemoveSubject(sub.name, sub.type); }}
          className="px-4 py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

const CreateSection: React.FC<CreateSectionProps> = ({ 
  quizData, subjectOrder, onAdd, onUpdate, onRemove, onToggleSubject, onRemoveSubject, onReorderSubject, onUpdateSubjectOrder, onBatchAdd
}) => {
  const KHMER_PREFIXES = ['ក', 'ខ', 'គ', 'ឃ'];
  const [entryMode, setEntryMode] = useState<'single' | 'bulk' | 'subjects'>('single');
  const [qType, setQType] = useState<'mcq' | 'short'>('mcq');
  const [bulkType, setBulkType] = useState<'mcq' | 'short'>('mcq');
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [shortAnswer, setShortAnswer] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (index: number, type: 'mcq' | 'short', currentOrder: string[]) => {
    if (draggedIdx === null || draggedIdx === index) return;
    
    const newOrder = [...currentOrder];
    const item = newOrder.splice(draggedIdx, 1)[0];
    newOrder.splice(index, 0, item);
    
    setDraggedIdx(index);
    onUpdateSubjectOrder(type, newOrder);
  };

  const filteredQuestions = useMemo(() => {
    return quizData
      .map((q, originalIndex) => ({ ...q, originalIndex }))
      .filter(item => {
        return item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
               item.subject.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [quizData, searchQuery]);

  const groupedSubjects = useMemo(() => {
    const mcqRaw = Array.from(new Set(quizData.filter(q => q.type === 'mcq').map(q => q.subject)));
    const shortRaw = Array.from(new Set(quizData.filter(q => q.type === 'short').map(q => q.subject)));

    const mcqSorted = [...(subjectOrder.mcq || [])].filter(s => mcqRaw.includes(s));
    mcqRaw.forEach(s => { if(!mcqSorted.includes(s)) mcqSorted.push(s); });

    const shortSorted = [...(subjectOrder.short || [])].filter(s => shortRaw.includes(s));
    shortRaw.forEach(s => { if(!shortSorted.includes(s)) shortSorted.push(s); });

    const mcqList = mcqSorted.map(name => {
      const related = quizData.filter(q => q.subject === name && q.type === 'mcq');
      const isActive = related.every(q => q.isActive !== false);
      return { name, isActive, count: related.length, type: 'mcq' as const };
    });

    const shortList = shortSorted.map(name => {
      const related = quizData.filter(q => q.subject === name && q.type === 'short');
      const isActive = related.every(q => q.isActive !== false);
      return { name, isActive, count: related.length, type: 'short' as const };
    });

    return { mcq: mcqList, short: shortList };
  }, [quizData, subjectOrder]);

  const handleSubmitSingle = () => {
    if (!subject.trim() || !question.trim()) return alert("សូមបំពេញព័ត៌មានសំណួរឱ្យបានគ្រប់គ្រាន់!");
    let newQ: Question;
    if (qType === 'mcq') {
      if (options.some(o => !o.trim())) return alert("សូមបំពេញជម្រើសចម្លើយឱ្យគ្រប់!");
      newQ = { type: 'mcq', subject: subject.trim(), question: question.trim(), options: options.map(o => o.trim()), correct, isActive: true };
    } else {
      if (!shortAnswer.trim()) return alert("សូមបំពេញចម្លើយត្រឹមត្រូវ!");
      newQ = { type: 'short', subject: subject.trim(), question: question.trim(), answer: shortAnswer.trim(), isActive: true };
    }
    if (editingIndex !== null) onUpdate(editingIndex, newQ);
    else onAdd(newQ);
    setQuestion(''); setOptions(['', '', '', '']); setShortAnswer(''); setEditingIndex(null);
  };

  const handleBulkSubmit = () => {
    if (!subject.trim() || !bulkText.trim()) return alert("សូមបំពេញព័ត៌មាន!");
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsed: Question[] = [];
    let cur: Partial<Question> | null = null;
    if (bulkType === 'mcq') {
      lines.forEach(line => {
        const qMatch = line.match(/^[០-៩0-9]+\.\s*(.*)/);
        if (qMatch) {
          if (cur && cur.question && cur.options && cur.options.length >= 2) parsed.push(cur as Question);
          cur = { type: 'mcq', subject: subject.trim(), question: qMatch[1].trim(), options: [], correct: 0, isActive: true };
          return;
        }
        const oMatch = line.match(/^[កខគឃ]\.\s*(.*)/);
        if (oMatch && cur && cur.type === 'mcq') {
          let text = oMatch[1].replace('(ចម្លើយត្រឹមត្រូវ)', '').trim();
          if (!cur.options) cur.options = [];
          cur.options.push(text);
          if (oMatch[1].includes('(ចម្លើយត្រឹមត្រូវ)')) cur.correct = cur.options.length - 1;
        }
      });
      if (cur && cur.question && cur.options && cur.options.length >= 2) parsed.push(cur as Question);
    } else {
      lines.forEach(line => {
        const qMatch = line.match(/^[០-៩0-9]+\.\s*(.*)/);
        if (qMatch) {
          if (cur && cur.question && cur.answer) parsed.push(cur as Question);
          cur = { type: 'short', subject: subject.trim(), question: qMatch[1].trim(), answer: '', isActive: true };
          return;
        }
        const aMatch = line.match(/^ចម្លើយ\s*[៖:]\s*(.*)/);
        if (aMatch && cur && cur.type === 'short') {
          cur.answer = aMatch[1].trim();
        }
      });
      if (cur && cur.question && cur.answer) parsed.push(cur as Question);
    }
    if (parsed.length > 0) {
      onBatchAdd(parsed);
      setBulkText('');
      alert(`បានបញ្ចូល ${parsed.length} សំណួរដោយជោគជ័យ!`);
    } else alert("រកមិនឃើញទម្រង់សំណួរត្រឹមត្រូវ!");
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="glass-card rounded-[2.5rem] shadow-xl p-8 border border-white/50">
        <div className="flex border-b border-gray-100 mb-8 -mx-8 px-8 overflow-x-auto custom-scrollbar">
          <button onClick={() => setEntryMode('single')} className={`pb-4 px-8 font-black heading-kh text-sm transition-all border-b-4 shrink-0 ${entryMode === 'single' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>✍️ បញ្ចូលសំណួរ</button>
          <button onClick={() => setEntryMode('bulk')} className={`pb-4 px-8 font-black heading-kh text-sm transition-all border-b-4 shrink-0 ${entryMode === 'bulk' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>🚀 បញ្ចូលទាំងអស់</button>
          <button onClick={() => setEntryMode('subjects')} className={`pb-4 px-8 font-black heading-kh text-sm transition-all border-b-4 shrink-0 ${entryMode === 'subjects' ? 'border-maroon text-maroon' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>📚 គ្រប់គ្រងមុខវិជ្ជា</button>
        </div>
        
        {entryMode === 'single' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <h2 className="text-xl font-black heading-kh text-maroon flex items-center gap-2">
                <span>{editingIndex !== null ? '✏️' : '🆕'}</span>
                {editingIndex !== null ? 'កែសម្រួលសំណួរ' : 'បង្កើតសំណួរថ្មី'}
              </h2>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setQType('mcq')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${qType === 'mcq' ? 'bg-white text-maroon shadow-sm' : 'text-gray-400'}`}>QCM</button>
                <button onClick={() => setQType('short')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${qType === 'short' ? 'bg-white text-maroon shadow-sm' : 'text-gray-400'}`}>Q & A</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">ឈ្មោះមុខវិជ្ជា</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh bg-gray-50/50 text-maroon font-bold" placeholder="ឧទាហរណ៍៖ សេដ្ឋកិច្ច" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">អត្ថបទសំណួរ</label>
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-maroon outline-none min-h-[100px] small-kh bg-gray-50/50" placeholder="សរសេរសំណួរ..." />
              </div>
              {qType === 'mcq' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all focus-within:border-maroon/30">
                      <span className="font-black text-maroon w-10 h-10 flex items-center justify-center bg-maroon/5 rounded-xl">{KHMER_PREFIXES[i]}</span>
                      <input type="text" value={opt} onChange={(e) => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} className="flex-1 outline-none small-kh py-1 text-sm" placeholder={`ចម្លើយទី ${i+1}`} />
                      <label className="relative flex items-center cursor-pointer">
                        <input type="radio" checked={correct === i} onChange={() => setCorrect(i)} className="hidden peer" />
                        <div className="w-8 h-8 border-2 border-gray-200 rounded-xl peer-checked:bg-green-500 peer-checked:border-green-500 text-white flex items-center justify-center">✓</div>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2">ចម្លើយដែលត្រូវ</label>
                  <textarea value={shortAnswer} onChange={(e) => setShortAnswer(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh bg-gray-50/50 min-h-[100px]" placeholder="បញ្ចូលចម្លើយត្រឹមត្រូវ..." />
                </div>
              )}
            </div>
            <button onClick={handleSubmitSingle} className="w-full bg-maroon text-white font-black py-5 rounded-[2rem] shadow-xl hover:brightness-110 transition-all heading-kh text-lg">រក្សាទុកសំណួរ</button>
          </div>
        )}

        {entryMode === 'bulk' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-black heading-kh text-maroon flex items-center gap-2">🚀 បញ្ចូលសំណួរទាំងអស់</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-gray-400 ml-2">ឈ្មោះមុខវិជ្ជា</label>
                 <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-maroon small-kh bg-gray-50/50 text-maroon font-bold" placeholder="ឈ្មោះមុខវិជ្ជា..." />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-gray-400 ml-2">ប្រភេទសំណួរ</label>
                 <div className="flex bg-gray-100 p-1 rounded-2xl h-[60px]">
                    <button onClick={() => setBulkType('mcq')} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${bulkType === 'mcq' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-400'}`}>QCM</button>
                    <button onClick={() => setBulkType('short')} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${bulkType === 'short' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-400'}`}>Q & A</button>
                  </div>
               </div>
            </div>
            <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} className="w-full px-5 py-5 rounded-[2rem] border border-gray-100 min-h-[300px] small-kh text-xs bg-gray-50/50 outline-none focus:ring-2 focus:ring-maroon" placeholder={bulkType === 'mcq' ? "ចម្លងកម្រងសំណួរពហុចម្លើយដាក់ទីនេះ..." : "ចម្លងកម្រងសំណួរចម្លើយខ្លីៗដាក់ទីនេះ..."} />
            <button onClick={handleBulkSubmit} className="w-full bg-maroon text-white font-black py-5 rounded-[2rem] shadow-xl hover:brightness-110 transition-all heading-kh text-lg">ចាប់ផ្ដើមបញ្ចូលទិន្នន័យ</button>
          </div>
        )}

        {entryMode === 'subjects' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="space-y-6">
              <div className="flex flex-col border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black heading-kh text-blue-800">🔘 ផ្នែកសំណួរពហុចម្លើយ</h2>
                  <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">{groupedSubjects.mcq.length} មុខវិជ្ជា</span>
                </div>
                <span className="text-[10px] text-gray-400 small-kh italic mt-1">ទាញកាតមុខវិជ្ជាដើម្បីរៀបលំដាប់លំដោយ (Drag to Reorder)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedSubjects.mcq.map((sub, i) => (
                  <SubjectCard 
                    key={`mcq-${sub.name}`} 
                    sub={sub} 
                    index={i}
                    isDragging={draggedIdx === i}
                    onToggleSubject={onToggleSubject} 
                    onRemoveSubject={onRemoveSubject} 
                    onDragStart={handleDragStart}
                    onDragOver={(e, idx) => handleDragOver(idx, 'mcq', groupedSubjects.mcq.map(s => s.name))}
                    onDragEnd={() => setDraggedIdx(null)}
                    // Fixed: Removed onReorderSubject prop call as it is not part of SubjectCard's interface
                  />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex flex-col border-l-4 border-orange-500 pl-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black heading-kh text-orange-800">✍️ ផ្នែកសំណួរចម្លើយខ្លីៗ</h2>
                  <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black">{groupedSubjects.short.length} មុខវិជ្ជា</span>
                </div>
                <span className="text-[10px] text-gray-400 small-kh italic mt-1">ទាញកាតមុខវិជ្ជាដើម្បីរៀបលំដាប់លំដោយ (Drag to Reorder)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedSubjects.short.map((sub, i) => (
                  <SubjectCard 
                    key={`short-${sub.name}`} 
                    sub={sub} 
                    index={i}
                    isDragging={draggedIdx === i}
                    onToggleSubject={onToggleSubject} 
                    onRemoveSubject={onRemoveSubject} 
                    onDragStart={handleDragStart}
                    onDragOver={(e, idx) => handleDragOver(idx, 'short', groupedSubjects.short.map(s => s.name))}
                    onDragEnd={() => setDraggedIdx(null)}
                    // Fixed: Removed onReorderSubject prop call as it is not part of SubjectCard's interface
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="glass-card rounded-[2.5rem] shadow-lg p-8 border border-white/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-black heading-kh text-maroon">📚 បញ្ជីសំណួរទាំងអស់ ({quizData.length})</h3>
          <div className="relative w-full md:w-64">
             <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ស្វែងរក..." className="w-full px-6 py-3 rounded-full border border-gray-100 outline-none small-kh text-sm focus:ring-2 focus:ring-maroon" />
             <span className="absolute right-4 top-3 opacity-30">🔍</span>
          </div>
        </div>
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredQuestions.length > 0 ? filteredQuestions.map((item) => (
            <div key={item.originalIndex} className={`p-5 rounded-3xl border flex justify-between items-center transition-all ${item.isActive === false ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-50 shadow-sm hover:shadow-md'}`}>
              <div className="truncate flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${item.isActive === false ? 'bg-gray-200 text-gray-500' : 'bg-maroon text-white'}`}>{item.subject}</span>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${item.type === 'mcq' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {item.type === 'mcq' ? 'QCM' : 'Q & A'}
                  </span>
                  {item.isActive === false && <span className="text-[8px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase">បិទ</span>}
                </div>
                <p className="text-xs font-bold text-gray-700 truncate small-kh">{item.question}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onUpdate(item.originalIndex, { ...item, isActive: item.isActive === false })} className={`p-3 rounded-xl transition-colors ${item.isActive === false ? 'bg-green-50 text-green-500 hover:bg-green-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{item.isActive === false ? '🔓' : '🔒'}</button>
                <button onClick={() => { setQType(item.type); setSubject(item.subject); setQuestion(item.question); if (item.type === 'mcq') { setOptions(item.options || []); setCorrect(item.correct || 0); } else setShortAnswer(item.answer || ''); setEditingIndex(item.originalIndex); setEntryMode('single'); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-3 bg-orange-50 text-orange-500 rounded-xl hover:bg-orange-100 transition-colors">✏️</button>
                <button onClick={() => { if(confirm("តើអ្នកប្រាកដថាចង់លុបសំណួរនេះ?")) onRemove(item.originalIndex); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">🗑️</button>
              </div>
            </div>
          )) : <div className="text-center py-10 text-gray-400 italic">មិនមានទិន្នន័យ</div>}
        </div>
      </div>
    </div>
  );
};

export default CreateSection;
