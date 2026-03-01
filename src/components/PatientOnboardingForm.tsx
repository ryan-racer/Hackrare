"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Medication = { name: string; dose?: string; frequency?: string };

const STEPS = ["About You", "Care Team", "Health Context"] as const;
type StepIndex = 0 | 1 | 2;

function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  return { feet: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) };
}
function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54);
}
function kgToLbs(kg: number): number {
  return Math.round(kg * 2.205 * 10) / 10;
}
function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.205) * 10) / 10;
}

type Props = {
  initialName?: string | null;
};

export function PatientOnboardingForm({
  initialName = "",
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<StepIndex>(0);
  const sanitizedInitialName =
    initialName?.trim().toLowerCase() === "test" ? "" : (initialName ?? "");
  const [name, setName] = useState(sanitizedInitialName);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [useMetric, setUseMetric] = useState(false);
  // Metric storage (always sent to API)
  const [heightCm, setHeightCm] = useState<number | "">("");
  const [weightKg, setWeightKg] = useState<number | "">("");
  // Imperial display (when useMetric is false)
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [pcpName, setPcpName] = useState("");
  const [pcpCity, setPcpCity] = useState("");
  const [pcpState, setPcpState] = useState("");
  const [diagnosesText, setDiagnosesText] = useState("");
  const [medications, setMedications] = useState<Medication[]>([
    { name: "", dose: "", frequency: "" },
  ]);
  const [allergies, setAllergies] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addMedication() {
    setMedications((prev) => [...prev, { name: "", dose: "", frequency: "" }]);
  }

  function removeMedication(i: number) {
    setMedications((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateMedication(i: number, field: keyof Medication, value: string) {
    setMedications((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m))
    );
  }

  function getHeightCm(): number | null {
    if (useMetric) return heightCm === "" ? null : Number(heightCm);
    if (!heightFeet && !heightInches) return null;
    const inches = Math.min(12, Math.max(0, Number(heightInches) || 0));
    return feetInchesToCm(Number(heightFeet) || 0, inches);
  }

  function getWeightKg(): number | null {
    if (useMetric) return weightKg === "" ? null : Number(weightKg);
    if (!weightLbs) return null;
    return lbsToKg(Number(weightLbs));
  }

  function handleUnitToggle() {
    if (!useMetric) {
      const cm = getHeightCm();
      const kg = getWeightKg();
      setHeightCm(cm != null ? cm : "");
      setWeightKg(kg != null ? kg : "");
      setHeightFeet("");
      setHeightInches("");
      setWeightLbs("");
    } else {
      const cm = heightCm === "" ? null : Number(heightCm);
      const kg = weightKg === "" ? null : Number(weightKg);
      if (cm != null) {
        const { feet, inches } = cmToFeetInches(cm);
        setHeightFeet(String(feet));
        setHeightInches(String(inches));
      } else {
        setHeightFeet("");
        setHeightInches("");
      }
      setWeightLbs(kg != null ? String(kgToLbs(kg)) : "");
      setHeightCm("");
      setWeightKg("");
    }
    setUseMetric((prev) => !prev);
  }

  function canProceedFromStep(currentStep: StepIndex): boolean {
    if (currentStep === 0) {
      if (!name.trim()) return false;
      if (!dateOfBirth.trim()) return false;
      const h = getHeightCm();
      if (h == null || h <= 0) return false;
      const w = getWeightKg();
      if (w == null || w <= 0) return false;
      return true;
    }
    if (currentStep === 1) {
      if (!pcpName.trim()) return false;
      if (!pcpCity.trim()) return false;
      const state = pcpState.trim().toUpperCase();
      if (state.length !== 2) return false;
      return true;
    }
    return true;
  }

  function getStepError(currentStep: StepIndex): string | null {
    if (currentStep === 0) {
      if (!name.trim()) return "Name is required.";
      if (!dateOfBirth.trim()) return "Date of birth is required.";
      const h = getHeightCm();
      if (h == null || h <= 0) return "Height is required.";
      const w = getWeightKg();
      if (w == null || w <= 0) return "Weight is required.";
      return null;
    }
    if (currentStep === 1) {
      if (!pcpName.trim()) return "PCP name is required.";
      if (!pcpCity.trim()) return "City is required.";
      const state = pcpState.trim().toUpperCase();
      if (state.length !== 2) return "State must be 2 letters.";
      return null;
    }
    return null;
  }

  function goNext() {
    const err = getStepError(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => (s + 1) as StepIndex);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step !== 2) return;
    setError(null);
    const finalWeightKg = getWeightKg();
    if (finalWeightKg == null || finalWeightKg <= 0) {
      setError("Weight is required.");
      return;
    }
    setSubmitting(true);

    const diagnoses = diagnosesText
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    const meds = medications
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        dose: m.dose?.trim() || undefined,
        frequency: m.frequency?.trim() || undefined,
      }));

    const finalHeightCm = getHeightCm();

    try {
      const res = await fetch("/api/patient/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          dateOfBirth: dateOfBirth || null,
          heightCm: finalHeightCm,
          weightKg: finalWeightKg,
          pcpName: pcpName.trim() || null,
          pcpCity: pcpCity.trim() || null,
          pcpState: pcpState.trim() || null,
          currentDiagnoses: diagnoses,
          currentMedications: meds,
          allergies: allergies.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }
      router.push("/patient");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-stone-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 h-1 rounded-full ${
              i <= step ? "bg-stone-800" : "bg-stone-200"
            }`}
            title={label}
          />
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {/* Step 0: About you */}
      {step === 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight text-stone-900">
            About You
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className={labelClass}>
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="dateOfBirth" className={labelClass}>
                Date of birth
              </label>
              <input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={labelClass}>
                  {useMetric ? "Height (cm)" : "Height (ft/in)"}
                </span>
                <button
                  type="button"
                  onClick={handleUnitToggle}
                  className="text-sm text-stone-600 hover:text-stone-900 font-medium"
                >
                  {useMetric ? "Switch to Imperial" : "Switch to Metric"}
                </button>
              </div>
              {useMetric ? (
                <input
                  type="number"
                  min={50}
                  max={250}
                  value={heightCm}
                  onChange={(e) =>
                    setHeightCm(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className={inputClass}
                  placeholder="e.g. 170 cm"
                />
              ) : (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={2}
                    max={8}
                    value={heightFeet}
                    onChange={(e) => setHeightFeet(e.target.value)}
                    className={inputClass}
                    placeholder="ft"
                  />
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={heightInches}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setHeightInches("");
                        return;
                      }
                      const num = parseInt(raw, 10);
                      if (!Number.isNaN(num)) {
                        const clamped = Math.min(12, Math.max(0, num));
                        setHeightInches(String(clamped));
                      }
                    }}
                    className={inputClass}
                    placeholder="in"
                  />
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>
                {useMetric ? "Weight (kg)" : "Weight (lbs)"}
              </label>
              {useMetric ? (
                <input
                  type="number"
                  min={20}
                  max={500}
                  step={0.1}
                  value={weightKg}
                  onChange={(e) =>
                    setWeightKg(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className={inputClass}
                  placeholder="e.g. 70 kg"
                />
              ) : (
                <input
                  type="number"
                  min={44}
                  max={1100}
                  step={0.1}
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 150 lbs"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Care team */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight text-stone-900">
            Care Team
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="pcpName" className={labelClass}>
                Primary Care Physician or Practice
              </label>
              <input
                id="pcpName"
                type="text"
                value={pcpName}
                onChange={(e) => setPcpName(e.target.value)}
                className={inputClass}
                placeholder="Dr. Smith or Practice name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="pcpCity" className={labelClass}>
                  City
                </label>
                <input
                  id="pcpCity"
                  type="text"
                  value={pcpCity}
                  onChange={(e) => setPcpCity(e.target.value)}
                  className={inputClass}
                  placeholder="City"
                />
              </div>
              <div>
                <label htmlFor="pcpState" className={labelClass}>
                  State
                </label>
                <input
                  id="pcpState"
                  type="text"
                  value={pcpState}
                  onChange={(e) =>
                    setPcpState(e.target.value.slice(0, 2).toUpperCase())
                  }
                  maxLength={2}
                  className={inputClass}
                  placeholder="e.g. CA"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Health context */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight text-stone-900">
            Health Context (for better symptom tracking)
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="diagnoses" className={labelClass}>
                Current Diagnoses or Conditions
              </label>
              <textarea
                id="diagnoses"
                rows={3}
                value={diagnosesText}
                onChange={(e) => setDiagnosesText(e.target.value)}
                className={inputClass}
                placeholder="One per line, e.g.&#10;Migraine&#10;Anxiety&#10;Hypertension"
              />
              <p className="text-xs text-stone-500 mt-1">
                One condition per line. Helps us tailor your journal.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>Current Medications</label>
                <button
                  type="button"
                  onClick={addMedication}
                  className="text-sm text-stone-600 hover:text-stone-900 font-medium"
                >
                  + Add medication
                </button>
              </div>
              <div className="space-y-3">
                {medications.map((m, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-stone-200 bg-stone-50/50"
                  >
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) =>
                        updateMedication(i, "name", e.target.value)
                      }
                      className="flex-1 min-w-[120px] border border-stone-300 rounded-lg px-2 py-1.5 text-sm bg-white text-stone-900"
                      placeholder="Medication name"
                    />
                    <input
                      type="text"
                      value={m.dose ?? ""}
                      onChange={(e) =>
                        updateMedication(i, "dose", e.target.value)
                      }
                      className="w-20 border border-stone-300 rounded-lg px-2 py-1.5 text-sm bg-white text-stone-900"
                      placeholder="Dose"
                    />
                    <input
                      type="text"
                      value={m.frequency ?? ""}
                      onChange={(e) =>
                        updateMedication(i, "frequency", e.target.value)
                      }
                      className="w-24 border border-stone-300 rounded-lg px-2 py-1.5 text-sm bg-white text-stone-900"
                      placeholder="Frequency"
                    />
                    <button
                      type="button"
                      onClick={() => removeMedication(i)}
                      className="text-stone-500 hover:text-stone-800 text-sm"
                      aria-label="Remove"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="allergies" className={labelClass}>
                Allergies (Drug or Other)
              </label>
              <textarea
                id="allergies"
                rows={2}
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className={inputClass}
                placeholder="e.g. Penicillin; shellfish"
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-4 mt-10 pt-6 border-t border-stone-200">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as StepIndex)}
            className="px-6 py-3 rounded-lg border border-stone-300 bg-white text-stone-800 font-medium hover:bg-stone-50 hover:border-stone-400 transition-colors"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        <div className="flex-1" />
        {step < 2 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceedFromStep(step)}
            className="px-8 py-3.5 rounded-lg bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }}
            className="px-8 py-3.5 rounded-lg bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Saving…" : "Complete Setup"}
          </button>
        )}
      </div>
    </form>
  );
}
