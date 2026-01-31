import React, { useState, useEffect } from 'react';
import { Save, Building2, MessageSquare, Bot, Globe, Key, Bell, ShieldCheck, Zap } from 'lucide-react';

const BACKEND_URL = "http://127.0.0.1:5000/api";

export const SettingsPortal: React.FC = () => {
    const [settings, setSettings] = useState({
        clinic_name: '',
        booking_url: '',
        kapso_api_key: '',
        kapso_phone_id: '',
        telegram_token: '',
        ai_tone: 'friendly'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/settings`);
                if (res.ok) {
                    const data = await res.json();
                    setSettings(prev => ({ ...prev, ...data }));
                } else {
                    setLoadError(true);
                }
            } catch (e) {
                setLoadError(true);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${BACKEND_URL}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                alert("Settings saved successfully! 🐾");
            } else {
                alert("Failed to save settings.");
            }
        } catch (e) {
            alert("Error saving settings.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-1">Clinic Settings</h1>
                    <p className="text-slate-500 font-medium">Configure your workspace and AI preferences</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    <Save size={18} />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {loadError && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-800">
                    <Zap size={20} className="text-amber-500" />
                    <p className="text-sm font-bold text-amber-900">Backend connection error. Please ensure the Kizuna server is running on port 5000.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Clinic Profile */}
                <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-indigo-100 p-3 rounded-2xl">
                            <Building2 className="text-indigo-600" size={24} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Clinic Profile</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black">Clinic Name</label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <input 
                                    className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    value={settings.clinic_name}
                                    onChange={e => setSettings({...settings, clinic_name: e.target.value})}
                                    placeholder="Enter clinic name"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black">Booking URL</label>
                            <div className="relative">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <input 
                                    className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    value={settings.booking_url}
                                    onChange={e => setSettings({...settings, booking_url: e.target.value})}
                                    placeholder="https://"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* AI Assistant Configuration */}
                <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-amber-100 p-3 rounded-2xl">
                            <Bot className="text-amber-600" size={24} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">AI Assistant</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="ai-tone" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black">Tone of Voice</label>
                            <select 
                                id="ai-tone"
                                aria-label="Select AI assistant tone of voice"
                                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                value={settings.ai_tone}
                                onChange={e => setSettings({...settings, ai_tone: e.target.value})}
                            >
                                <option value="friendly">Friendly & Warm 🐾</option>
                                <option value="professional">Professional & Direct 🏥</option>
                                <option value="urgent">Urgent & Medical 🚨</option>
                            </select>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                            <p className="text-xs font-bold text-amber-800 leading-relaxed">
                                The AI uses this tone when generating WhatsApp reminders and monthly wellness campaigns.
                            </p>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};
