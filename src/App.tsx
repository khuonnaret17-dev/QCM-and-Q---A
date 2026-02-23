/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Send, Upload, CheckCircle, AlertCircle, Loader2, Bot, Settings, MessageSquare, FileText, Trash2, Play, Square, Users, Radio, LayoutDashboard, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Rule = {
  id: number;
  keyword: string;
  response_type: 'text' | 'document';
  content: string | null;
  filename: string | null;
};

type Log = {
  id: number;
  chat_id: string;
  username: string;
  text: string;
  timestamp: string;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'manual' | 'auto' | 'broadcast'>('dashboard');
  
  // Dashboard State
  const [stats, setStats] = useState({ subscribers: 0, rules: 0, messages: 0 });
  const [logs, setLogs] = useState<Log[]>([]);

  
  // Manual Send State
  const [manualBotToken, setManualBotToken] = useState('7183547347:AAGGSEvjWl3VIud_xKUBXhtkhmH9DBulfT8');
  const [chatId, setChatId] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Auto-Reply Bot State
  const [botRunning, setBotRunning] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [configToken, setConfigToken] = useState('7183547347:AAGGSEvjWl3VIud_xKUBXhtkhmH9DBulfT8');
  const [rules, setRules] = useState<Rule[]>([]);
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleType, setNewRuleType] = useState<'text' | 'document'>('text');
  const [newRuleContent, setNewRuleContent] = useState('');
  const [newRuleFile, setNewRuleFile] = useState<File | null>(null);
  const [ruleStatus, setRuleStatus] = useState<'idle' | 'saving' | 'error'>('idle');

  // Broadcast State
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastFile, setBroadcastFile] = useState<File | null>(null);
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [broadcastResult, setBroadcastResult] = useState({ sent: 0, failed: 0 });

  // Load initial bot status and rules
  useEffect(() => {
    fetchBotStatus();
    fetchAiStatus();
    fetchRules();
    fetchSubscriberCount();
    fetchDashboardData();
  }, []);

  // Refresh dashboard data periodically if on dashboard tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 5000);
      return () => clearInterval(interval);
    }
    if (activeTab === 'broadcast') {
      fetchSubscriberCount();
      const interval = setInterval(fetchSubscriberCount, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchAiStatus = async () => {
    try {
      const res = await fetch('/api/bot/ai-status');
      const data = await res.json();
      setAiEnabled(data.enabled);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAi = async () => {
    try {
      const res = await fetch('/api/bot/ai-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !aiEnabled }),
      });
      const data = await res.json();
      setAiEnabled(data.enabled);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch('/api/dashboard/stats');
      const statsData = await statsRes.json();
      setStats(statsData);

      const logsRes = await fetch('/api/dashboard/logs');
      const logsData = await logsRes.json();
      setLogs(logsData);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubscriberCount = async () => {
    try {
      const res = await fetch('/api/subscribers');
      const data = await res.json();
      setSubscriberCount(data.count);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBotStatus = async () => {
    try {
      const res = await fetch('/api/bot/status');
      const data = await res.json();
      setBotRunning(data.running);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/rules');
      const data = await res.json();
      setRules(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setMessage('');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!manualBotToken && !configToken) || !chatId || !file) {
      setMessage('Please fill in all required fields.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setMessage('');

    const formData = new FormData();
    if (manualBotToken) formData.append('botToken', manualBotToken);
    formData.append('chatId', chatId);
    formData.append('file', file);
    if (caption) formData.append('caption', caption);

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage('File sent successfully!');
        setFile(null);
        setCaption('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to send file.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage && !broadcastFile) {
      return alert('Please enter a message or select a file');
    }
    if (!botRunning) {
      return alert('Please start the bot first in the Auto-Reply tab');
    }

    setBroadcastStatus('sending');
    const formData = new FormData();
    if (broadcastMessage) formData.append('message', broadcastMessage);
    if (broadcastFile) formData.append('file', broadcastFile);

    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastStatus('success');
        setBroadcastResult({ sent: data.sent, failed: data.failed });
        setBroadcastMessage('');
        setBroadcastFile(null);
      } else {
        setBroadcastStatus('error');
        alert(data.error);
      }
    } catch (e) {
      setBroadcastStatus('error');
      console.error(e);
    }
  };

  const toggleBot = async () => {
    if (botRunning) {
      await fetch('/api/bot/stop', { method: 'POST' });
      setBotRunning(false);
    } else {
      if (!configToken) return alert('Please enter a Bot Token first');
      const res = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: configToken }),
      });
      const data = await res.json();
      if (data.success) {
        setBotRunning(true);
      } else {
        alert('Failed to start bot: ' + data.error);
      }
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleKeyword) return;

    setRuleStatus('saving');
    const formData = new FormData();
    formData.append('keyword', newRuleKeyword);
    formData.append('responseType', newRuleType);
    
    if (newRuleType === 'text') {
      formData.append('content', newRuleContent);
    } else if (newRuleFile) {
      formData.append('file', newRuleFile);
    }

    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setNewRuleKeyword('');
        setNewRuleContent('');
        setNewRuleFile(null);
        fetchRules();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRuleStatus('idle');
    }
  };

  const handleDeleteRule = async (id: number) => {
    await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    fetchRules();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]"
      >
        {/* Sidebar / Tabs */}
        <div className="w-full md:w-64 bg-slate-100 p-4 border-r border-slate-200 flex flex-col gap-2">
          <div className="flex items-center gap-2 px-4 py-4 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Send className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-slate-800">TeleBot</h1>
          </div>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            Manual Send
          </button>
          
          <button
            onClick={() => setActiveTab('auto')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'auto' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            Auto-Reply Bot
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'broadcast' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            Broadcast
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[800px]">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Dashboard</h2>
                <p className="text-slate-500 text-sm">Overview of your bot's activity.</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-blue-600">Subscribers</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-900">{stats.subscribers}</p>
                </div>
                <div className="bg-purple-50 p-5 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                      <Settings className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-purple-600">Active Rules</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-900">{stats.rules}</p>
                </div>
                <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-green-600">Messages Logged</span>
                  </div>
                  <p className="text-3xl font-bold text-green-900">{stats.messages}</p>
                </div>
              </div>

              {/* How to Use Guide */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-600" /> How to Use
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                      <div>
                        <p className="font-medium text-slate-800">Start the Bot</p>
                        <p>Go to the <strong>Auto-Reply Bot</strong> tab, enter your Telegram Bot Token, and click "Start".</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                      <div>
                        <p className="font-medium text-slate-800">Add Rules</p>
                        <p>Define keywords (e.g., "Hello") and the bot's response (Text or Document). The bot checks these first.</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                      <div>
                        <p className="font-medium text-slate-800">Enable AI Smart Reply</p>
                        <p>Toggle <strong>AI Smart Reply</strong> to let Gemini AI answer questions that don't match any rules. It uses Google Search for up-to-date info.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">4</div>
                      <div>
                        <p className="font-medium text-slate-800">Chat on Telegram</p>
                        <p>Users can now chat with your bot. Check the <strong>Recent Messages</strong> log below to see activity.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Logs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <History className="w-4 h-4" /> Recent Messages
                  </h3>
                  <button onClick={fetchDashboardData} className="text-xs text-blue-600 hover:underline">Refresh</button>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {logs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No messages logged yet.
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Message</th>
                          <th className="px-4 py-3 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {log.username}
                              <div className="text-xs text-slate-400 font-normal">{log.chat_id}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{log.text}</td>
                            <td className="px-4 py-3 text-right text-slate-400 text-xs">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="max-w-md mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Send File to Group</h2>
                <p className="text-slate-500 text-sm">Manually send a document to a specific chat ID.</p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Bot Token</label>
                  <input
                    type="password"
                    value={manualBotToken}
                    onChange={(e) => setManualBotToken(e.target.value)}
                    placeholder={configToken ? "Using configured token..." : "123:ABC..."}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                  />
                  {configToken && !manualBotToken && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Using bot token from Auto-Reply settings
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Chat ID / Username <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="-100... or @channel_name"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    Enter the numeric Chat ID or the Channel/Group Username (e.g. @mychannel)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">File <span className="text-red-500">*</span></label>
                  <div className="relative group">
                    <input
                      type="file"
                      onChange={handleManualFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`w-full px-4 py-8 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${file ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 group-hover:border-blue-400'}`}>
                      {file ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-blue-600" />
                          <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{file.name}</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-400" />
                          <p className="text-sm text-slate-500">Click to upload</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Caption</label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Optional..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                  />
                </div>

                <AnimatePresence mode="wait">
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`rounded-lg p-3 text-sm flex items-start gap-2 ${status === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}
                    >
                      {status === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                      <span>{message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={status === 'uploading'}
                  className={`w-full py-3 px-4 rounded-xl font-medium text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all ${status === 'uploading' ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {status === 'uploading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {status === 'uploading' ? 'Sending...' : 'Send Now'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'auto' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Auto-Reply Bot</h2>
                <p className="text-slate-500 text-sm">Configure the bot to automatically reply to keywords.</p>
              </div>

              {/* Bot Configuration */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Configuration
                  </h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${botRunning ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${botRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                    {botRunning ? 'Running' : 'Stopped'}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={configToken}
                    onChange={(e) => setConfigToken(e.target.value)}
                    placeholder="Enter Bot Token to Start..."
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-sm"
                    disabled={botRunning}
                  />
                  <button
                    onClick={toggleBot}
                    className={`px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-all ${botRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {botRunning ? <><Square className="w-4 h-4 fill-current" /> Stop</> : <><Play className="w-4 h-4 fill-current" /> Start</>}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${aiEnabled ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">AI Smart Reply</p>
                      <p className="text-xs text-slate-500">Use Gemini AI to answer unknown queries</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleAi}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiEnabled ? 'bg-purple-600' : 'bg-slate-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aiEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Add New Rule */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800">Add Auto-Reply Rule</h3>
                <form onSubmit={handleAddRule} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={newRuleKeyword}
                      onChange={(e) => setNewRuleKeyword(e.target.value)}
                      placeholder="Keyword (e.g. /start)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <select
                      value={newRuleType}
                      onChange={(e) => setNewRuleType(e.target.value as 'text' | 'document')}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white"
                    >
                      <option value="text">Text</option>
                      <option value="document">File</option>
                    </select>
                  </div>
                  <div className="md:col-span-5">
                    {newRuleType === 'text' ? (
                      <input
                        type="text"
                        value={newRuleContent}
                        onChange={(e) => setNewRuleContent(e.target.value)}
                        placeholder="Reply message..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-sm"
                      />
                    ) : (
                      <input
                        type="file"
                        onChange={(e) => e.target.files && setNewRuleFile(e.target.files[0])}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={ruleStatus === 'saving'}
                      className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
                    >
                      {ruleStatus === 'saving' ? 'Adding...' : 'Add Rule'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Rules List */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800">Active Rules</h3>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {rules.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No rules configured yet. Add one above!
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                          <th className="px-4 py-3">Keyword</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Content</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rules.map((rule) => (
                          <tr key={rule.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-800">{rule.keyword}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${rule.response_type === 'text' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                {rule.response_type === 'text' ? <MessageSquare className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                {rule.response_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">
                              {rule.response_type === 'text' ? rule.content : rule.filename}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'broadcast' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Broadcast Message</h2>
                <p className="text-slate-500 text-sm">Send a message or file to all users who have interacted with the bot.</p>
              </div>

              <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Subscribers</p>
                  <p className="text-2xl font-bold text-blue-900">{subscriberCount}</p>
                </div>
              </div>

              <form onSubmit={handleBroadcastSubmit} className="space-y-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Message</label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Type your broadcast message here..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Attachment (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => e.target.files && setBroadcastFile(e.target.files[0])}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {broadcastStatus === 'success' && (
                  <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Sent to {broadcastResult.sent} users ({broadcastResult.failed} failed)</span>
                  </div>
                )}

                {broadcastStatus === 'error' && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Failed to send broadcast. Check console for details.</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={broadcastStatus === 'sending' || subscriberCount === 0}
                  className={`w-full py-3 px-4 rounded-xl font-medium text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all ${broadcastStatus === 'sending' || subscriberCount === 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {broadcastStatus === 'sending' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {broadcastStatus === 'sending' ? 'Sending Broadcast...' : 'Send Broadcast'}
                </button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

