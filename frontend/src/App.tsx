import React, { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Users,
  Plus,
  Settings,
  LogOut,
  Bell,
  CheckCircle2,
  Sparkles,
  Search,
  MessageSquare,
  Zap,
  Phone,
  LayoutDashboard,
  Calendar,
  Layers,
  Bot,
  Megaphone,
  FileText,
  Mic,
  MessagesSquare,
} from "lucide-react";
import { Pet, Reminder } from "./types";
import { INITIAL_PETS, INITIAL_REMINDERS } from "./constants";
import { PetList } from "./components/PetList";
import { DashboardOverview } from "./components/DashboardOverview";
import { CampaignHub } from "./components/CampaignHub";
import { LandingPage } from "./components/LandingPage";
import { SettingsPortal } from "./components/SettingsPortal";
import { AuthPortal } from "./components/AuthPortal";
import { ScribeWorkspace } from "./components/ScribeWorkspace";
import { CareInbox } from "./components/CareInbox";
import { getAnalyticsSummary } from "./services/geminiService";
import { apiFetch } from "./services/api";
import { supabase } from "./services/supabase";

interface TenantInfo {
  userId: string;
  email?: string;
  clinicId: string;
  clinicName: string;
  role: string;
}

const App: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const isDemo = searchParams.get("demo") === "1";
  const initialView = searchParams.get("view");
  const [showLanding, setShowLanding] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(!isDemo);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [tenant, setTenant] = useState<TenantInfo | null>(
    isDemo
      ? {
          userId: "demo-user",
          email: "demo@kizuna.africa",
          clinicId: "demo-clinic",
          clinicName: "Kizuna Veterinary Centre",
          role: "owner",
        }
      : null,
  );
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "scribe" | "care" | "pets" | "reminders" | "campaigns" | "settings"
  >(
    initialView === "scribe"
      ? "scribe"
      : initialView === "care"
        ? "care"
        : "dashboard",
  );
  const [pets, setPets] = useState<Pet[]>(isDemo ? INITIAL_PETS : []);
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
  const [aiInsight, setAiInsight] = useState<string>(
    isDemo
      ? "Three patients are due for follow-up this week. Review Fluffy's overdue checkup first, then prepare vaccination reminders for Bingo and Luna."
      : "",
  );
  const [isGeneratingMessage, setIsGeneratingMessage] =
    useState<boolean>(false);
  const [isAddPetModalOpen, setIsAddPetModalOpen] = useState<boolean>(false);
  const [newPet, setNewPet] = useState({
    name: "",
    ownerName: "",
    ownerPhone: "",
    species: "Dog",
    breed: "",
    sex: "Male",
    color: "",
    age: "",
    weight: "",
    status: "Healthy",
    lastVaccinationDate: "",
    lastDewormingDate: "",
    lastCheckupDate: "",
    nextVaccinationDate: "",
  });
  const [notifications, setNotifications] = useState<string[]>([]);
  const [settings, setSettings] = useState<any>({});

  const clinicInfo = {
    name: settings.clinic_name || tenant?.clinicName || "Kizuna Vet Center",
    bookingLink: settings.booking_url || "https://book.vet/kizuna",
    whatsappNumber: settings.whatsapp_number || "2348000000000",
  };

  const stats = {
    totalPets: pets.length,
    remindersSent: reminders.length,
    conversionRate:
      reminders.length > 0
        ? (reminders.filter((r) => r.status === "converted").length /
            reminders.length) *
          100
        : 0,
    estimatedRevenue:
      reminders.filter((r) => r.status === "converted").length * 5000,
  };

  const loadTenant = useCallback(async () => {
    setTenantLoading(true);
    try {
      const response = await apiFetch("/auth/me");
      if (response.status === 403) {
        setTenant(null);
        setNeedsOnboarding(true);
        return;
      }
      if (!response.ok) throw new Error("Unable to load clinic workspace.");
      setTenant(await response.json());
      setNeedsOnboarding(false);
    } catch (error) {
      console.error("Tenant load failed:", error);
      setTenant(null);
    } finally {
      setTenantLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDemo) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) setShowLanding(false);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setShowLanding(!nextSession);
      setTenant(null);
      setNeedsOnboarding(false);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [isDemo]);

  useEffect(() => {
    if (session && !isDemo) void loadTenant();
  }, [session, loadTenant, isDemo]);

  const fetchPets = useCallback(async () => {
    if (!tenant || isDemo) return;
    try {
      const response = await apiFetch("/pets");
      if (response.ok) {
        const data = await response.json();
        setPets(data || []);
      } else {
        // Backend issue
      }
    } catch (err) {
      console.error("Backend connection failed:", err);
    }
  }, [tenant, isDemo]);

  const fetchSettings = useCallback(async () => {
    if (!tenant || isDemo) return;
    try {
      const response = await apiFetch("/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  }, [tenant, isDemo]);

  useEffect(() => {
    if (!tenant || isDemo) return;
    fetchPets();
    fetchSettings();
    const fetchInsight = async () => {
      try {
        const summary = await getAnalyticsSummary(stats);
        setAiInsight(summary);
      } catch (e) {
        setAiInsight("AI Insights temporarily unavailable.");
      }
    };
    fetchInsight();
  }, [tenant, stats.remindersSent, fetchPets, fetchSettings, isDemo]);

  const enterDemo = () => {
    window.location.assign("/?demo=1");
  };

  const exitWorkspace = () => {
    if (isDemo) {
      window.location.assign("/");
      return;
    }
    void supabase.auth.signOut();
  };

  const handleSendReminder = async (pet: Pet) => {
    if (isDemo) {
      const demoReminder: Reminder = {
        id: `demo-${Date.now()}`,
        petId: pet.id,
        petName: pet.name,
        message: `Hello ${pet.ownerName}, ${pet.name} is due for a follow-up at Kizuna Veterinary Centre.`,
        sentAt: new Date().toISOString(),
        status: "sent",
        type: "checkup",
      };
      setReminders((current) => [demoReminder, ...current]);
      showNotification("Demo reminder created. Nothing was sent.");
      return;
    }
    setIsGeneratingMessage(true);
    try {
      const response = await apiFetch("/reminders/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petName: pet.name,
          ownerName: pet.ownerName,
          clinicName: clinicInfo.name,
          type: pet.status === "Overdue" ? "vaccination" : "checkup",
          bookingUrl: clinicInfo.bookingLink,
          tone: settings.ai_tone || "friendly",
        }),
      });
      const { message } = await response.json();

      const sendResponse = await apiFetch("/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: pet.ownerPhone,
          message: message,
          petId: pet.id,
        }),
      });

      if (sendResponse.ok) {
        const newReminder: Reminder = {
          id: `r${Date.now()}`,
          petId: pet.id,
          petName: pet.name,
          message,
          sentAt: new Date().toISOString(),
          status: "sent",
          type: pet.status === "Overdue" ? "vaccination" : "checkup",
        };
        setReminders((prev) => [newReminder, ...prev]);
        showNotification(`Reminder sent to ${pet.name}'s owner!`);
      } else {
        const errData = await sendResponse.json();
        showNotification(`Failed: ${errData.detail || "Error sending reminder"}`);
      }
    } catch (err) {
      console.error("Reminder Error:", err);
      showNotification("Error connecting to reminder service.");
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleCreatePet = async () => {
    if (isDemo) {
      setPets((current) => [
        ...current,
        {
          id: `demo-pet-${Date.now()}`,
          ...newPet,
          status: "Healthy",
        },
      ]);
      setIsAddPetModalOpen(false);
      showNotification(`${newPet.name} added to the demo workspace.`);
      return;
    }
    try {
      const response = await apiFetch("/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPet),
      });
      if (response.ok) {
        const savedPet = await response.json();
        // Since the backend returns camelCase ownerName but db has owner_name, 
        // and fetchPets handles mapping, it's safer to just fetch again or ensure the mapping here.
        // But map_pet handles it.
        await fetchPets(); 
        setIsAddPetModalOpen(false);
        setNewPet({
          name: "",
          ownerName: "",
          ownerPhone: "",
          species: "Dog",
          breed: "",
          age: "",
          weight: "",
          status: "Healthy",
        });
        showNotification(`${newPet.name} added!`);
      } else {
        const errData = await response.json();
        console.error("Add pet failed:", errData);
        showNotification("Failed to add pet: " + (errData.detail || "Server error"));
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to add pet.");
    }
  };

  const handleDeletePet = async (petId: string) => {
    if (!window.confirm("Are you sure you want to delete this patient record? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await apiFetch(`/pets/${petId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setPets((prev) => prev.filter((p) => p.id !== petId));
        showNotification("Patient record deleted.");
      } else {
        showNotification("Failed to delete pet.");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error deleting pet.");
    }
  };

  const showNotification = (msg: string) => {
    setNotifications((prev) => [...prev, msg]);
    setTimeout(() => setNotifications((prev) => prev.slice(1)), 4000);
  };

  if (authLoading && !isDemo) {
    return <div className="min-h-dvh bg-stone-50" />;
  }

  if (!session && !isDemo) {
    return showLanding ? (
      <LandingPage onGetStarted={() => setShowLanding(false)} />
    ) : (
      <AuthPortal
        mode="auth"
        onBack={() => setShowLanding(true)}
        onDemo={enterDemo}
        onReady={() => setShowLanding(false)}
      />
    );
  }

  if (tenantLoading && !tenant) {
    return (
      <div className="min-h-dvh bg-stone-50 flex items-center justify-center font-bold text-ink/60">
        Loading your clinic workspace...
      </div>
    );
  }

  if (needsOnboarding) {
    return <AuthPortal mode="onboarding" onReady={loadTenant} />;
  }

  if (!tenant) {
    return (
      <div className="min-h-dvh bg-stone-50 flex items-center justify-center p-6 text-center">
        <div>
          <p className="font-bold text-ink">Your clinic workspace could not be loaded.</p>
          <button className="mt-4 text-marine font-bold" onClick={loadTenant}>Try again</button>
        </div>
      </div>
    );
  }

  if (showLanding && !isDemo) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  return (
    <div className="kizuna-app-shell min-h-dvh font-sans selection:bg-marine/10 selection:text-ink flex">
      {/* Mobile Header */}
      <div className="lg:hidden absolute top-0 w-full glass-panel z-40 px-6 py-4 flex items-center justify-between border-b border-white/20">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Kizuna Logo" className="w-8 h-8 object-contain" />
          <span className="text-lg font-black tracking-tighter text-ink">
            Kizuna<span className="text-marine">.</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="relative p-2 text-ink/40 hover:bg-ink/5 rounded-xl transition-colors"
          >
            <Bell size={20} aria-hidden="true" />
            <span
              className="absolute top-2 right-2 w-2 h-2 bg-marine rounded-full border-2 border-white"
              aria-hidden="true"
            ></span>
          </button>
          <button
            type="button"
            aria-label="Sign out"
            onClick={exitWorkspace}
            className="p-2 text-ink/40 hover:bg-ink/5 hover:text-ink rounded-xl transition-colors"
          >
            <LogOut size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-stone-200 h-dvh sticky top-0 flex-col justify-between p-6">
        <div>
          <div
            className="flex items-center gap-3 px-2 mb-12 cursor-pointer"
            onClick={exitWorkspace}
          >
            <img src="/logo.png" alt="Kizuna Logo" className="w-10 h-10 object-contain" />
            <span className="text-2xl font-black tracking-tighter text-ink">
              Kizuna<span className="text-marine">.</span>
            </span>
          </div>

          <nav className="space-y-2">
            <NavItem
              icon={<LayoutDashboard size={20} />}
              label="Dashboard"
              active={activeTab === "dashboard"}
              onClick={() => setActiveTab("dashboard")}
            />
            <NavItem
              icon={<Mic size={20} />}
              label="Scribe"
              active={activeTab === "scribe"}
              onClick={() => setActiveTab("scribe")}
            />
            <NavItem
              icon={<MessagesSquare size={20} />}
              label="Care inbox"
              active={activeTab === "care"}
              onClick={() => setActiveTab("care")}
            />
            <NavItem
              icon={<Users size={20} />}
              label="Patients"
              active={activeTab === "pets"}
              onClick={() => setActiveTab("pets")}
            />
            <NavItem
              icon={<Calendar size={20} />}
              label="Reminders History"
              active={activeTab === "reminders"}
              onClick={() => setActiveTab("reminders")}
            />
            <NavItem
              icon={<MegaphoneIcon active={activeTab === "campaigns"} />}
              label="Campaigns"
              active={activeTab === "campaigns"}
              onClick={() => setActiveTab("campaigns")}
            />
            <div className="pt-6 mt-6 border-t border-ink/5">
              <p className="px-5 text-xs font-bold text-ink/30 uppercase tracking-wider mb-4">
                Settings
              </p>
              <NavItem
                icon={<Settings size={20} />}
                label="Settings"
                active={activeTab === "settings"}
                onClick={() => setActiveTab("settings")}
              />
            </div>
          </nav>
        </div>
        <button
          type="button"
          onClick={exitWorkspace}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-ink/50 hover:bg-ink/5 hover:text-ink"
        >
          <LogOut size={18} />
          {isDemo ? "Exit demo" : "Sign out"}
        </button>
      </aside>

      {/* Main Content Area */}
      <main
        className={`flex-1 p-4 pb-24 pt-20 lg:p-10 lg:pb-10 lg:pt-10 h-dvh overflow-y-auto ${
          activeTab === "scribe" ? "min-w-0" : "mx-auto w-full max-w-7xl"
        }`}
      >
        {isDemo && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-pretty font-semibold">
              You are viewing a sample clinic workspace. Changes stay in this browser preview and no messages are sent.
            </p>
            <button type="button" onClick={exitWorkspace} className="w-fit font-bold underline underline-offset-4">
              Exit demo
            </button>
          </div>
        )}

        {activeTab === "dashboard" && (
          <DashboardOverview
            clinicName={clinicInfo.name}
            pets={pets}
            reminders={reminders}
            aiInsight={aiInsight}
            onStartConsultation={() => setActiveTab("scribe")}
            onAddPatient={() => setIsAddPetModalOpen(true)}
            onViewPatients={() => setActiveTab("pets")}
            onViewReminders={() => setActiveTab("reminders")}
            onSendReminder={handleSendReminder}
          />
        )}

        {activeTab === "scribe" && (
          <ScribeWorkspace pets={pets} isDemo={isDemo} onNotice={showNotification} />
        )}

        {activeTab === "care" && (
          <CareInbox isDemo={isDemo} onNotice={showNotification} />
        )}

        {activeTab === "pets" && (
          <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">
                  Patient Records
                </h2>
                <p className="text-slate-500 font-medium">
                  Manage your furry clients and their histories.
                </p>
              </div>
              <div className="flex gap-3">
                <input
                  type="file"
                  id="excel-upload"
                  className="hidden"
                  accept=".xlsx, .xls, .csv"
                  aria-label="Upload Excel patient data"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append("file", file);

                    try {
                      const res = await apiFetch("/pets/import-excel", {
                        method: "POST",
                        body: formData,
                      });
                      const data = await res.json();
                      if (data.success) {
                        alert(`Successfully imported ${data.count} patients!`);
                        // Refresh pets list
                        const resPets = await apiFetch("/pets");
                        const updatedPets = await resPets.json();
                        setPets(updatedPets);
                      } else {
                        alert("Excel import failed: " + data.detail);
                      }
                    } catch (err) {
                      alert("Error uploading file: " + err);
                    }
                  }}
                />
                <button
                  onClick={() => document.getElementById("excel-upload")?.click()}
                  className="bg-white text-ink border border-ink/10 pl-4 pr-6 py-3 rounded-2xl font-bold flex items-center shadow-sm hover:bg-mist transition-all"
                >
                  <FileText className="mr-2" size={20} /> Import Excel
                </button>
                <button
                  onClick={() => setIsAddPetModalOpen(true)}
                  className="bg-slate-900 text-white pl-4 pr-6 py-3 rounded-2xl font-bold flex items-center shadow-lg shadow-slate-200 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus className="mr-2" size={20} /> Add Patient
                </button>
              </div>
            </div>
            <PetList pets={pets} onSendReminder={handleSendReminder} onDeletePet={handleDeletePet} />
          </div>
        )}

        {activeTab === "reminders" && (
          <div className="animate-fade-in text-center py-20 space-y-6">
            <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="text-slate-400" size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              Reminders History
            </h2>
            <p className="text-slate-500">
              View all sent reminders and their statuses here.
            </p>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-left max-w-4xl mx-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider text-left">
                    <th className="pb-4 font-bold">Sent At</th>
                    <th className="pb-4 font-bold">Pet</th>
                    <th className="pb-4 font-bold">Message</th>
                    <th className="pb-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reminders.map((r) => (
                    <tr key={r.id}>
                      <td className="py-4 text-sm font-bold text-slate-700">
                        {new Date(r.sentAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 text-sm font-bold text-slate-900">
                        {r.petName}
                      </td>
                      <td className="py-4 text-sm text-slate-500 truncate max-w-xs">
                        {r.message}
                      </td>
                      <td className="py-4">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold uppercase">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "campaigns" && <CampaignHub />}

        {activeTab === "settings" && <SettingsPortal />}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-8 flex justify-between items-center z-40">
        <MobileNavItem
          label="Dashboard"
          icon={<LayoutDashboard size={20} />}
          active={activeTab === "dashboard"}
          onClick={() => setActiveTab("dashboard")}
        />
        <MobileNavItem
          label="Patients"
          icon={<Users size={20} />}
          active={activeTab === "pets"}
          onClick={() => setActiveTab("pets")}
        />
        <MobileNavItem
          label="Scribe"
          icon={<Mic size={24} />}
          active={activeTab === "scribe"}
          onClick={() => setActiveTab("scribe")}
          highlight
        />
        <MobileNavItem
          label="Care inbox"
          icon={<MessagesSquare size={20} />}
          active={activeTab === "care"}
          onClick={() => setActiveTab("care")}
        />
        <MobileNavItem
          label="Settings"
          icon={<Settings size={20} />}
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
        />
      </div>

      {/* Add Pet Modal */}
      {isAddPetModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in modal-overlay"
        >
          <div
            className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-pet-modal-title"
          >
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex justify-between items-center mb-8">
              <h2
                id="add-pet-modal-title"
                className="text-2xl font-black text-slate-900"
              >
                Add New Patient
              </h2>
              <button
                type="button"
                onClick={() => setIsAddPetModalOpen(false)}
                className="bg-slate-50 p-2 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                aria-label="Close modal"
              >
                <LogOut size={20} className="rotate-45" aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreatePet();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="pet-name" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black">Pet Name</label>
                  <input
                    id="pet-name"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-black"
                    placeholder="e.g. Bella…"
                    value={newPet.name}
                    onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="pet-species" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black">Species</label>
                  <select
                    id="pet-species"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-black"
                    value={newPet.species}
                    onChange={(e) => setNewPet({ ...newPet, species: e.target.value })}
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Bird">Bird</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Breed & Sex */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="pet-breed" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black">Breed</label>
                  <input
                    id="pet-breed"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-black"
                    placeholder="e.g. Boerboel…"
                    value={newPet.breed}
                    onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="pet-sex" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black">Sex</label>
                  <select
                    id="pet-sex"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-black"
                    value={newPet.sex}
                    onChange={(e) => setNewPet({ ...newPet, sex: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Color, Age, Weight */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="pet-color" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black">Colour</label>
                  <input
                    id="pet-color"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-black"
                    placeholder="Brown"
                    value={newPet.color}
                    onChange={(e) => setNewPet({ ...newPet, color: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="pet-age" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black">Age</label>
                  <input
                    id="pet-age"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-black"
                    placeholder="3y 2m"
                    value={newPet.age}
                    onChange={(e) => setNewPet({ ...newPet, age: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="pet-weight" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black">Weight (kg)</label>
                  <input
                    id="pet-weight"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-black"
                    placeholder="12.5"
                    value={newPet.weight}
                    onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 4: Medical History (Dates) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="last-vax" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black text-indigo-500">Last Vaccination</label>
                  <input
                    id="last-vax"
                    type="date"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-black"
                    value={newPet.lastVaccinationDate}
                    onChange={(e) => setNewPet({ ...newPet, lastVaccinationDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="next-vax" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black text-rose-500">Next Visit Due</label>
                  <input
                    id="next-vax"
                    type="date"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500 transition-all font-black"
                    value={newPet.nextVaccinationDate}
                    onChange={(e) => setNewPet({ ...newPet, nextVaccinationDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="last-deworm" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black text-emerald-500">Last Deworming</label>
                  <input
                    id="last-deworm"
                    type="date"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-black"
                    value={newPet.lastDewormingDate}
                    onChange={(e) => setNewPet({ ...newPet, lastDewormingDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="last-check" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black text-amber-500">Last Checkup</label>
                  <input
                    id="last-check"
                    type="date"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-black"
                    value={newPet.lastCheckupDate}
                    onChange={(e) => setNewPet({ ...newPet, lastCheckupDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 5: Owner Details */}
              <div className="space-y-2">
                <label htmlFor="owner-name" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black">Owner Name</label>
                <input
                  id="owner-name"
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-black"
                  placeholder="e.g. Sarah Johnson…"
                  value={newPet.ownerName}
                  onChange={(e) => setNewPet({ ...newPet, ownerName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="owner-phone" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 font-black">WhatsApp Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs" aria-hidden="true">
                    <Phone size={14} />
                  </span>
                  <input
                    id="owner-phone"
                    required
                    type="tel"
                    inputMode="tel"
                    className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-black"
                    placeholder="e.g. 2348012345678…"
                    value={newPet.ownerPhone}
                    onChange={(e) => setNewPet({ ...newPet, ownerPhone: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] mt-4 hover:bg-slate-800 transition-all hover:scale-[1.01] active:scale-95 shadow-2xl shadow-slate-200"
              >
                Complete Patient Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sending Modal Overlay */}
      {isGeneratingMessage && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-6 animate-fade-in modal-overlay"
        >
          <div
            className="bg-white rounded-[2rem] p-8 shadow-2xl max-w-sm w-full text-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sending-modal-title"
            aria-live="polite"
          >
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <Sparkles
                className="text-amber-600 animate-spin-slow"
                size={32}
              />
              <div className="absolute inset-0 border-4 border-amber-100 rounded-full animate-ping"></div>
            </div>
            <h3
              id="sending-modal-title"
              className="text-xl font-black text-slate-900 mb-2"
            >
              Consulting Kizuna AI…
            </h3>
            <p className="text-slate-500 font-medium text-sm">
              Crafting the perfect personalized message for this client
            </p>
          </div>
        </div>
      )}

      {/* Floating Notifications */}
      <div className="fixed bottom-8 right-8 space-y-3 z-50">
        {notifications.map((note, i) => (
          <div
            key={i}
            className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center animate-fade-in border border-slate-800"
          >
            <div className="bg-green-500/20 p-1.5 rounded-lg mr-3">
              <CheckCircle2 size={16} className="text-green-400" />
            </div>
            <span className="text-sm font-bold">{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Component Definitions
const MegaphoneIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={active ? "text-marine" : "text-ink/40"}
  >
    <path d="m3 11 18-5v12L3 14v-3z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl font-bold transition-all ${
      active
        ? "bg-sage/10 text-evergreen shadow-sm shadow-sage/5"
        : "text-ink/50 hover:bg-ink/5 hover:text-ink"
    }`}
  >
    <span className={active ? "text-marine" : "text-ink/30"}>{icon}</span>
    <span>{label}</span>
  </button>
);

const MobileNavItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  highlight?: boolean;
}> = ({ label, icon, active, onClick, highlight }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
      highlight
        ? "bg-ink text-sage shadow-lg -translate-y-4 w-12 h-12 rounded-2xl"
        : active
          ? "text-marine"
          : "text-ink/40"
    }`}
  >
    {icon}
  </button>
);


export default App;
