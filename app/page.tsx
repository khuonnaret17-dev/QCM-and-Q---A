'use client';

import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Users, 
  Settings, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ArrowRight,
  LogOut,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TelegramMigrator() {
  const [step, setStep] = useState<'auth' | 'code' | 'dashboard' | 'migrating'>('auth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auth State
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [password, setPassword] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [tempSession, setTempSession] = useState('');
  const [sessionString, setSessionString] = useState('');
  
  // Migration State
  const [channels, setChannels] = useState<any[]>([]);
  const [sourceChannel, setSourceChannel] = useState<string>('');
  const [isManualSource, setIsManualSource] = useState<boolean>(false);
  const [manualSource, setManualSource] = useState<string>('');
  const [targetChannel, setTargetChannel] = useState<string>('');
  const [migrationLog, setMigrationLog] = useState<{msg: string, type: 'info' | 'success' | 'error'}[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const savedSession = localStorage.getItem('tg_session');
    const savedApiId = localStorage.getItem('tg_api_id');
    const savedApiHash = localStorage.getItem('tg_api_hash');
    
    if (savedSession && savedApiId && savedApiHash) {
      setSessionString(savedSession);
      setApiId(savedApiId);
      setApiHash(savedApiHash);
      fetchChannels(savedSession, savedApiId, savedApiHash);
    }
  }, []);

  const handleSendCode = async () => {
    if (!apiId || !apiHash || !phoneNumber) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/telegram/send-code', {
        method: 'POST',
        body: JSON.stringify({ apiId, apiHash, phoneNumber }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPhoneCodeHash(data.phoneCodeHash);
      setTempSession(data.tempSession);
      setStep('code');
      localStorage.setItem('tg_api_id', apiId);
      localStorage.setItem('tg_api_hash', apiHash);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/telegram/sign-in', {
        method: 'POST',
        body: JSON.stringify({ 
          apiId, 
          apiHash, 
          phoneNumber, 
          phoneCodeHash, 
          phoneCode, 
          password,
          tempSession 
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSessionString(data.sessionString);
      localStorage.setItem('tg_session', data.sessionString);
      setStep('dashboard');
      fetchChannels(data.sessionString, apiId, apiHash);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async (session: string, id: string, hash: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/channels', {
        method: 'POST',
        body: JSON.stringify({ apiId: id, apiHash: hash, sessionString: session }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChannels(data.channels);
      setStep('dashboard');
    } catch (err: any) {
      setError(err.message);
      setStep('auth');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tg_session');
    setStep('auth');
    setSessionString('');
  };

  const startMigration = async () => {
    const finalSource = isManualSource ? manualSource : sourceChannel;
    if (!finalSource || !targetChannel) {
      setError('Please select both source and target channels');
      return;
    }
    setStep('migrating');
    setMigrationLog([{ msg: "Starting migration process...", type: 'info' }]);
    setProgress({ current: 0, total: 0 });
    
    try {
      const response = await fetch('/api/telegram/migrate', {
        method: 'POST',
        body: JSON.stringify({ 
          apiId, 
          apiHash, 
          sessionString, 
          sourceChannel: finalSource, 
          targetChannel 
        }),
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            setMigrationLog(prev => [...prev, { msg: data.msg, type: data.type }]);
            if (data.progress) setProgress(data.progress);
          } catch (e) {
            console.error("Error parsing chunk", e);
          }
        }
      }
    } catch (err: any) {
      setMigrationLog(prev => [...prev, { msg: "Critical Error: " + err.message, type: 'error' }]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-200"
          >
            <Send className="text-white w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Telegram Member Migrator</h1>
          <p className="text-slate-500 mt-2">Professional tool for channel management and growth</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'auth' && (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-blue-600" />
                    Authentication
                  </h2>
                  <p className="text-sm text-slate-500 mb-6">
                    Enter your Telegram API credentials. You can get these from <a href="https://my.telegram.org" target="_blank" className="text-blue-600 hover:underline">my.telegram.org</a>.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">API ID</label>
                      <input 
                        type="text" 
                        value={apiId}
                        onChange={(e) => setApiId(e.target.value)}
                        placeholder="1234567"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">API Hash</label>
                      <input 
                        type="password" 
                        value={apiHash}
                        onChange={(e) => setApiHash(e.target.value)}
                        placeholder="abcdef1234567890..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                      <input 
                        type="text" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Important Notice</h3>
                    <ul className="text-sm text-slate-600 space-y-3">
                      <li className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        This tool uses the official Telegram MTProto API.
                      </li>
                      <li className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        Your credentials are only stored locally in your browser.
                      </li>
                      <li className="flex gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        Excessive use may lead to account restrictions. Use responsibly.
                      </li>
                    </ul>
                  </div>

                  <button 
                    onClick={handleSendCode}
                    disabled={loading}
                    className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                    Send Verification Code
                  </button>
                </div>
              </div>
              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </motion.div>
          )}

          {step === 'code' && (
            <motion.div 
              key="code"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md mx-auto"
            >
              <h2 className="text-xl font-semibold mb-2 text-center">Verify Identity</h2>
              <p className="text-sm text-slate-500 mb-8 text-center">
                Enter the code sent to your Telegram app for <b>{phoneNumber}</b>
              </p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Verification Code</label>
                  <input 
                    type="text" 
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    placeholder="12345"
                    className="w-full px-4 py-4 text-center text-2xl tracking-[0.5em] font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">2FA Password (Optional)</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your 2FA password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Only required if you have Two-Step Verification enabled.</p>
                </div>

                <button 
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                </button>
                
                <button 
                  onClick={() => setStep('auth')}
                  className="w-full text-slate-400 hover:text-slate-600 text-sm font-medium"
                >
                  Back to login
                </button>
              </div>
              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </motion.div>
          )}

          {step === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Migration Setup
                  </h2>
                  <button 
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-sm font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Source Channel/Group</label>
                      <button 
                        onClick={() => setIsManualSource(!isManualSource)}
                        className="text-[10px] text-blue-600 hover:underline font-semibold"
                      >
                        {isManualSource ? 'Select from list' : 'Enter manually'}
                      </button>
                    </div>
                    <div className="relative">
                      {isManualSource ? (
                        <input
                          type="text"
                          value={manualSource}
                          onChange={(e) => setManualSource(e.target.value)}
                          placeholder="@groupname or t.me/link"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        />
                      ) : (
                        <select 
                          value={sourceChannel}
                          onChange={(e) => setSourceChannel(e.target.value)}
                          className="w-full appearance-none px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                          <option value="">Select source...</option>
                          {channels.map(c => (
                            <option key={c.id} value={c.id}>{c.title} ({c.isChannel ? 'Channel' : 'Group'})</option>
                          ))}
                        </select>
                      )}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">Members will be scraped from this channel.</p>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Channel/Group</label>
                    <div className="relative">
                      <select 
                        value={targetChannel}
                        onChange={(e) => setTargetChannel(e.target.value)}
                        className="w-full appearance-none px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      >
                        <option value="">Select target...</option>
                        {channels.map(c => (
                          <option key={c.id} value={c.id}>{c.title} ({c.isChannel ? 'Channel' : 'Group'})</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">Members will be added to this channel. You must be an admin.</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 mb-8">
                  <div className="flex gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-800">Safety Guidelines</h4>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        To avoid account bans, we add members with a random delay of 2-5 seconds. 
                        Telegram allows adding roughly 200 members per day per account. 
                        Do not exceed these limits.
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={startMigration}
                  disabled={(!isManualSource && !sourceChannel) || (isManualSource && !manualSource) || !targetChannel || sourceChannel === targetChannel}
                  className="w-full bg-slate-900 hover:bg-black text-white font-semibold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Start Migration Process
                </button>
              </div>
            </motion.div>
          )}

          {step === 'migrating' && (
            <motion.div 
              key="migrating"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100"
            >
              {/* Progress Header */}
              <div className="p-8 border-bottom border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Migration in Progress</h2>
                  <span className="text-sm font-mono font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Log Area */}
              <div className="p-8 max-h-[400px] overflow-y-auto font-mono text-xs space-y-2 bg-[#1a1b1e] text-slate-300">
                {migrationLog.map((log, i) => (
                  <div key={i} className={`flex gap-2 ${
                    log.type === 'success' ? 'text-emerald-400' : 
                    log.type === 'error' ? 'text-rose-400' : 
                    'text-slate-400'
                  }`}>
                    <span className="opacity-30">[{new Date().toLocaleTimeString()}]</span>
                    <span>{log.msg}</span>
                  </div>
                ))}
                {progress.current < progress.total && (
                  <div className="flex items-center gap-2 text-blue-400 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Waiting for next batch...</span>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setStep('dashboard')}
                  className="px-6 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
