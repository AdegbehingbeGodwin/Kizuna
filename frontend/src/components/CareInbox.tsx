/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MessageCircle,
  PawPrint,
  RefreshCw,
  Stethoscope,
  Tractor,
  UserRoundCheck,
} from "lucide-react";
import { apiFetch } from "../services/api";

interface CareCase {
  id: string;
  audience: "pet_owner" | "farm_owner" | "unknown";
  intent: string;
  urgency: "emergency" | "urgent" | "routine" | "needs_information";
  status: "open" | "needs_human" | "in_review" | "resolved" | "closed";
  summary?: string;
  suggested_action?: string;
  requires_human: boolean;
  red_flags?: string[];
  missing_information?: string[];
  updated_at?: string;
  whatsapp_contacts?: {
    display_name?: string;
    phone_number?: string;
  };
}

const DEMO_CASES: CareCase[] = [
  {
    id: "care-demo-1",
    audience: "farm_owner",
    intent: "animal_unwell",
    urgency: "urgent",
    status: "needs_human",
    summary: "Three goats stopped eating this morning; one is weak and unable to remain with the herd.",
    suggested_action: "human_review",
    requires_human: true,
    red_flags: ["Multiple animals affected", "Weakness reported"],
    missing_information: ["Recent animal movement", "Temperature", "Number of deaths"],
    updated_at: new Date().toISOString(),
    whatsapp_contacts: { display_name: "Musa Bello", phone_number: "+234 803 555 0192" },
  },
  {
    id: "care-demo-2",
    audience: "pet_owner",
    intent: "post_treatment_followup",
    urgency: "routine",
    status: "open",
    summary: "Bingo is eating again after treatment. The owner asks when normal exercise can resume.",
    suggested_action: "routine_guidance",
    requires_human: false,
    red_flags: [],
    missing_information: [],
    updated_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    whatsapp_contacts: { display_name: "Samuel Okafor", phone_number: "+234 801 234 5678" },
  },
  {
    id: "care-demo-3",
    audience: "pet_owner",
    intent: "appointment",
    urgency: "needs_information",
    status: "open",
    summary: "Owner wants a vaccination appointment for a newly adopted kitten.",
    suggested_action: "book_appointment",
    requires_human: false,
    red_flags: [],
    missing_information: ["Kitten age", "Previous vaccination record"],
    updated_at: new Date(Date.now() - 52 * 60 * 1000).toISOString(),
    whatsapp_contacts: { display_name: "Amaka Adeleke", phone_number: "+234 809 765 4321" },
  },
];

const urgencyStyles: Record<CareCase["urgency"], string> = {
  emergency: "bg-rose-50 text-rose-700 border-rose-200",
  urgent: "bg-amber-50 text-amber-800 border-amber-200",
  routine: "bg-emerald-50 text-emerald-700 border-emerald-200",
  needs_information: "bg-stone-100 text-stone-600 border-stone-200",
};

const urgencyRank: Record<CareCase["urgency"], number> = {
  emergency: 0,
  urgent: 1,
  needs_information: 2,
  routine: 3,
};

interface CareInboxProps {
  isDemo?: boolean;
  onNotice: (message: string) => void;
}

export const CareInbox: React.FC<CareInboxProps> = ({ isDemo = false, onNotice }) => {
  const [cases, setCases] = useState<CareCase[]>(isDemo ? DEMO_CASES : []);
  const [selectedId, setSelectedId] = useState(cases[0]?.id || "");
  const [loading, setLoading] = useState(!isDemo);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const loadCases = async () => {
    if (isDemo) return;
    setLoading(true);
    try {
      const response = await apiFetch("/care/cases");
      if (!response.ok) throw new Error("Unable to load the care inbox.");
      const data = await response.json();
      setCases(data || []);
      setSelectedId((current) => current || data?.[0]?.id || "");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Unable to load the care inbox.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCases();
  }, [isDemo]);

  const visibleCases = useMemo(
    () =>
      [...cases]
        .filter((careCase) =>
          filter === "active" ? !["resolved", "closed"].includes(careCase.status) : true,
        )
        .sort(
          (left, right) =>
            urgencyRank[left.urgency] - urgencyRank[right.urgency] ||
            new Date(right.updated_at || 0).getTime() - new Date(left.updated_at || 0).getTime(),
        ),
    [cases, filter],
  );
  const selectedCase =
    visibleCases.find((careCase) => careCase.id === selectedId) || visibleCases[0];

  const updateCase = async (
    careCase: CareCase,
    status: CareCase["status"],
    assignToMe = false,
  ) => {
    if (isDemo) {
      setCases((current) =>
        current.map((item) => (item.id === careCase.id ? { ...item, status } : item)),
      );
      onNotice(status === "resolved" ? "Demo care case resolved." : "Demo care case assigned.");
      return;
    }
    const response = await apiFetch(`/care/cases/${careCase.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, assignToMe }),
    });
    if (!response.ok) {
      onNotice("Unable to update this care case.");
      return;
    }
    const updated = await response.json();
    setCases((current) =>
      current.map((item) => (item.id === careCase.id ? { ...item, ...updated } : item)),
    );
    onNotice(status === "resolved" ? "Care case resolved." : "Care case assigned to you.");
  };

  return (
    <div className="animate-fade-in space-y-7">
      <header className="flex flex-col gap-4 border-b border-stone-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-evergreen">Owner care assistant</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">Care inbox</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Gemma organizes owner and farmer messages. Clinical decisions remain with your team.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCases()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-slate-700 active:scale-[0.97]"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Needs a clinician",
            value: cases.filter((item) => item.requires_human && item.status !== "resolved").length,
            icon: Stethoscope,
          },
          {
            label: "Farm conversations",
            value: cases.filter((item) => item.audience === "farm_owner").length,
            icon: Tractor,
          },
          {
            label: "Open conversations",
            value: cases.filter((item) => !["resolved", "closed"].includes(item.status)).length,
            icon: MessageCircle,
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="kizuna-panel rounded-2xl border p-5" key={metric.label}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-evergreen">
                  <Icon size={17} aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{metric.value}</p>
            </article>
          );
        })}
      </section>

      <section className="kizuna-panel grid min-h-[34rem] overflow-hidden rounded-2xl border lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="border-b border-stone-200 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-4">
            <div className="flex rounded-xl bg-stone-100 p-1">
              {(["active", "all"] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold capitalize ${
                    filter === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-slate-400">{visibleCases.length}</span>
          </div>

          <div className="divide-y divide-stone-100">
            {visibleCases.map((careCase) => {
              const AudienceIcon = careCase.audience === "farm_owner" ? Tractor : PawPrint;
              const contact = careCase.whatsapp_contacts;
              return (
                <button
                  type="button"
                  key={careCase.id}
                  onClick={() => setSelectedId(careCase.id)}
                  className={`w-full p-4 text-left ${
                    selectedCase?.id === careCase.id ? "bg-emerald-50/60" : "hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-evergreen shadow-sm">
                      <AudienceIcon size={16} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {contact?.display_name || contact?.phone_number || "Animal owner"}
                        </p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${urgencyStyles[careCase.urgency]}`}
                        >
                          {careCase.urgency.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {careCase.summary || "Waiting for assistant summary."}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            {!loading && visibleCases.length === 0 && (
              <div className="px-6 py-14 text-center">
                <CheckCircle2 className="mx-auto text-emerald-600" size={26} />
                <p className="mt-3 text-sm font-semibold text-slate-800">Inbox is clear</p>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          {selectedCase ? (
            <>
              <div className="flex flex-col gap-4 border-b border-stone-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${urgencyStyles[selectedCase.urgency]}`}
                    >
                      {selectedCase.urgency.replace("_", " ")}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {selectedCase.audience === "farm_owner" ? "Farm owner" : "Pet owner"}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-950">
                    {selectedCase.whatsapp_contacts?.display_name || "WhatsApp care request"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedCase.whatsapp_contacts?.phone_number || "Phone number unavailable"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void updateCase(selectedCase, "in_review", true)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-slate-700 active:scale-[0.97]"
                  >
                    <UserRoundCheck size={15} aria-hidden="true" />
                    Take over
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateCase(selectedCase, "resolved")}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-3 text-xs font-semibold text-white active:scale-[0.97]"
                  >
                    <CheckCircle2 size={15} aria-hidden="true" />
                    Resolve
                  </button>
                </div>
              </div>

              <div className="space-y-6 p-5 sm:p-7">
                <section>
                  <p className="text-xs font-semibold text-evergreen">GEMMA INTAKE SUMMARY</p>
                  <p className="mt-2 max-w-3xl text-base leading-7 text-slate-800">
                    {selectedCase.summary}
                  </p>
                </section>

                {selectedCase.red_flags && selectedCase.red_flags.length > 0 && (
                  <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <div className="flex items-center gap-2 text-rose-800">
                      <AlertTriangle size={16} aria-hidden="true" />
                      <h3 className="text-sm font-semibold">Safety flags</h3>
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-rose-800/80">
                      {selectedCase.red_flags.map((flag) => <li key={flag}>{flag}</li>)}
                    </ul>
                  </section>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <section className="rounded-2xl border border-stone-200 p-4">
                    <div className="flex items-center gap-2 text-slate-800">
                      <Clock3 size={16} aria-hidden="true" />
                      <h3 className="text-sm font-semibold">Still needed</h3>
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-500">
                      {(selectedCase.missing_information || []).map((item) => <li key={item}>{item}</li>)}
                      {!selectedCase.missing_information?.length && <li>No missing fields flagged.</li>}
                    </ul>
                  </section>
                  <section className="kizuna-soft-panel rounded-2xl p-4">
                    <p className="text-xs font-semibold text-evergreen">SUGGESTED NEXT STEP</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {(selectedCase.suggested_action || "human_review").replaceAll("_", " ")}
                    </p>
                    <button
                      type="button"
                      onClick={() => void updateCase(selectedCase, "in_review", true)}
                      className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-evergreen"
                    >
                      Assign and review
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </section>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[34rem] items-center justify-center text-sm text-slate-400">
              Select a care conversation.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
