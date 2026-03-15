'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

const RULES_VERSION = 'v1';
const CATEGORIES = [
  'Frais scolaires',
  'Ressources pédagogiques',
  'Projet scientifique',
  'Projet technologique',
  'Club scolaire',
  'Infrastructure éducative',
  'Autre projet éducatif'
];

const RULES = [
  'Le projet doit être strictement éducatif.',
  'Les demandes personnelles non justifiées sont interdites.',
  'Un budget détaillé est obligatoire.',
  'Un seul projet actif par élève.',
  "L'objectif financier doit être réaliste.",
  "LinkEduPro ne transfère pas directement les fonds à l'élève.",
  'Les fonds sont utilisés pour payer un fournisseur ou une institution.',
  "Un rapport final d'utilisation des fonds est obligatoire.",
  'Tout faux document entraîne la suspension du compte.',
  'LinkEduPro se réserve le droit de refuser un projet sans justification publique.'
];

export default function CreateEduCollectProjectPage() {
  const router = useRouter();
  const student = useMemo(() => getStudent(), []);
  const token = useMemo(() => getToken(), []);
  const [accepted, setAccepted] = useState(false);
  const [rulesAckSaved, setRulesAckSaved] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingRules, setSavingRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [school, setSchool] = useState(student?.school || '');
  const [teacherValidationText, setTeacherValidationText] = useState('');
  const [teacherValidationSignature, setTeacherValidationSignature] = useState('');
  const [proof, setProof] = useState(null);
  const [budgetItems, setBudgetItems] = useState([
    { label: '', amount: '', note: '' }
  ]);

  if (!token || !student) {
    return <main className="mx-auto max-w-3xl px-4 py-8"><p>Connexion requise.</p></main>;
  }
  if (student.role !== 'STUDENT') {
    return <main className="mx-auto max-w-3xl px-4 py-8"><p>Seuls les élèves peuvent créer un projet EduCollect.</p></main>;
  }

  async function onAcceptRules() {
    try {
      setSavingRules(true);
      setError('');
      await apiClient('/educollect/rules/accept', {
        method: 'POST',
        token,
        body: JSON.stringify({ rulesVersion: RULES_VERSION })
      });
      setRulesAckSaved(true);
      setSuccess('Règlement accepté. Vous pouvez créer votre projet.');
    } catch (e) {
      setError(e.message || 'Impossible d’enregistrer votre acceptation.');
    } finally {
      setSavingRules(false);
    }
  }

  function updateBudgetItem(index, key, value) {
    setBudgetItems((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  function addBudgetItem() {
    setBudgetItems((prev) => [...prev, { label: '', amount: '', note: '' }]);
  }

  function removeBudgetItem(index) {
    setBudgetItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!proof) {
      setError('Le justificatif est obligatoire.');
      return;
    }

    const normalizedBudget = budgetItems
      .map((item) => ({
        label: String(item.label || '').trim(),
        amount: Number(item.amount || 0),
        note: String(item.note || '').trim()
      }))
      .filter((item) => item.label && item.amount > 0);

    if (!normalizedBudget.length) {
      setError('Le budget détaillé est obligatoire.');
      return;
    }

    try {
      setSubmitting(true);
      const form = new FormData();
      form.append('title', title.trim());
      form.append('category', category);
      form.append('description', description.trim());
      form.append('targetAmount', String(Number(targetAmount || 0)));
      form.append('budgetItems', JSON.stringify(normalizedBudget));
      form.append('deadline', new Date(deadline).toISOString());
      form.append('school', school.trim());
      form.append('teacherValidationText', teacherValidationText.trim());
      form.append('teacherValidationSignature', teacherValidationSignature.trim());
      form.append('proof', proof);

      const data = await apiClient('/educollect/projects', {
        method: 'POST',
        token,
        body: form
      });
      setSuccess('Projet soumis pour validation.');
      if (data?.project?.id) {
        router.push(`/educollect/projects/${data.project.id}`);
      }
    } catch (e2) {
      setError(e2.message || 'Erreur lors de la création du projet.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <section className="card">
        <h1 className="text-2xl font-black text-brand-900">Créer un projet EduCollect</h1>
        <p className="mt-2 text-sm text-brand-700">Étape 1: lecture et acceptation obligatoire du règlement.</p>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold text-brand-900">Règlement EduCollect</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-brand-800">
          {RULES.map((rule) => <li key={rule}>{rule}</li>)}
        </ul>
        <label className="inline-flex items-start gap-2 text-sm text-brand-900">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          Je confirme avoir lu et accepté le règlement EduCollect.
        </label>
        <div>
          <button type="button" className="btn-primary" disabled={!accepted || savingRules || rulesAckSaved} onClick={onAcceptRules}>
            {savingRules ? 'Validation...' : (rulesAckSaved ? 'Règlement accepté' : 'Continuer')}
          </button>
        </div>
      </section>

      {rulesAckSaved ? (
        <section className="card">
          <h2 className="text-lg font-semibold text-brand-900">Étape 2: formulaire de projet</h2>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" required />
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <textarea className="input md:col-span-2 min-h-[130px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description détaillée" required />
            <input className="input" type="number" min="1" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="Objectif financier (HTG)" required />
            <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            <input className="input" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="École" required />
            <input className="input" value={teacherValidationSignature} onChange={(e) => setTeacherValidationSignature(e.target.value)} placeholder="Signature numérique prof (optionnel)" />
            <textarea className="input md:col-span-2 min-h-[90px]" value={teacherValidationText} onChange={(e) => setTeacherValidationText(e.target.value)} placeholder="Validation professeur (texte)" required />
            <label className="space-y-1 text-sm text-brand-900 md:col-span-2">
              <span className="font-medium">Justificatif (PDF ou image)</span>
              <input className="input w-full" type="file" accept=".pdf,image/*" onChange={(e) => setProof(e.target.files?.[0] || null)} required />
            </label>

            <div className="rounded-lg border border-brand-100 p-3 md:col-span-2">
              <p className="mb-2 text-sm font-semibold text-brand-900">Budget détaillé</p>
              <div className="space-y-2">
                {budgetItems.map((item, index) => (
                  <div key={`b-${index}`} className="grid gap-2 md:grid-cols-[1.2fr_0.6fr_1fr_auto]">
                    <input className="input" value={item.label} onChange={(e) => updateBudgetItem(index, 'label', e.target.value)} placeholder="Poste" />
                    <input className="input" type="number" min="1" value={item.amount} onChange={(e) => updateBudgetItem(index, 'amount', e.target.value)} placeholder="Montant" />
                    <input className="input" value={item.note} onChange={(e) => updateBudgetItem(index, 'note', e.target.value)} placeholder="Note (optionnel)" />
                    <button type="button" className="btn-secondary" onClick={() => removeBudgetItem(index)} disabled={budgetItems.length === 1}>Retirer</button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-secondary mt-3" onClick={addBudgetItem}>Ajouter une ligne budget</button>
            </div>

            <button className="btn-primary md:col-span-2" disabled={submitting}>
              {submitting ? 'Soumission...' : 'Soumettre le projet'}
            </button>
          </form>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}
    </main>
  );
}
