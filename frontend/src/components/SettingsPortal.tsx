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
                    <h1 className="text-3xl font-black text-ink mb-1">Clinic Settings</h1>
                    <p className="text-ink/50 font-medium">Configure your workspace and AI preferences</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-ink text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    <Save size={18} />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {loadError && (
                <div className="bg-sage/5 border border-sage/10 p-4 rounded-2xl flex items-center gap-3 text-evergreen">
                    <Zap size={20} className="text-marine" />
                    <p className="text-sm font-bold opacity-80">Backend connection error. Please ensure the Kizuna server is running on port 5000.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Clinic Profile */}
                <section className="bg-white p-8 rounded-[2.5rem] border border-ink/5 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-marine/10 p-3 rounded-2xl">
                            <Building2 className="text-marine" size={24} />
                        </div>
                        <h3 className="text-xl font-black text-ink">Clinic Profile</h3>
                    </div>
 
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-ink/30 uppercase tracking-wider pl-1 font-black">Clinic Name</label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/20" size={16} />
                                <input 
                                    className="w-full bg-mist border-none rounded-2xl pl-12 pr-4 py-3.5 font-bold text-ink outline-none focus:ring-2 focus:ring-marine transition-all"
                                    value={settings.clinic_name}
                                    onChange={e => setSettings({...settings, clinic_name: e.target.value})}
                                    placeholder="Enter clinic name"
                                />
                            </div>
                        </div>
 
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-ink/30 uppercase tracking-wider pl-1 font-black">Booking URL</label>
                            <div className="relative">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/20" size={16} />
                                <input 
                                    className="w-full bg-mist border-none rounded-2xl pl-12 pr-4 py-3.5 font-bold text-ink outline-none focus:ring-2 focus:ring-marine transition-all"
                                    value={settings.booking_url}
                                    onChange={e => setSettings({...settings, booking_url: e.target.value})}
                                    placeholder="https://"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* AI Assistant Configuration */}
                <section className="bg-white p-8 rounded-[2.5rem] border border-ink/5 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-sage/10 p-3 rounded-2xl">
                            <Bot className="text-evergreen" size={24} />
                        </div>
                        <h3 className="text-xl font-black text-ink">AI Assistant</h3>
                    </div>
 
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="ai-tone" className="text-xs font-bold text-ink/30 uppercase tracking-wider pl-1 font-black">Tone of Voice</label>
                            <select 
                                id="ai-tone"
                                aria-label="Select AI assistant tone of voice"
                                className="w-full bg-mist border-none rounded-2xl px-4 py-3.5 font-bold text-ink outline-none focus:ring-2 focus:ring-marine transition-all"
                                value={settings.ai_tone}
                                onChange={e => setSettings({...settings, ai_tone: e.target.value})}
                            >
                                <option value="friendly">Friendly & Warm 🐾</option>
                                <option value="professional">Professional & Direct 🏥</option>
                                <option value="urgent">Urgent & Medical 🚨</option>
                            </select>
                        </div>
 
                        <div className="p-4 bg-sage/5 rounded-2xl border border-sage/10">
                            <p className="text-xs font-bold text-evergreen opacity-80 leading-relaxed">
                                The AI uses this tone when generating WhatsApp reminders and monthly wellness campaigns.
                            </p>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};
