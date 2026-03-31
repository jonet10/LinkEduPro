'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/media';

function formatHtg(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'HTG',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function getStorageUrl(fileUrl) {
  if (!fileUrl) return '#';
  return resolveMediaUrl(fileUrl) || '#';
}

export default function EduCollectProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params?.id);
  const [student, setStudent] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [donating, setDonating] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('MONCASH');
  const [visibilityType, setVisibilityType] = useState('');
  const [transactionReference, setTransactionReference] = useState('');

  const [reportText, setReportText] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [flagDetails, setFlagDetails] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [disbursedTo, setDisbursedTo] = useState('');

  useEffect(() => {
    setStudent(getStudent());
  }, []);

  async function loadProject() {
    if (!Number.isInteger(projectId) || projectId <= 0) return;
    try {
      setLoading(true);
      setError('');
      const token = getToken();
      const data = await apiClient(`/educollect/projects/${projectId}`, { token: token || undefined });
      setProject(data.project || null);
    } catch (e) {
      setError(e.message || 'Impossible de charger le projet.');
      setProject(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const isAdmin = student?.role === 'ADMIN';
  const isOwner = student?.id && project?.owner?.id === student?.id;
  const canDonate = student && !isOwner && project?.status === 'APPROVED';

  const budgetItems = useMemo(() => {
    const raw = project?.budgetItems;
    if (Array.isArray(raw)) return raw;
    return [];
  }, [project?.budgetItems]);

  async function submitDonation(e) {
    e.preventDefault();
    if (!visibilityType) {
      setError('Choisis une option de visibilité du don.');
      return;
    }
    try {
      setDonating(true);
      setError('');
      setSuccess('');
      await apiClient(`/educollect/projects/${projectId}/donations`, {
        method: 'POST',
        token: getToken(),
        body: JSON.stringify({
          amount: Number(amount || 0),
          paymentMethod,
          visibilityType,
          transactionReference: transactionReference.trim() || null
        })
      });
      setSuccess('Don enregistré avec succès.');
      setAmount('');
      setVisibilityType('');
      setTransactionReference('');
      await loadProject();
    } catch (e2) {
      setError(e2.message || 'Impossible d’enregistrer le don.');
    } finally {
      setDonating(false);
    }
  }

  async function submitFinalReport() {
    try {
      setError('');
      setSuccess('');
      await apiClient(`/educollect/projects/${projectId}/reports`, {
        method: 'POST',
        token: getToken(),
        body: JSON.stringify({ content: reportText })
      });
      setReportText('');
      setSuccess('Rapport final soumis.');
      await loadProject();
    } catch (e) {
      setError(e.message || 'Impossible de soumettre le rapport.');
    }
  }

  async function submitFlag() {
    try {
      setError('');
      setSuccess('');
      await apiClient(`/educollect/projects/${projectId}/flags`, {
        method: 'POST',
        token: getToken(),
        body: JSON.stringify({ reason: flagReason, details: flagDetails })
      });
      setFlagReason('');
      setFlagDetails('');
      setSuccess('Signalement envoyé.');
    } catch (e) {
      setError(e.message || 'Impossible de signaler ce projet.');
    }
  }

  async function adminAction(path, body) {
    try {
      setReviewing(true);
      setError('');
      setSuccess('');
      await apiClient(`/educollect/projects/${projectId}/${path}`, {
        method: 'PATCH',
        token: getToken(),
        body: JSON.stringify(body)
      });
      setSuccess('Action admin effectuée.');
      await loadProject();
    } catch (e) {
      setError(e.message || 'Action admin impossible.');
    } finally {
      setReviewing(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-8"><p>Chargement...</p></main>;
  if (!project) return <main className="mx-auto max-w-5xl px-4 py-8"><p>Projet introuvable.</p></main>;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <section className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{project.category}</p>
        <h1 className="mt-2 text-2xl font-black text-brand-900">{project.title}</h1>
        <p className="mt-2 text-sm text-brand-700">{project.description}</p>
        <p className="mt-2 text-sm text-brand-700">École: {project.school}</p>
        <p className="text-sm text-brand-700">Statut: <span className="font-semibold">{project.status}</span></p>
        <div className="mt-3 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-brand-500" style={{ width: `${project.progressPercent}%` }} />
        </div>
        <p className="mt-2 text-sm text-brand-700">
          {formatHtg(project.collectedAmount)} collectés / {formatHtg(project.targetAmount)} - reste {formatHtg(project.remainingAmount)}
        </p>
        <p className="text-sm text-brand-700">Contributeurs: {project.contributorCount}</p>
        {project.proofUrl ? (
          <a className="btn-secondary mt-4 inline-block" href={getStorageUrl(project.proofUrl)} target="_blank" rel="noreferrer">Voir justificatif</a>
        ) : null}
      </section>

      {budgetItems.length > 0 ? (
        <section className="card">
          <h2 className="text-lg font-semibold text-brand-900">Budget détaillé</h2>
          <div className="mt-3 space-y-2">
            {budgetItems.map((item, index) => (
              <div key={`b-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-brand-100 px-3 py-2 text-sm">
                <span>{item.label}</span>
                <span className="font-semibold">{formatHtg(item.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {canDonate ? (
        <section className="card">
          <h2 className="text-lg font-semibold text-brand-900">Faire un don</h2>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={submitDonation}>
            <input className="input" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant (HTG)" required />
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="MONCASH">MonCash</option>
              <option value="NATCASH">NatCash</option>
            </select>
            <input className="input md:col-span-2" value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} placeholder="Référence transaction (optionnel)" />
            <div className="space-y-2 rounded-lg border border-brand-100 p-3 md:col-span-2">
              <p className="text-sm font-semibold text-brand-900">Choix de visibilité (obligatoire)</p>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="visibility" value="PUBLIC" checked={visibilityType === 'PUBLIC'} onChange={(e) => setVisibilityType(e.target.value)} /> Nom et montant visibles</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="visibility" value="NAME_ONLY" checked={visibilityType === 'NAME_ONLY'} onChange={(e) => setVisibilityType(e.target.value)} /> Nom visible, montant privé</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="visibility" value="ANONYMOUS" checked={visibilityType === 'ANONYMOUS'} onChange={(e) => setVisibilityType(e.target.value)} /> Don anonyme</label>
            </div>
            <button className="btn-primary md:col-span-2" disabled={donating}>{donating ? 'Traitement...' : 'Confirmer le don'}</button>
          </form>
        </section>
      ) : null}

      <section className="card">
        <h2 className="text-lg font-semibold text-brand-900">Dons</h2>
        <div className="mt-3 space-y-2">
          {(project.donations || []).map((donation) => (
            <div key={donation.id} className="rounded border border-brand-100 px-3 py-2 text-sm">
              <p className="font-semibold text-brand-900">
                {donation.donorName}
                {donation.partnerVerified ? ' · Partenaire Vérifié' : ''}
              </p>
              <p className="text-brand-700">
                {donation.amount !== null && donation.amount !== undefined ? formatHtg(donation.amount) : 'Montant privé'}
              </p>
            </div>
          ))}
          {(project.donations || []).length === 0 ? <p className="text-sm text-brand-700">Aucun don affichable.</p> : null}
        </div>
      </section>

      {student ? (
        <section className="card grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-base font-semibold text-brand-900">Signaler un projet</h3>
            <input className="input mt-2" value={flagReason} onChange={(e) => setFlagReason(e.target.value)} placeholder="Raison" />
            <textarea className="input mt-2 min-h-[100px]" value={flagDetails} onChange={(e) => setFlagDetails(e.target.value)} placeholder="Détails (optionnel)" />
            <button className="btn-secondary mt-2" type="button" onClick={submitFlag}>Envoyer signalement</button>
          </div>

          {isOwner ? (
            <div>
              <h3 className="text-base font-semibold text-brand-900">Soumettre un rapport final</h3>
              <textarea className="input mt-2 min-h-[120px]" value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Rapport d’utilisation des fonds" />
              <button className="btn-primary mt-2" type="button" onClick={submitFinalReport}>Soumettre rapport</button>
            </div>
          ) : null}
        </section>
      ) : null}

      {isAdmin ? (
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold text-brand-900">Actions Admin</h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={reviewing} onClick={() => adminAction('review', { decision: 'APPROVED', note: adminNote })}>Approuver</button>
            <button className="btn-secondary" disabled={reviewing} onClick={() => adminAction('review', { decision: 'REJECTED', note: adminNote })}>Refuser</button>
            <button className="btn-secondary" disabled={reviewing} onClick={() => adminAction('suspend', { reason: suspendReason || 'Suspendu par admin' })}>Suspendre</button>
            <button className="btn-secondary" disabled={reviewing} onClick={() => adminAction('disburse', { disbursedTo: disbursedTo || 'Fournisseur', note: adminNote })}>Autoriser décaissement</button>
            <button className="btn-secondary" disabled={reviewing} onClick={() => adminAction('close', { note: adminNote })}>Clôturer</button>
            <Link href="/educollect/admin" className="btn-secondary">Dashboard admin</Link>
          </div>
          <input className="input" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Note admin" />
          <input className="input" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Raison suspension" />
          <input className="input" value={disbursedTo} onChange={(e) => setDisbursedTo(e.target.value)} placeholder="Décaissement vers (fournisseur/institution)" />
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}
    </main>
  );
}
