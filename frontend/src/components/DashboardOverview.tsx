import React from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Mic,
  Plus,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import type { Pet, Reminder } from "../types";

interface DashboardOverviewProps {
  clinicName: string;
  pets: Pet[];
  reminders: Reminder[];
  aiInsight: string;
  onStartConsultation: () => void;
  onAddPatient: () => void;
  onViewPatients: () => void;
  onViewReminders: () => void;
  onSendReminder: (pet: Pet) => void;
}

const formatDate = (value?: string) => {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  clinicName,
  pets,
  reminders,
  aiInsight,
  onStartConsultation,
  onAddPatient,
  onViewPatients,
  onViewReminders,
  onSendReminder,
}) => {
  const overduePatients = pets.filter((pet) => pet.status === "Overdue");
  const dueSoonPatients = pets.filter((pet) => pet.status === "Due Soon");
  const attentionPatients = [...overduePatients, ...dueSoonPatients].slice(0, 4);
  const completedReminders = reminders.filter(
    (reminder) => reminder.status === "delivered" || reminder.status === "read" || reminder.status === "converted",
  ).length;
  const today = new Date().toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const metrics = [
    {
      label: "Active patients",
      value: pets.length,
      detail: `${attentionPatients.length} need attention`,
      icon: Users,
    },
    {
      label: "Due or overdue",
      value: overduePatients.length + dueSoonPatients.length,
      detail: `${overduePatients.length} overdue`,
      icon: CalendarDays,
    },
    {
      label: "Reminders sent",
      value: reminders.length,
      detail: `${completedReminders} engaged`,
      icon: Send,
    },
    {
      label: "Records ready",
      value: pets.filter((pet) => pet.status === "Up-to-date" || pet.status === "Healthy").length,
      detail: "Preventive care current",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <header className="flex flex-col gap-4 border-b border-stone-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{today}</p>
          <h1 className="mt-1 text-balance text-3xl font-bold text-slate-950">Clinic overview</h1>
          <p className="mt-2 text-pretty text-sm text-slate-500">{clinicName}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onAddPatient}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-transform duration-150 active:scale-[0.97]"
          >
            <Plus size={17} aria-hidden="true" />
            Add patient
          </button>
          <button
            type="button"
            onClick={onStartConsultation}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white transition-transform duration-150 hover:bg-evergreen active:scale-[0.97]"
          >
            <Mic size={17} aria-hidden="true" />
            Start consultation
          </button>
        </div>
      </header>

      <section aria-label="Clinic metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="kizuna-panel rounded-2xl border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{metric.value}</p>
                </div>
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-evergreen">
                  <Icon size={18} aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-slate-400">{metric.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)]">
        <div className="kizuna-panel overflow-hidden rounded-2xl border">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-950">Needs attention</h2>
              <p className="mt-1 text-xs text-slate-500">Patients with overdue or upcoming preventive care.</p>
            </div>
            <button
              type="button"
              onClick={onViewPatients}
              className="inline-flex items-center gap-1 text-xs font-bold text-marine transition-transform duration-150 active:scale-[0.97]"
            >
              View patients
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>

          {attentionPatients.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {attentionPatients.map((pet) => (
                <article
                  key={pet.id}
                  className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                      {pet.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{pet.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {pet.species} · {pet.ownerName}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        pet.status === "Overdue"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {pet.status}
                    </span>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(pet.nextVaccinationDate)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSendReminder(pet)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 transition-transform duration-150 hover:bg-slate-50 active:scale-[0.97]"
                  >
                    <Send size={14} aria-hidden="true" />
                    Remind
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <CheckCircle2 className="mx-auto text-emerald-600" size={28} aria-hidden="true" />
              <h3 className="mt-3 font-bold text-slate-900">Preventive care is current</h3>
              <p className="mt-1 text-sm text-slate-500">No patients require immediate follow-up.</p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <section className="kizuna-soft-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 text-evergreen">
              <Sparkles size={16} aria-hidden="true" />
              <span className="text-xs font-bold">Kizuna brief</span>
            </div>
            <h2 className="mt-3 text-balance text-lg font-bold">Today’s clinical focus</h2>
            <p className="mt-2 text-pretty text-sm leading-6 text-ink/65">
              {aiInsight || "Kizuna will summarize the clinic priorities when enough activity is available."}
            </p>
            <button
              type="button"
              onClick={onStartConsultation}
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-bold text-white transition-transform duration-150 active:scale-[0.97]"
            >
              <FileText size={16} aria-hidden="true" />
              Open clinical workspace
            </button>
          </section>

          <section className="kizuna-panel rounded-2xl border p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-950">Recent activity</h2>
              <button
                type="button"
                onClick={onViewReminders}
                className="text-xs font-bold text-marine transition-transform duration-150 active:scale-[0.97]"
              >
                View all
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {reminders.slice(0, 4).map((reminder) => (
                <article key={reminder.id} className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Clock3 size={14} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {reminder.status === "converted" ? "Appointment booked" : "Reminder sent"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {reminder.petName} ·{" "}
                      {new Date(reminder.sentAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </article>
              ))}
              {reminders.length === 0 && (
                <div className="py-4 text-center">
                  <p className="text-sm text-slate-500">No activity yet.</p>
                  <button type="button" onClick={onViewPatients} className="mt-2 text-xs font-bold text-marine">
                    Review patients
                  </button>
                </div>
              )}
            </div>
          </section>
        </aside>
      </section>

      <section className="kizuna-panel rounded-2xl border">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-950">Recent patients</h2>
            <p className="mt-1 text-xs text-slate-500">The latest records available in this clinic workspace.</p>
          </div>
          <button type="button" onClick={onViewPatients} className="text-xs font-bold text-marine">
            View all
          </button>
        </div>
        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {pets.slice(0, 4).map((pet) => (
            <article className="min-w-0 p-5" key={pet.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-evergreen">
                  {pet.name.slice(0, 1)}
                </span>
                <span className="text-xs font-semibold text-slate-400">{pet.species}</span>
              </div>
              <h3 className="mt-4 truncate text-sm font-bold text-slate-950">{pet.name}</h3>
              <p className="mt-1 truncate text-xs text-slate-500">{pet.ownerName}</p>
              <p className="mt-3 text-xs font-medium text-slate-400">
                {pet.age || "Age not recorded"} · {pet.weight || "Weight pending"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
