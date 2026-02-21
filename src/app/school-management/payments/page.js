'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';

export default function SchoolPaymentsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    studentId: '',
    classId: '',
    academicYearId: '',
    paymentTypeId: '',
    amountDue: '',
    amountPaid: '',
    notes: ''
  });

  useEffect(() => {
    async function load() {
      const token = getSchoolToken();
      const currentAdmin = getSchoolAdmin();
      const allowedRoles = ['SCHOOL_ADMIN', 'SCHOOL_ACCOUNTANT'];

      if (!token || !currentAdmin) {
        router.push('/school-management/login');
        return;
      }

      if (!allowedRoles.includes(currentAdmin.role)) {
        clearSchoolAuth();
        router.push('/school-management/login');
        return;
      }

      setAdmin(currentAdmin);

      try {
        setError('');
        const schoolId = currentAdmin.schoolId;

        // Load data in parallel
        const [paymentsRes, typesRes, studentsRes, classesRes, yearsRes] = await Promise.all([
          apiClient(`/school-management/payments/schools/${schoolId}`, { token }),
          apiClient(`/school-management/payments/types/schools/${schoolId}`, { token }),
          apiClient(`/school-management/students/schools/${schoolId}`, { token }),
          apiClient(`/school-management/classes/schools/${schoolId}`, { token }),
          apiClient(`/school-management/schools/${schoolId}/academic-years`, { token })
        ]);

        setPayments(paymentsRes.payments || []);
        setPaymentTypes(typesRes.paymentTypes || []);
        setStudents(studentsRes.students || []);
        setClasses(classesRes.classes || []);
        setAcademicYears(yearsRes.academicYears || []);
      } catch (e) {
        setError(e.message || 'Erreur lors du chargement des données.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function reloadPayments(token, schoolId) {
    const paymentsRes = await apiClient(`/school-management/payments/schools/${schoolId}`, { token });
    setPayments(paymentsRes.payments || []);
  }

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const token = getSchoolToken();
      const schoolId = admin.schoolId;

      const payload = {
        schoolId,
        ...form,
        amountDue: parseFloat(form.amountDue),
        amountPaid: parseFloat(form.amountPaid)
      };

      await apiClient('/school-management/payments', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });

      // Refresh list to keep structure consistent with list endpoint (includes relations).
      await reloadPayments(token, schoolId);
      setShowCreateModal(false);
      setForm({
        studentId: '',
        classId: '',
        academicYearId: '',
        paymentTypeId: '',
        amountDue: '',
        amountPaid: '',
        notes: ''
      });
    } catch (e) {
      setError(e.message || 'Erreur lors de la création du paiement.');
    } finally {
      setCreating(false);
    }
  };

  const downloadReceipt = async (paymentId) => {
    const token = getSchoolToken();
    const schoolId = admin.schoolId;
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const url = `${base}/school-management/payments/schools/${schoolId}/${paymentId}/receipt`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Impossible de telecharger le recu.');
      }

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 30_000);
    } catch (e) {
      setError(e.message || 'Erreur lors du telechargement du recu.');
    }
  };

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8">Chargement...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-brand-700">Gestion des paiements</p>
          <h1 className="text-2xl font-bold text-brand-900">Paiements scolaires</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          Nouveau paiement
        </button>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-900 mb-4">Liste des paiements</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-brand-700">Aucun paiement enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-200">
                  <th className="text-left py-2">Élève</th>
                  <th className="text-left py-2">Classe</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Montant dû</th>
                  <th className="text-left py-2">Montant payé</th>
                  <th className="text-left py-2">Statut</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-brand-100">
                    <td className="py-2">{payment.student.firstName} {payment.student.lastName}</td>
                    <td className="py-2">{payment.schoolClass.name}</td>
                    <td className="py-2">{payment.paymentType.name}</td>
                    <td className="py-2">{payment.amountDue}</td>
                    <td className="py-2">{payment.amountPaid}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        payment.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        payment.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-2">{new Date(payment.paymentDate).toLocaleDateString('fr-FR')}</td>
                    <td className="py-2">
                      <button
                        onClick={() => downloadReceipt(payment.id)}
                        className="text-brand-600 hover:text-brand-800 text-sm"
                      >
                        Reçu
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create Payment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-brand-900 mb-4">Nouveau paiement</h3>
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-700">Élève</label>
                <select
                  value={form.studentId}
                  onChange={(e) => setForm(prev => ({ ...prev, studentId: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-brand-300 px-3 py-2"
                  required
                >
                  <option value="">Sélectionner un élève</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700">Classe</label>
                <select
                  value={form.classId}
                  onChange={(e) => setForm(prev => ({ ...prev, classId: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-brand-300 px-3 py-2"
                  required
                >
                  <option value="">Sélectionner une classe</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700">Année académique</label>
                <select
                  value={form.academicYearId}
                  onChange={(e) => setForm(prev => ({ ...prev, academicYearId: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-brand-300 px-3 py-2"
                  required
                >
                  <option value="">Sélectionner une année</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>{year.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700">Type de paiement</label>
                <select
                  value={form.paymentTypeId}
                  onChange={(e) => setForm(prev => ({ ...prev, paymentTypeId: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-brand-300 px-3 py-2"
                  required
                >
                  <option value="">Sélectionner un type</option>
                  {paymentTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700">Montant dû</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amountDue}
                  onChange={(e) => setForm(prev => ({ ...prev, amountDue: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-brand-300 px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700">Montant payé</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amountPaid}
                  onChange={(e) => setForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-brand-300 px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-brand-300 px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                >
                  {creating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
