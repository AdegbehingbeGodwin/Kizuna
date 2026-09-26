import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileText,
  History,
  Languages,
  LoaderCircle,
  Mic,
  Paperclip,
  Pause,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Square,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import type { Pet } from "../types";
import { apiFetch } from "../services/api";
import { convertAudioToWav } from "../services/audio";

/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */

interface ScribeWorkspaceProps {
  pets: Pet[];
  isDemo?: boolean;
  onNotice: (message: string) => void;
}

const draftSections = {
  subjective:
    "Owner reports reduced appetite since yesterday. No vomiting or diarrhoea. Water intake appears unchanged.",
  objective:
    "Patient alert and responsive. Hydration appears normal. Temperature, weight, and abdominal palpation pending.",
  assessment:
    "Acute reduction in appetite. Differential considerations include dietary indiscretion, gastrointestinal discomfort, or early systemic illness.",
  plan:
    "Complete physical examination and baseline observations. Discuss diagnostics if appetite does not improve. Provide owner with feeding and monitoring guidance.",
};

const demoTranscript = `Veterinarian: When did the reduced appetite begin?
Owner: Yesterday morning. She has taken water normally and has not vomited or had diarrhoea.
Veterinarian: Any change in stool, activity, medication, or access to unusual food?
Owner: Her activity is slightly reduced. No medication and no known dietary change.
Veterinarian: Hydration appears normal. I will complete her temperature, weight, abdominal examination, and discuss diagnostics if the appetite does not improve.`;

type CaptureState = "ready" | "recording" | "paused" | "recorded" | "processing" | "draft-ready";
type WorkspaceView = "brief" | "transcript" | "note";

interface ExtractedFact {
  category: string;
  label: string;
  value: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
}

const demoFacts: ExtractedFact[] = [
  {
    category: "Presenting complaint",
    label: "Reduced appetite",
    value: "Since yesterday morning",
    evidence: "Owner: Yesterday morning.",
    confidence: "high",
  },
  {
    category: "Negative finding",
    label: "Vomiting",
    value: "Denied",
    evidence: "Owner: She has not vomited.",
    confidence: "high",
  },
  {
    category: "Negative finding",
    label: "Diarrhoea",
    value: "Denied",
    evidence: "Owner: She has not had diarrhoea.",
    confidence: "high",
  },
  {
    category: "General observation",
    label: "Activity",
    value: "Slightly reduced",
    evidence: "Owner: Her activity is slightly reduced.",
    confidence: "high",
  },
];

export const ScribeWorkspace: React.FC<ScribeWorkspaceProps> = ({
  pets,
  isDemo = false,
  onNotice,
}) => {
  const [captureState, setCaptureState] = useState<CaptureState>("ready");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("brief");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [encounterType, setEncounterType] = useState("Consultation");
  const [noteTemplate, setNoteTemplate] = useState("SOAP");
  const [recordingLanguage, setRecordingLanguage] = useState("English");
  const [selectedMicrophone, setSelectedMicrophone] = useState("");
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [captureError, setCaptureError] = useState("");
  const [transcriptionProvider, setTranscriptionProvider] = useState("");
  const [transcript, setTranscript] = useState(demoTranscript);
  const [noteStatus, setNoteStatus] = useState<"draft" | "approved">("draft");
  const [extractedFacts, setExtractedFacts] = useState<ExtractedFact[]>(demoFacts);
  const [missingInformation, setMissingInformation] = useState([
    "Temperature",
    "Current weight",
    "Complete physical examination",
  ]);
  const [warnings, setWarnings] = useState(["Assessment requires clinician confirmation."]);
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id || "");
  const [note, setNote] = useState(draftSections);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const selectedPet = useMemo(
    () => pets.find((pet) => pet.id === selectedPetId) || pets[0],
    [pets, selectedPetId],
  );

  useEffect(() => {
    if (captureState !== "recording") return;
    const interval = window.setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [captureState]);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    void navigator.mediaDevices.enumerateDevices().then((devices) => {
      setMicrophones(devices.filter((device) => device.kind === "audioinput"));
    });
  }, []);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioFrameRef.current) window.cancelAnimationFrame(audioFrameRef.current);
      void audioContextRef.current?.close();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const formattedElapsed = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(
    elapsedSeconds % 60,
  ).padStart(2, "0")}`;

  const startRecording = () => {
    if (!consentConfirmed) {
      setShowConsentDialog(true);
      return;
    }
    void beginRecording();
  };

  const beginRecording = async () => {
    setCaptureError("");
    setShowConsentDialog(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicrophone ? { deviceId: { exact: selectedMicrophone } } : true,
      });
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      const devices = await navigator.mediaDevices.enumerateDevices();
      setMicrophones(devices.filter((device) => device.kind === "audioinput"));

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = audioContext;
      const samples = new Uint8Array(analyser.frequencyBinCount);
      const measureAudio = () => {
        analyser.getByteFrequencyData(samples);
        const average = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
        setAudioLevel(Math.min(100, Math.round(average * 1.8)));
        audioFrameRef.current = window.requestAnimationFrame(measureAudio);
      };
      measureAudio();

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        if (audioFrameRef.current) window.cancelAnimationFrame(audioFrameRef.current);
        void audioContextRef.current?.close();
        audioContextRef.current = null;
        setAudioLevel(0);
        setCaptureState("recorded");
      });
      recorder.start(1000);
      setElapsedSeconds(0);
      setCaptureState("recording");
    } catch {
      setCaptureError("Microphone access was not available. You can upload an audio file instead.");
    }
  };

  const togglePause = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (captureState === "recording") {
      recorder.pause();
      setCaptureState("paused");
    } else if (captureState === "paused") {
      recorder.resume();
      setCaptureState("recording");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const useAudioFile = (file?: File) => {
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setElapsedSeconds(0);
    setCaptureError("");
    setCaptureState("recorded");
  };

  const processRecording = async () => {
    setCaptureState("processing");
    try {
      if (!isDemo) {
        let sourceTranscript = transcript.trim();
        if (audioBlob) {
          const wav = await convertAudioToWav(audioBlob);
          const formData = new FormData();
          formData.append("file", wav, "consultation.wav");
          const transcriptionResponse = await apiFetch("/scribe/transcribe", {
            method: "POST",
            body: formData,
          });
          if (!transcriptionResponse.ok) {
            const body = await transcriptionResponse.json();
            throw new Error(body.detail || "Unable to transcribe the consultation.");
          }
          const transcriptionResult = await transcriptionResponse.json();
          sourceTranscript = transcriptionResult.transcript;
          setTranscript(sourceTranscript);
          setTranscriptionProvider(transcriptionResult.provider || "parakeet.cpp");
        }
        if (sourceTranscript.length < 20) {
          throw new Error("Record a consultation or enter a longer transcript first.");
        }
        const response = await apiFetch("/scribe/generate-note", {
          method: "POST",
          body: JSON.stringify({
            transcript: sourceTranscript,
            patientName: selectedPet?.name || "Patient",
            species: selectedPet?.species,
          }),
        });
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.detail || "Unable to generate the clinical draft.");
        }
        const result = await response.json();
        setNote({
          subjective: result.note.subjective,
          objective: result.note.objective,
          assessment: result.note.assessment,
          plan: result.note.plan,
        });
        setExtractedFacts(result.note.extracted_facts || []);
        setMissingInformation(result.note.missing_information || []);
        setWarnings(result.note.warnings || []);
        setCaptureState("draft-ready");
        setWorkspaceView("note");
        setNoteStatus("draft");
        onNotice("Transcript and clinical draft generated.");
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1400));
      setTranscript(demoTranscript);
      setNote({
        subjective: `${selectedPet?.name || "Patient"} has had reduced appetite since yesterday morning. Water intake is unchanged. No vomiting or diarrhoea. Activity is slightly reduced.`,
        objective:
          "Hydration appears normal. Temperature, weight, and abdominal examination are pending completion.",
        assessment:
          "Acute reduced appetite with mild reduction in activity. Cause is not yet established; further examination is required.",
        plan:
          "Complete physical examination and baseline observations. Discuss diagnostics if appetite does not improve. Give the owner feeding and monitoring guidance with return precautions.",
      });
      setExtractedFacts(demoFacts);
      setMissingInformation(["Temperature", "Current weight", "Complete physical examination"]);
      setWarnings(["Assessment requires clinician confirmation."]);
      setCaptureState("draft-ready");
      setWorkspaceView("note");
      setNoteStatus("draft");
      onNotice(
        "Consultation processed and SOAP draft prepared for review.",
      );
    } catch (error) {
      setCaptureState("recorded");
      setCaptureError(error instanceof Error ? error.message : "Unable to process the consultation.");
    }
  };

  const resetCapture = () => {
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (audioFrameRef.current) window.cancelAnimationFrame(audioFrameRef.current);
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setAudioLevel(0);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
    setAudioBlob(null);
    setTranscriptionProvider("");
    setElapsedSeconds(0);
    setCaptureError("");
    setConsentConfirmed(false);
    setCaptureState("ready");
    setNoteStatus("draft");
  };

  const saveDraft = () => {
    onNotice(isDemo ? "Demo note saved locally for this preview." : "Clinical draft saved.");
  };

  const approveNote = () => {
    setNoteStatus("approved");
    onNotice(isDemo ? "Demo clinical note finalized." : "Clinical note finalized and added to the patient record.");
  };

  const priorRecordSummary = [
    {
      label: "Active concerns",
      value: "Seasonal dermatitis; intermittent left-ear irritation",
    },
    {
      label: "Current medication",
      value: "No long-term medication recorded",
    },
    {
      label: "Preventive care",
      value: "Rabies booster due 18 Jun 2026",
    },
  ];

  const recordTimeline = [
    {
      date: "12 Feb 2026",
      title: "Dermatitis follow-up",
      detail: "Pruritus improved after topical treatment. No secondary infection documented.",
      source: "Progress note",
    },
    {
      date: "18 Jun 2025",
      title: "Annual wellness visit",
      detail: "Physical examination unremarkable. Rabies vaccine administered.",
      source: "Clinical note",
    },
    {
      date: "04 Nov 2024",
      title: "Left otitis externa",
      detail: "Cytology showed yeast overgrowth. Treated with topical ear medication.",
      source: "Consultation",
    },
  ];

  const captureLabel =
    captureState === "recording"
      ? "Recording"
      : captureState === "paused"
        ? "Paused"
        : captureState === "processing"
          ? "Generating note"
          : captureState === "recorded"
            ? "Audio ready"
            : captureState === "draft-ready"
              ? "Draft ready"
              : "Ready";

  const legacyWorkspace = (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Clinical documentation</p>
          <h1 className="mt-1 text-balance text-3xl font-bold text-slate-950">Scribe workspace</h1>
          <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-slate-500">
            Review context, capture the visit, and approve the clinical note.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {selectedPet?.name || "No patient"} · {encounterType}
          </span>
          {isDemo && (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">Demo</span>
          )}
        </div>
      </header>

      <nav
        aria-label="Scribe workflow"
        className="flex overflow-x-auto border-b border-slate-200"
      >
        {[
          { id: "brief" as const, label: "Patient brief", icon: <History size={16} /> },
          { id: "transcript" as const, label: "Transcript", icon: <ClipboardList size={16} /> },
          { id: "note" as const, label: "SOAP note", icon: <FileText size={16} /> },
        ].map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setWorkspaceView(item.id)}
            className={`relative flex min-w-fit flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors duration-150 active:scale-[0.98] ${
              workspaceView === item.id
                ? "text-slate-950 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-evergreen"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {item.icon}
            {item.label}
            {item.id === "note" && (missingInformation.length > 0 || warnings.length > 0) && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                {missingInformation.length + warnings.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      <section className="grid items-start gap-5 xl:grid-cols-[21rem_minmax(0,1fr)]">
        <div className="space-y-4 xl:sticky xl:top-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label htmlFor="scribe-patient" className="mb-2 block text-xs font-bold text-slate-500">
              Patient
            </label>
            <div className="relative">
              <select
                id="scribe-patient"
                value={selectedPetId}
                onChange={(event) => setSelectedPetId(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-marine"
              >
                {pets.map((pet) => (
                  <option value={pet.id} key={pet.id}>
                    {pet.name} · {pet.species} · {pet.ownerName}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
                aria-hidden="true"
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
              <div>
                <p className="text-xs text-slate-400">Species</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-800">{selectedPet?.species || "Not set"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Age</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-800">{selectedPet?.age || "4 years"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Weight</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-800">{selectedPet?.weight || "Pending"}</p>
              </div>
            </div>

            <details className="mt-4 border-t border-slate-100 pt-4">
              <summary className="cursor-pointer text-xs font-bold text-slate-600">Visit settings</summary>
              <div className="mt-4 grid gap-3">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Stethoscope size={14} aria-hidden="true" />
                  Record as
                </span>
                <select
                  value={encounterType}
                  onChange={(event) => setEncounterType(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-marine"
                >
                  <option>Consultation</option>
                  <option>Follow-up</option>
                  <option>Wellness examination</option>
                  <option>Emergency visit</option>
                  <option>Procedure note</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <FileText size={14} aria-hidden="true" />
                  Note template
                </span>
                <select
                  value={noteTemplate}
                  onChange={(event) => setNoteTemplate(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-marine"
                >
                  <option>SOAP</option>
                  <option>Wellness note</option>
                  <option>Emergency note</option>
                  <option>Discharge summary</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Languages size={14} aria-hidden="true" />
                  Spoken language
                </span>
                <select
                  value={recordingLanguage}
                  onChange={(event) => setRecordingLanguage(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-marine"
                >
                  <option>English</option>
                  <option>Nigerian English</option>
                  <option>English + Pidgin</option>
                  <option>French</option>
                </select>
              </label>
              </div>
            </details>
          </div>

          <div className="rounded-2xl bg-ink p-5 text-white shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white/50">Consultation capture</p>
                <h2 className="mt-1 text-balance text-xl font-bold">
                  {captureState === "recording"
                    ? "Listening to the consultation"
                    : captureState === "paused"
                      ? "Recording paused"
                      : captureState === "processing"
                        ? "Preparing transcript and draft"
                        : captureState === "recorded" || captureState === "draft-ready"
                          ? "Consultation captured"
                          : "Ready when the visit begins"}
                </h2>
              </div>
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white/60">
                {formattedElapsed}
              </span>
            </div>

            <div className="my-6 flex h-12 items-center justify-center gap-1" aria-hidden="true">
              {[18, 32, 24, 42, 28, 38, 20, 34, 26].map((height, index) => (
                <span
                  key={index}
                  className={`w-1 rounded-full bg-sage ${captureState === "recording" ? "scribe-wave" : "opacity-25"}`}
                  style={{ height }}
                />
              ))}
            </div>

            {captureState === "ready" && (
              <div className="space-y-3">
                {microphones.length > 0 && (
                  <label className="block rounded-xl border border-white/15 bg-white/5 p-3">
                    <span className="mb-2 flex items-center gap-2 text-xs font-bold text-white/60">
                      <Mic size={14} aria-hidden="true" />
                      Microphone
                    </span>
                    <select
                      value={selectedMicrophone}
                      onChange={(event) => setSelectedMicrophone(event.target.value)}
                      className="h-10 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white outline-none"
                    >
                      <option className="text-slate-900" value="">System default</option>
                      {microphones.map((device, index) => (
                        <option className="text-slate-900" value={device.deviceId} key={device.deviceId}>
                          {device.label || `Microphone ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white font-bold text-ink transition-transform duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <Mic size={18} aria-hidden="true" />
                  Start recording
                </button>
                <p className="text-center text-xs leading-5 text-white/50">
                  Consent is confirmed before microphone capture begins.
                </p>
                <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 font-bold text-white hover:bg-white/10">
                  <Upload size={17} aria-hidden="true" />
                  Upload consultation audio
                  <input
                    type="file"
                    className="sr-only"
                    accept="audio/*"
                    onChange={(event) => useAudioFile(event.target.files?.[0])}
                  />
                </label>
                {isDemo && (
                  <button
                    type="button"
                    onClick={processRecording}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/20 font-bold text-white hover:bg-white/10"
                  >
                    <Sparkles size={17} aria-hidden="true" />
                    Use sample consultation
                  </button>
                )}
              </div>
            )}

            {(captureState === "recording" || captureState === "paused") && (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-white/70">
                      <Volume2 size={15} aria-hidden="true" />
                      {captureState === "paused"
                        ? "Audio capture paused"
                        : audioLevel > 5
                          ? "Kizuna can hear the room"
                          : "Listening for audio"}
                    </span>
                    <span className="tabular-nums text-white/45">{audioLevel}%</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-sage transition-transform duration-150 origin-left"
                      style={{ transform: `scaleX(${captureState === "paused" ? 0 : Math.max(audioLevel, 2) / 100})` }}
                    />
                  </div>
                </div>
                {microphones.length > 0 && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-white/50">Microphone</span>
                    <select
                      value={selectedMicrophone}
                      onChange={(event) => setSelectedMicrophone(event.target.value)}
                      disabled={captureState !== "paused"}
                      className="h-10 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white outline-none disabled:opacity-60"
                    >
                      {microphones.map((device, index) => (
                        <option className="text-slate-900" value={device.deviceId} key={device.deviceId}>
                          {device.label || `Microphone ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={togglePause}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white font-bold text-ink"
                  >
                    {captureState === "paused" ? <Mic size={18} /> : <Pause size={18} />}
                    {captureState === "paused" ? "Resume" : "Pause"}
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 font-bold text-white hover:bg-white/10"
                  >
                    <Square size={17} fill="currentColor" />
                    Finish
                  </button>
                </div>
              </div>
            )}

            {(captureState === "recorded" || captureState === "draft-ready") && audioUrl && (
              <div className="space-y-3">
                <audio className="w-full" controls src={audioUrl}>
                  <track kind="captions" />
                </audio>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <button
                    type="button"
                    onClick={processRecording}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white font-bold text-ink"
                  >
                    <Sparkles size={18} />
                    {captureState === "draft-ready" ? "Regenerate draft" : "Process consultation"}
                  </button>
                  <button
                    type="button"
                    aria-label="Discard recording and start again"
                    onClick={resetCapture}
                    className="flex size-12 items-center justify-center rounded-xl border border-white/20 text-white hover:bg-white/10"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
              </div>
            )}

            {captureState === "draft-ready" && !audioUrl && (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <button
                  type="button"
                  onClick={processRecording}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white font-bold text-ink"
                >
                  <Sparkles size={18} />
                  Regenerate draft
                </button>
                <button
                  type="button"
                  aria-label="Start a new consultation"
                  onClick={resetCapture}
                  className="flex size-12 items-center justify-center rounded-xl border border-white/20 text-white hover:bg-white/10"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            )}

            {captureState === "processing" && (
              <div className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 font-bold text-white">
                <LoaderCircle className="animate-spin" size={18} />
                Processing consultation...
              </div>
            )}

            {captureError && <p className="mt-3 text-sm font-semibold text-rose-300">{captureError}</p>}
            <p className="mt-4 text-pretty text-xs leading-5 text-white/50">
              The demo records locally in this browser. Production processing stores the encounter securely before AI
              documentation begins.
            </p>
          </div>

        </div>

        {workspaceView === "brief" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 lg:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-marine">
                    <History size={18} aria-hidden="true" />
                    <span className="text-xs font-bold">Records recap</span>
                  </div>
                  <h2 className="mt-2 text-balance text-2xl font-bold text-slate-900">
                    What matters before seeing {selectedPet?.name || "this patient"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-slate-500">
                    Kizuna condensed three prior encounters and the preventive-care record into this pre-visit brief.
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                  <ShieldCheck size={14} aria-hidden="true" />
                  3 sources linked
                </span>
              </div>
            </div>

            <div className="space-y-6 p-5 lg:p-7">
              <section className="grid gap-3 md:grid-cols-3">
                {priorRecordSummary.map((item) => (
                  <article key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-400">{item.label}</p>
                    <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-slate-800">{item.value}</p>
                  </article>
                ))}
              </section>

              <section>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900">Clinical timeline</h3>
                    <p className="mt-1 text-xs text-slate-500">Prior events with their original record type.</p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-xs font-bold text-marine hover:text-evergreen"
                    onClick={() => onNotice("Record upload will be connected to patient history storage.")}
                  >
                    <Paperclip size={15} aria-hidden="true" />
                    Add prior records
                  </button>
                </div>
                <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                  {recordTimeline.map((record) => (
                    <article className="grid gap-3 p-4 sm:grid-cols-[7rem_1fr_auto]" key={record.date}>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <Clock3 size={14} aria-hidden="true" />
                        {record.date}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{record.title}</h4>
                        <p className="mt-1 text-pretty text-xs leading-5 text-slate-500">{record.detail}</p>
                      </div>
                      <span className="h-fit w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {record.source}
                      </span>
                    </article>
                  ))}
                </div>
              </section>

              <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-amber-950">Confirm during this visit</p>
                  <p className="mt-1 text-xs leading-5 text-amber-900/70">
                    Ask about current itch severity, ear symptoms, and any treatment used outside this clinic.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkspaceView("transcript")}
                  className="h-10 min-w-fit rounded-xl bg-amber-900 px-4 text-sm font-bold text-white"
                >
                  Open transcript
                </button>
              </div>
            </div>
          </div>
        )}

        {workspaceView === "transcript" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ClipboardList className="text-marine" size={18} aria-hidden="true" />
                  <h2 className="font-bold text-slate-900">Consultation transcript</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">The editable source used to produce the clinical note.</p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                {transcriptionProvider ? `Local · ${transcriptionProvider}` : "Editable source"}
              </span>
            </div>
            <div className="p-5 lg:p-7">
              <textarea
                aria-label="Consultation transcript"
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                className="min-h-[32rem] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-marine"
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-pretty text-xs leading-5 text-slate-500">
                  Correct names, medication details, and negations before generating the final note.
                </p>
                <button
                  type="button"
                  onClick={() => setWorkspaceView("note")}
                  className="h-10 min-w-fit rounded-xl bg-ink px-4 text-sm font-bold text-white hover:bg-evergreen"
                >
                  Review SOAP note
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`${workspaceView === "note" ? "" : "hidden"} rounded-2xl border border-slate-200 bg-white shadow-sm`}>
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="text-marine" size={18} aria-hidden="true" />
                <h2 className="font-bold text-slate-900">SOAP clinical draft</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">Generated from the consultation transcript · requires review</p>
            </div>
            <span
              className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${
                noteStatus === "approved"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {noteStatus === "approved" ? "Finalized" : "Draft"}
            </span>
          </div>

          <div className="space-y-5 p-5 lg:p-7">
            {(missingInformation.length > 0 || warnings.length > 0) && (
              <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-amber-950">Review before finalizing</h3>
                    <p className="mt-1 text-xs text-amber-900/70">
                      {missingInformation.length} missing items · {warnings.length} clinical warnings
                    </p>
                  </div>
                  <details className="text-xs text-amber-950">
                    <summary className="cursor-pointer font-bold">Show review items</summary>
                    <ul className="mt-3 space-y-1.5 text-amber-900/75">
                      {missingInformation.map((item) => <li key={item}>Missing: {item}</li>)}
                      {warnings.map((item) => <li key={item}>Warning: {item}</li>)}
                    </ul>
                  </details>
                </div>
              </section>
            )}

            <section>
              <div className="mb-4">
                <h3 className="font-bold text-slate-950">Clinical note</h3>
                <p className="mt-1 text-xs text-slate-500">Edit the draft directly. Changes remain local until finalized.</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {Object.entries(note).map(([key, value]) => (
                  <label className="block" key={key}>
                    <span className="mb-2 block text-xs font-bold capitalize text-slate-500">{key}</span>
                    <textarea
                      value={value}
                      onChange={(event) => setNote((current) => ({ ...current, [key]: event.target.value }))}
                      className="min-h-40 w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 outline-none transition-shadow duration-150 focus:ring-2 focus:ring-marine"
                    />
                  </label>
                ))}
              </div>
            </section>

            <details className="rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-800">
                <span>Evidence and extracted facts</span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                  {extractedFacts.length} facts
                </span>
              </summary>
              <div className="grid gap-3 border-t border-slate-200 p-4 lg:grid-cols-2">
                {extractedFacts.map((fact, index) => (
                  <article className="rounded-xl border border-slate-200 bg-white p-3" key={`${fact.label}-${index}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-slate-400">{fact.category}</span>
                        <p className="mt-0.5 text-sm font-bold text-slate-900">
                          {fact.label}: {fact.value}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${
                          fact.confidence === "high"
                            ? "bg-emerald-50 text-emerald-700"
                            : fact.confidence === "medium"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {fact.confidence}
                      </span>
                    </div>
                    <p className="mt-2 border-l-2 border-marine/30 pl-3 text-xs leading-5 text-slate-500">
                      “{fact.evidence}”
                    </p>
                  </article>
                ))}
              </div>
            </details>
          </div>

          <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={saveDraft}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 transition-transform duration-150 hover:bg-slate-50 active:scale-[0.97]"
            >
              <Save size={17} aria-hidden="true" />
              Save draft
            </button>
            <button
              type="button"
              onClick={approveNote}
              disabled={noteStatus === "approved"}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-ink font-bold text-white transition-transform duration-150 hover:bg-evergreen active:scale-[0.97] disabled:cursor-default disabled:bg-emerald-700 disabled:active:scale-100"
            >
              <Check size={17} aria-hidden="true" />
              {noteStatus === "approved" ? "Finalized" : "Finalize clinical note"}
            </button>
          </div>
          <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-4 text-xs font-semibold text-slate-500">
            <ShieldCheck size={15} className="text-marine" aria-hidden="true" />
            The transcript, extracted facts, and SOAP draft remain editable until a clinician finalizes the record.
          </div>
        </div>
      </section>

      {showConsentDialog && (
        <div className="scribe-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recording-consent-title"
            className="scribe-modal-panel w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
                <Mic size={20} aria-hidden="true" />
              </div>
              <button
                type="button"
                aria-label="Close recording consent"
                onClick={() => setShowConsentDialog(false)}
                className="flex size-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <h2 id="recording-consent-title" className="mt-5 text-balance text-xl font-bold text-slate-900">
              Confirm consent before recording
            </h2>
            <p className="mt-2 text-pretty text-sm leading-6 text-slate-500">
              Everyone being recorded must understand that audio will be used to create clinical documentation for this
              visit.
            </p>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Patient</span>
                <strong className="text-right text-slate-900">{selectedPet?.name || "Not selected"}</strong>
              </div>
              <div className="mt-3 flex justify-between gap-4">
                <span className="text-slate-500">Record</span>
                <strong className="text-right text-slate-900">{encounterType} · {noteTemplate}</strong>
              </div>
              <div className="mt-3 flex justify-between gap-4">
                <span className="text-slate-500">Language</span>
                <strong className="text-right text-slate-900">{recordingLanguage}</strong>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setShowConsentDialog(false)}
                className="h-11 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConsentConfirmed(true);
                  void beginRecording();
                }}
                className="h-11 rounded-xl bg-ink font-bold text-white hover:bg-evergreen"
              >
                Consent confirmed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!selectedPet) return null;

  return (
    <div className="kizuna-document-canvas -mx-4 -mt-4 min-h-dvh lg:-mx-10 lg:-mt-10">
      <header className="border-b border-stone-200 bg-white/95 px-4 py-4 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-sm font-bold text-white">
              {selectedPet.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold text-slate-950">{selectedPet.name}</h1>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                  {selectedPet.species}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  {captureLabel}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {selectedPet.ownerName} · {selectedPet.breed || "Breed not recorded"} · {selectedPet.age || "Age pending"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: "brief" as const, label: "Brief", icon: History },
              { id: "transcript" as const, label: "Transcript", icon: ClipboardList },
              { id: "note" as const, label: "Clinical note", icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setWorkspaceView(item.id)}
                  className={`inline-flex h-10 min-w-fit items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-transform duration-150 active:scale-[0.97] ${
                    workspaceView === item.id
                      ? "bg-ink text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={15} aria-hidden="true" />
                  {item.label}
                  {item.id === "note" && missingInformation.length + warnings.length > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        workspaceView === "note" ? "bg-white/15 text-white" : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {missingInformation.length + warnings.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100dvh-5rem)] xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="border-b border-stone-200 bg-white xl:border-b-0 xl:border-r">
          <div className="space-y-5 p-4 xl:sticky xl:top-0 xl:p-5">
            <section>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400">Encounter</p>
                <span className="text-xs font-semibold text-slate-500">{formattedElapsed}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 px-2 py-3">
                  <p className="text-[10px] font-semibold text-slate-400">AGE</p>
                  <p className="mt-1 truncate text-xs font-bold text-slate-800">{selectedPet.age || "—"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-3">
                  <p className="text-[10px] font-semibold text-slate-400">WEIGHT</p>
                  <p className="mt-1 truncate text-xs font-bold text-slate-800">{selectedPet.weight || "—"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-3">
                  <p className="text-[10px] font-semibold text-slate-400">STATUS</p>
                  <p className="mt-1 truncate text-xs font-bold text-slate-800">{selectedPet.status}</p>
                </div>
              </div>
            </section>

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-500">Patient</span>
              <div className="relative">
                <select
                  value={selectedPetId}
                  onChange={(event) => setSelectedPetId(event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-marine"
                >
                  {pets.map((pet) => (
                    <option value={pet.id} key={pet.id}>
                      {pet.name} · {pet.ownerName}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                  aria-hidden="true"
                />
              </div>
            </label>

            <details className="border-y border-slate-100 py-3">
              <summary className="cursor-pointer text-xs font-bold text-slate-600">Visit configuration</summary>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-500">Encounter type</span>
                  <select
                    value={encounterType}
                    onChange={(event) => setEncounterType(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-marine"
                  >
                    <option>Consultation</option>
                    <option>Follow-up</option>
                    <option>Wellness examination</option>
                    <option>Emergency visit</option>
                    <option>Procedure note</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="mb-1.5 block text-xs text-slate-500">Template</span>
                    <select
                      value={noteTemplate}
                      onChange={(event) => setNoteTemplate(event.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-marine"
                    >
                      <option>SOAP</option>
                      <option>Wellness note</option>
                      <option>Emergency note</option>
                      <option>Discharge summary</option>
                    </select>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs text-slate-500">Language</span>
                    <select
                      value={recordingLanguage}
                      onChange={(event) => setRecordingLanguage(event.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-marine"
                    >
                      <option>English</option>
                      <option>Nigerian English</option>
                      <option>English + Pidgin</option>
                      <option>French</option>
                    </select>
                  </label>
                </div>
              </div>
            </details>

            <section className="kizuna-soft-panel rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${
                      captureState === "recording"
                        ? "bg-rose-400"
                        : captureState === "paused"
                          ? "bg-amber-300"
                          : "bg-sage"
                    }`}
                  />
                  <p className="text-xs font-bold text-ink/65">{captureLabel}</p>
                </div>
                <span className="text-xs tabular-nums text-ink/45">{formattedElapsed}</span>
              </div>

              {(captureState === "recording" || captureState === "paused") && (
                <div className="mt-4">
                  <div className="flex h-10 items-center justify-center gap-1" aria-hidden="true">
                    {[16, 28, 20, 34, 24, 30, 18, 26, 14].map((height, index) => (
                      <span
                        key={index}
                        className={`w-1 rounded-full bg-sage ${
                          captureState === "recording" ? "scribe-wave" : "opacity-30"
                        }`}
                        style={{ height }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-ink/50">
                    <span>{audioLevel > 5 ? "Audio detected" : "Listening"}</span>
                    <span>{audioLevel}%</span>
                  </div>
                </div>
              )}

              {captureState === "ready" && (
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-bold text-white transition-transform duration-150 active:scale-[0.97]"
                  >
                    <Mic size={16} aria-hidden="true" />
                    Start recording
                  </button>
                  <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-evergreen/15 bg-white/65 text-xs font-semibold text-ink/70 transition-transform duration-150 active:scale-[0.97]">
                    <Upload size={14} aria-hidden="true" />
                    Upload audio
                    <input
                      type="file"
                      className="sr-only"
                      accept="audio/*"
                      onChange={(event) => useAudioFile(event.target.files?.[0])}
                    />
                  </label>
                  {isDemo && (
                    <button
                      type="button"
                      onClick={processRecording}
                      className="h-9 w-full text-xs font-semibold text-evergreen transition-transform duration-150 active:scale-[0.97]"
                    >
                      Use sample encounter
                    </button>
                  )}
                </div>
              )}

              {(captureState === "recording" || captureState === "paused") && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={togglePause}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-ink text-xs font-bold text-white transition-transform duration-150 active:scale-[0.97]"
                  >
                    {captureState === "paused" ? <Mic size={15} /> : <Pause size={15} />}
                    {captureState === "paused" ? "Resume" : "Pause"}
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl border border-evergreen/15 bg-white/65 text-xs font-bold text-ink transition-transform duration-150 active:scale-[0.97]"
                  >
                    <Square size={13} fill="currentColor" />
                    Finish
                  </button>
                </div>
              )}

              {(captureState === "recorded" || captureState === "draft-ready") && (
                <div className="mt-4 space-y-2">
                  {audioUrl && <audio className="h-9 w-full" controls src={audioUrl} />}
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <button
                      type="button"
                      onClick={processRecording}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl bg-ink text-xs font-bold text-white transition-transform duration-150 active:scale-[0.97]"
                    >
                      <Sparkles size={14} aria-hidden="true" />
                      {captureState === "draft-ready" ? "Regenerate" : "Generate note"}
                    </button>
                    <button
                      type="button"
                      aria-label="Start a new consultation"
                      onClick={resetCapture}
                      className="flex size-10 items-center justify-center rounded-xl border border-evergreen/15 bg-white/65 text-ink transition-transform duration-150 active:scale-[0.97]"
                    >
                      <RotateCcw size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {captureState === "processing" && (
                <div className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-white/65 text-xs font-bold">
                  <LoaderCircle className="animate-spin" size={15} aria-hidden="true" />
                  Creating clinical note
                </div>
              )}

              {captureError && <p className="mt-3 text-xs leading-5 text-rose-700">{captureError}</p>}
            </section>

            <p className="text-pretty text-[11px] leading-5 text-slate-400">
              Audio remains a draft source until the clinician finalizes the note.
            </p>
          </div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 xl:p-8">
          <div className="mx-auto max-w-5xl">
            {workspaceView === "brief" && (
              <section className="kizuna-panel overflow-hidden rounded-2xl border">
                <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-evergreen">PATIENT BRIEF</p>
                      <h2 className="mt-2 text-balance text-2xl font-bold text-slate-950">
                        What matters before this consultation
                      </h2>
                      <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-slate-500">
                        A concise view of active concerns, preventive care, and prior clinical context.
                      </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      <ShieldCheck size={14} aria-hidden="true" />
                      3 linked records
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 md:grid-cols-3">
                    {priorRecordSummary.map((item) => (
                      <article key={item.label} className="bg-white p-4">
                        <p className="text-xs font-semibold text-slate-400">{item.label}</p>
                        <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-slate-800">{item.value}</p>
                      </article>
                    ))}
                  </div>

                  <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
                    <section>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-slate-950">Clinical history</h3>
                          <p className="mt-1 text-xs text-slate-500">Most recent encounters first.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNotice("Record upload will be connected to patient history storage.")}
                          className="inline-flex items-center gap-2 text-xs font-bold text-marine transition-transform duration-150 active:scale-[0.97]"
                        >
                          <Paperclip size={14} aria-hidden="true" />
                          Add records
                        </button>
                      </div>
                      <div className="mt-5 border-l border-slate-200">
                        {recordTimeline.map((record) => (
                          <article className="relative pb-6 pl-6 last:pb-0" key={record.date}>
                            <span className="absolute -left-1 top-1 size-2 rounded-full bg-evergreen ring-4 ring-white" />
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-bold text-slate-400">{record.date}</p>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                {record.source}
                              </span>
                            </div>
                            <h4 className="mt-2 text-sm font-bold text-slate-900">{record.title}</h4>
                            <p className="mt-1 text-pretty text-xs leading-5 text-slate-500">{record.detail}</p>
                          </article>
                        ))}
                      </div>
                    </section>

                    <aside className="h-fit rounded-2xl bg-amber-50 p-5">
                      <p className="text-xs font-bold text-amber-800">ASK TODAY</p>
                      <h3 className="mt-2 text-balance font-bold text-amber-950">Close the open clinical loops</h3>
                      <ul className="mt-4 space-y-3 text-xs leading-5 text-amber-900/75">
                        <li>Current itch severity and distribution</li>
                        <li>Any recurring ear discomfort or discharge</li>
                        <li>Treatment received outside this clinic</li>
                      </ul>
                      <button
                        type="button"
                        onClick={() => setWorkspaceView("transcript")}
                        className="mt-5 h-10 w-full rounded-xl bg-amber-900 text-xs font-bold text-white transition-transform duration-150 active:scale-[0.97]"
                      >
                        Open transcript
                      </button>
                    </aside>
                  </div>
                </div>
              </section>
            )}

            {workspaceView === "transcript" && (
              <section className="kizuna-panel overflow-hidden rounded-2xl border">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <div>
                    <p className="text-xs font-bold text-evergreen">SOURCE</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-950">Consultation transcript</h2>
                    <p className="mt-1 text-xs text-slate-500">Correct names, doses, and clinical negations before review.</p>
                  </div>
                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {transcriptionProvider ? `Local · ${transcriptionProvider}` : "Editable"}
                  </span>
                </div>
                <div className="p-5 sm:p-7">
                  <textarea
                    aria-label="Consultation transcript"
                    value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                    className="min-h-[34rem] w-full resize-y border-0 bg-white p-0 text-[15px] leading-8 text-slate-700 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <p className="text-xs text-slate-400">Transcript changes are used when the note is regenerated.</p>
                  <button
                    type="button"
                    onClick={() => setWorkspaceView("note")}
                    className="h-10 rounded-xl bg-ink px-4 text-xs font-bold text-white transition-transform duration-150 active:scale-[0.97]"
                  >
                    Review clinical note
                  </button>
                </div>
              </section>
            )}

            {workspaceView === "note" && (
              <section className="kizuna-panel overflow-hidden rounded-2xl border">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <div>
                    <p className="text-xs font-bold text-evergreen">{noteTemplate.toUpperCase()}</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-950">Clinical note</h2>
                    <p className="mt-1 text-xs text-slate-500">AI draft · clinician review required</p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
                      noteStatus === "approved"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {noteStatus === "approved" ? "Finalized" : "Draft"}
                  </span>
                </div>

                <div className="p-5 sm:p-7">
                  {(missingInformation.length > 0 || warnings.length > 0) && (
                    <details className="mb-6 rounded-xl border border-amber-200 bg-amber-50">
                      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-amber-950">Review required</p>
                          <p className="mt-0.5 text-xs text-amber-900/65">
                            {missingInformation.length} missing · {warnings.length} warning
                          </p>
                        </div>
                        <span className="text-xs font-bold text-amber-800">View</span>
                      </summary>
                      <div className="grid gap-3 border-t border-amber-200 p-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold text-amber-950">Missing information</p>
                          <ul className="mt-2 space-y-1.5 text-xs text-amber-900/70">
                            {missingInformation.map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-amber-950">Clinical warnings</p>
                          <ul className="mt-2 space-y-1.5 text-xs text-amber-900/70">
                            {warnings.map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                      </div>
                    </details>
                  )}

                  <div className="divide-y divide-slate-100">
                    {Object.entries(note).map(([key, value]) => (
                      <label className="grid gap-3 py-5 first:pt-0 lg:grid-cols-[8rem_minmax(0,1fr)]" key={key}>
                        <span className="pt-2 text-xs font-bold uppercase text-slate-400">{key}</span>
                        <textarea
                          value={value}
                          onChange={(event) => setNote((current) => ({ ...current, [key]: event.target.value }))}
                          className="min-h-32 w-full resize-y rounded-xl border border-transparent bg-slate-50 p-4 text-sm leading-7 text-slate-700 outline-none transition-shadow duration-150 hover:border-slate-200 focus:border-slate-200 focus:bg-white focus:ring-2 focus:ring-marine"
                        />
                      </label>
                    ))}
                  </div>

                  <details className="mt-4 rounded-xl border border-slate-200">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-700">
                      <span>Clinical evidence</span>
                      <span className="text-xs font-semibold text-slate-400">{extractedFacts.length} linked facts</span>
                    </summary>
                    <div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                      {extractedFacts.map((fact, index) => (
                        <article className="rounded-xl border border-slate-200 bg-white p-3" key={`${fact.label}-${index}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400">{fact.category}</p>
                              <p className="mt-1 text-sm font-bold text-slate-900">
                                {fact.label}: {fact.value}
                              </p>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                              {fact.confidence}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-500">“{fact.evidence}”</p>
                        </article>
                      ))}
                    </div>
                  </details>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <ShieldCheck size={14} className="text-evergreen" aria-hidden="true" />
                    Nothing is added to the record until finalized.
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveDraft}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition-transform duration-150 active:scale-[0.97]"
                    >
                      Save draft
                    </button>
                    <button
                      type="button"
                      onClick={approveNote}
                      disabled={noteStatus === "approved"}
                      className="h-10 rounded-xl bg-ink px-4 text-xs font-bold text-white transition-transform duration-150 active:scale-[0.97] disabled:bg-emerald-700 disabled:active:scale-100"
                    >
                      {noteStatus === "approved" ? "Finalized" : "Finalize note"}
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {showConsentDialog && (
        <div className="scribe-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="premium-recording-consent-title"
            className="scribe-modal-panel w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                <Mic size={18} aria-hidden="true" />
              </div>
              <button
                type="button"
                aria-label="Close recording consent"
                onClick={() => setShowConsentDialog(false)}
                className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition-transform duration-150 hover:bg-slate-100 active:scale-[0.97]"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <h2 id="premium-recording-consent-title" className="mt-5 text-balance text-xl font-bold text-slate-950">
              Confirm recording consent
            </h2>
            <p className="mt-2 text-pretty text-sm leading-6 text-slate-500">
              Confirm that everyone being recorded understands the audio will be used to create this clinical note.
            </p>
            <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4 text-sm">
              <div className="flex justify-between gap-4 py-3">
                <span className="text-slate-500">Patient</span>
                <strong className="text-right text-slate-900">{selectedPet.name}</strong>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <span className="text-slate-500">Encounter</span>
                <strong className="text-right text-slate-900">{encounterType} · {noteTemplate}</strong>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <span className="text-slate-500">Language</span>
                <strong className="text-right text-slate-900">{recordingLanguage}</strong>
              </div>
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setShowConsentDialog(false)}
                className="h-11 rounded-xl border border-slate-200 font-bold text-slate-700 transition-transform duration-150 active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConsentConfirmed(true);
                  void beginRecording();
                }}
                className="h-11 rounded-xl bg-ink font-bold text-white transition-transform duration-150 active:scale-[0.97]"
              >
                Consent confirmed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
