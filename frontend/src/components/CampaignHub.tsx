import React, { useState, useEffect } from 'react';
import { Sparkles, Send, Trash2, Calendar, Plus, Zap, Pill, Heart, Shield, Cat, Dog, PartyPopper, Syringe, Clock, Users, CheckCircle2 } from 'lucide-react';

const BACKEND_URL = "http://127.0.0.1:5000/api";

// Predefined campaign templates for veterinary clinics
const CAMPAIGN_TEMPLATES = [
    {
        id: 'deworming',
        name: 'Deworming Reminder',
        description: 'Remind pet owners about regular deworming schedules',
        icon: Pill,
        color: 'from-emerald-500 to-teal-600',
        bgColor: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        defaultMessage: "🐾 Hi {owner_name}! It's time for {pet_name}'s deworming treatment. Regular deworming protects your pet from internal parasites and keeps them healthy. Book your appointment today! 💚",
        target: 'All Patients'
    },
    {
        id: 'wellness',
        name: 'Wellness Check-up',
        description: 'Annual wellness examination reminders',
        icon: Heart,
        color: 'from-rose-500 to-pink-600',
        bgColor: 'bg-rose-50',
        iconColor: 'text-rose-600',
        defaultMessage: "💝 Hello {owner_name}! {pet_name} is due for their annual wellness check-up. Regular exams help detect health issues early. Schedule their visit today! 🏥",
        target: 'All Patients'
    },
    {
        id: 'rabies',
        name: 'Rabies Vaccination',
        description: 'Critical rabies vaccine reminders',
        icon: Shield,
        color: 'from-red-500 to-orange-600',
        bgColor: 'bg-red-50',
        iconColor: 'text-red-600',
        defaultMessage: "🛡️ Important! {pet_name}'s rabies vaccination is due. Rabies vaccination is required by law and protects both your pet and family. Book now at Kizuna Vet! 💉",
        target: 'All Patients'
    },
    {
        id: 'dhlpp',
        name: 'DHLPP Vaccination',
        description: 'Distemper, Hepatitis, Leptospirosis, Parvo & Parainfluenza',
        icon: Syringe,
        color: 'from-blue-500 to-indigo-600',
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600',
        defaultMessage: "💙 Hi {owner_name}! {pet_name} is due for their DHLPP vaccine (Distemper, Hepatitis, Leptospirosis, Parvo & Parainfluenza). This essential vaccine keeps dogs protected. Schedule today! 🐕",
        target: 'Dogs Only'
    },
    {
        id: 'feline',
        name: 'Feline Vaccination',
        description: 'FVRCP and FeLV vaccines for cats',
        icon: Cat,
        color: 'from-purple-500 to-violet-600',
        bgColor: 'bg-purple-50',
        iconColor: 'text-purple-600',
        defaultMessage: "🐱 Hello {owner_name}! {pet_name} is due for their feline vaccination (FVRCP/FeLV). Keep your kitty protected from common diseases. Book their appointment! 💜",
        target: 'Cats Only'
    },
    {
        id: 'new-month',
        name: 'Happy New Month',
        description: 'Monthly greetings to build client relationships',
        icon: PartyPopper,
        color: 'from-evergreen to-marine',
        bgColor: 'bg-sage/10',
        iconColor: 'text-marine',
        defaultMessage: "🎉 Happy New Month, {owner_name}! Wishing you and {pet_name} a wonderful month ahead filled with health and happiness! From all of us at Kizuna Vet Center 🐾💚",
        target: 'All Patients'
    }
];

interface Campaign {
    id: string;
    name: string;
    message: string;
    target_audience: string;
    status: string;
    sent_count?: number;
    created_at?: string;
}

export const CampaignHub: React.FC = () => {
    const [drafts, setDrafts] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<typeof CAMPAIGN_TEMPLATES[0] | null>(null);
    const [campaignDraft, setCampaignDraft] = useState({ name: '', message: '', target: 'All Patients' });
    const [draftMessages, setDraftMessages] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<'templates' | 'active'>('templates');

    const fetchDrafts = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/agent/drafts`);
            const data = await res.json();
            setDrafts(data);
        } catch (e) {
            console.error("Drafts fetch failed");
        }
    };

    const fetchCampaigns = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/campaigns`);
            const data = await res.json();
            setCampaigns(data);
            setLoading(false);
        } catch (e) {
            console.error("Campaigns fetch failed");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrafts();
        fetchCampaigns();
    }, []);

    const handleSelectTemplate = (template: typeof CAMPAIGN_TEMPLATES[0]) => {
        setSelectedTemplate(template);
        setCampaignDraft({
            name: template.name,
            message: template.defaultMessage,
            target: template.target
        });
        setIsCreateModalOpen(true);
    };

    const handleCreateCustom = () => {
        setSelectedTemplate(null);
        setCampaignDraft({ name: '', message: '', target: 'All Patients' });
        setIsCreateModalOpen(true);
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${BACKEND_URL}/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(campaignDraft)
            });
            if (res.ok) {
                setIsCreateModalOpen(false);
                setCampaignDraft({ name: '', message: '', target: 'All Patients' });
                setSelectedTemplate(null);
                fetchCampaigns();
            }
        } catch (e) {
            console.error("Failed to create campaign");
        }
    };

    const process_draft = async (draftId: string, approved: boolean) => {
        try {
            await fetch(`${BACKEND_URL}/agent/process-draft`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ draftId, approved, message: draftMessages[draftId] || '' })
            });
            fetchDrafts();
        } catch (e) {
            console.error("Process failed");
        }
    };

    const generateAutoWishes = async () => {
        await fetch(`${BACKEND_URL}/agent/generate-auto-wishes`, { method: 'POST' });
        fetchDrafts();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-marine border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-semibold">Loading Campaign Hub...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-1">Campaign Hub</h1>
                    <p className="text-slate-500 font-medium">Engage your clients with targeted campaigns</p>
                </div>
                <button 
                    type="button"
                    onClick={handleCreateCustom}
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-transform"
                >
                    <Plus size={18} />
                    Custom Campaign
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
                <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        activeTab === 'templates' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Campaign Templates
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('active')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        activeTab === 'active' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Active Campaigns
                    {campaigns.length > 0 && (
                        <span className="bg-marine text-white text-xs px-2 py-0.5 rounded-full">{campaigns.length}</span>
                    )}
                </button>
            </div>

            {/* Templates Tab */}
            {activeTab === 'templates' && (
                <div className="space-y-8">
                    {/* Campaign Templates Grid */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Zap className="text-marine" size={20} />
                            Quick Campaign Templates
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {CAMPAIGN_TEMPLATES.map((template) => {
                                const IconComponent = template.icon;
                                return (
                                    <div 
                                        key={template.id}
                                        onClick={() => handleSelectTemplate(template)}
                                        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 cursor-pointer transition-all group"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`${template.bgColor} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
                                                <IconComponent className={template.iconColor} size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-900 mb-1">{template.name}</h3>
                                                <p className="text-sm text-slate-500 line-clamp-2">{template.description}</p>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                                                        {template.target}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* AI-Generated Drafts Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-100 p-2 rounded-xl">
                                    <Sparkles className="text-indigo-600" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">AI-Generated Wishes</h2>
                                    <p className="text-sm text-slate-500">Automated birthday & anniversary messages</p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={generateAutoWishes}
                                className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all"
                            >
                                Scan for Celebrations
                            </button>
                        </div>

                        {drafts.length === 0 ? (
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                                <Calendar size={32} className="mx-auto mb-3 text-slate-300" />
                                <p className="font-semibold text-slate-500">No upcoming celebrations</p>
                                <p className="text-sm text-slate-400 mt-1">The AI will auto-generate messages for pet birthdays & anniversaries</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {drafts.map((draft) => (
                                    <div key={draft.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                                {draft.type}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(draft.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        
                                        <p className="font-semibold text-slate-800 mb-2">
                                            To: {draft.owner_name} <span className="text-slate-400">({draft.pet_name})</span>
                                        </p>
                                        
                                        <textarea 
                                            className="w-full bg-slate-50 p-3 rounded-xl text-sm text-slate-600 border-none outline-none focus:ring-2 focus:ring-indigo-200 mb-3 resize-none"
                                            rows={3}
                                            aria-label="Edit campaign message"
                                            value={draftMessages[draft.id] || draft.draft_message}
                                            onChange={(e) => setDraftMessages(prev => ({ ...prev, [draft.id]: e.target.value }))}
                                        />

                                        <div className="flex gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => process_draft(draft.id, true)}
                                                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                                            >
                                                <Send size={14} /> Send
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => process_draft(draft.id, false)}
                                                className="bg-slate-100 text-slate-500 p-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"
                                                aria-label="Reject draft"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Active Campaigns Tab */}
            {activeTab === 'active' && (
                <div className="space-y-4">
                    {campaigns.length === 0 ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                            <Users size={40} className="mx-auto mb-4 text-slate-300" />
                            <p className="font-bold text-slate-600 mb-2">No active campaigns yet</p>
                            <p className="text-sm text-slate-400 mb-6">Create your first campaign using the templates above</p>
                            <button
                                type="button"
                                onClick={() => setActiveTab('templates')}
                                className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors"
                            >
                                Browse Templates
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {campaigns.map((campaign) => (
                                <div key={campaign.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="bg-sage/10 p-2.5 rounded-xl">
                                            <Zap className="text-marine" size={20} />
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                            campaign.status === 'sent' 
                                                ? 'bg-green-100 text-green-600' 
                                                : campaign.status === 'draft'
                                                ? 'bg-sage/10 text-evergreen'
                                                : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {campaign.status}
                                        </span>
                                    </div>
                                    
                                    <h3 className="font-bold text-slate-900 mb-2">{campaign.name}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{campaign.message}</p>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <Users size={14} className="text-slate-400" />
                                            <span className="text-sm font-medium text-slate-600">{campaign.target_audience}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <CheckCircle2 size={14} className="text-green-500" />
                                            <span className="text-sm font-bold text-green-600">{campaign.sent_count || 0} sent</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create Campaign Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in modal-overlay">
                    <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="create-campaign-title">
                        {selectedTemplate && (
                            <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${selectedTemplate.color}`} />
                        )}
                        {!selectedTemplate && (
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-slate-700 to-slate-900" />
                        )}
                        
                        <button 
                            type="button" 
                            onClick={() => {
                                setIsCreateModalOpen(false);
                                setSelectedTemplate(null);
                            }} 
                            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1" 
                            aria-label="Close modal"
                        >
                            <Plus size={24} className="rotate-45" />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-6">
                            {selectedTemplate && (
                                <div className={`${selectedTemplate.bgColor} p-3 rounded-xl`}>
                                    <selectedTemplate.icon className={selectedTemplate.iconColor} size={24} />
                                </div>
                            )}
                            <div>
                                <h2 id="create-campaign-title" className="text-xl font-black text-slate-900">
                                    {selectedTemplate ? selectedTemplate.name : 'Custom Campaign'}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    {selectedTemplate ? selectedTemplate.description : 'Create your own campaign from scratch'}
                                </p>
                            </div>
                        </div>
                        
                        <form onSubmit={handleCreateCampaign} className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="campaign-name" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                                    Campaign Name
                                </label>
                                <input 
                                    id="campaign-name" 
                                    required 
                                    type="text" 
                                    placeholder="e.g. Monthly Deworming Reminder…" 
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium" 
                                    value={campaignDraft.name} 
                                    onChange={e => setCampaignDraft({...campaignDraft, name: e.target.value})} 
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label htmlFor="campaign-message" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                                    Message Content
                                </label>
                                <textarea 
                                    id="campaign-message" 
                                    required 
                                    rows={5} 
                                    placeholder="Write your WhatsApp message here. Use {owner_name} and {pet_name} for personalization…" 
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none font-medium" 
                                    value={campaignDraft.message} 
                                    onChange={e => setCampaignDraft({...campaignDraft, message: e.target.value})} 
                                />
                                <p className="text-xs text-slate-400">Use {'{owner_name}'} and {'{pet_name}'} for personalization</p>
                            </div>
                            
                            <div className="space-y-2">
                                <label htmlFor="campaign-target" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                                    Target Audience
                                </label>
                                <select 
                                    id="campaign-target" 
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-marine transition-all font-medium" 
                                    value={campaignDraft.target} 
                                    onChange={e => setCampaignDraft({...campaignDraft, target: e.target.value})}
                                >
                                    <option>All Patients</option>
                                    <option>Dogs Only</option>
                                    <option>Cats Only</option>
                                    <option>Overdue Patients</option>
                                    <option>Due This Month</option>
                                </select>
                            </div>
                            
                            <button 
                                type="submit" 
                                className={`w-full text-white py-4 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform ${
                                    selectedTemplate 
                                        ? `bg-gradient-to-r ${selectedTemplate.color}` 
                                        : 'bg-slate-900'
                                }`}
                            >
                                Create Campaign
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
