'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';
import { API_BASE_URL } from '@/lib/runtime-config';

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
  const [creatingType, setCreatingType] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: '', description: '' });
  const [feePlan, setFeePlan] = useState(null);
  const [feeMeta, setFeeMeta] = useState({
    suppliesTotal: 0,
    studentCount: 0,
    totalPerStudent: 0,
    totalCollectable: 0
  });
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);

  const [form, setForm] = useState({
    studentId: '',
    classId: '',
    academicYearId: '',
    paymentTypeId: '',
    isInstallment: false,
    amountDue: '',
    amountPaid: '',
    notes: ''
  });

  const classStudents = form.classId
    ? students.filter((student) => String(student.classId) === String(form.classId))
    : [];
  const studentQuery = studentSearch.trim().toLowerCase();
  const studentSuggestions = studentQuery
    ? classStudents.filter((student) => {
      const label = `${student.firstName || ''} ${student.lastName || ''} ${student.studentId || ''}`.toLowerCase();
      return label.includes(studentQuery);
    })
    : classStudents;

  const feePlanInstallmentTotal = Array.isArray(feePlan?.installments)
    ? feePlan.installments.reduce((sum, installment) => sum + Number(installment.amount || 0), 0)
    : 0;
  const annualFeesValue = Number(form.amountDue || 0);
  const installmentsMismatch = Boolean(form.isInstallment)
    && feePlanInstallmentTotal > 0
    && annualFeesValue > 0
    && Math.abs(feePlanInstallmentTotal - annualFeesValue) > 0.01;

  const paymentSummaries = (() => {
    const map = new Map();
    for (const payment of payments) {
      const key = `${payment.student?.id}__${payment.paymentType?.id}__${payment.academicYear?.id}`;
      if (!map.has(key)) {
        map.set(key, {
          studentName: `${payment.student?.firstName || ''} ${payment.student?.lastName || ''}`.trim(),
          paymentType: payment.paymentType?.name || '-',
          academicYear: payment.academicYear?.label || '-',
          amountDue: Number(payment.amountDue || 0),
          amountPaid: 0,
          lastPaymentDate: null
        });
      }
      const current = map.get(key);
      current.amountDue = Math.max(current.amountDue, Number(payment.amountDue || 0));
      current.amountPaid += Number(payment.amountPaid || 0);
      const date = payment.paymentDate ? new Date(payment.paymentDate) : null;
      if (date && (!current.lastPaymentDate || date > current.lastPaymentDate)) {
        current.lastPaymentDate = date;
      }
    }
    const now = new Date();
    return Array.from(map.values())
      .map((row) => ({
        ...row,
        remaining: Math.max(0, row.amountDue - row.amountPaid),
        status: row.amountPaid >= row.amountDue ? 'SOLDE' : row.amountPaid > 0 ? 'PARTIEL' : 'IMPAYE',
        overdueDays: row.lastPaymentDate
          ? Math.floor((now.getTime() - row.lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24))
          : null
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  })();

  const overdueAlerts = paymentSummaries.filter(
    (row) => row.remaining > 0 && row.overdueDays !== null && row.overdueDays >= 30
  );
  const criticalOverdueAlerts = paymentSummaries.filter(
    (row) => row.remaining > 0 && row.overdueDays !== null && row.overdueDays >= 90
  );

  useEffect(() => {
    async function load() {
      const token = getSchoolToken();
      const currentAdmin = getSchoolAdmin();
      const allowedRoles = ['SCHOOL_ADMIN', 'SCHOOL_ACCOUNTANT', 'SCHOOL_PAYMENTS_MANAGER'];

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

  useEffect(() => {
    async function loadFeePlan() {
      if (!admin || !form.classId) {
        setFeePlan(null);
        setFeeMeta({
          suppliesTotal: 0,
          studentCount: 0,
          totalPerStudent: 0,
          totalCollectable: 0
        });
        return;
      }
      try {
        const token = getSchoolToken();
        const schoolId = admin.schoolId;
        const query = form.academicYearId ? `?academicYearId=${encodeURIComponent(form.academicYearId)}` : '';
        const data = await apiClient(`/school-management/fee-plans/schools/${schoolId}/classes/${form.classId}${query}`, { token });
        setFeePlan(data.feePlan || null);
        setFeeMeta({
          suppliesTotal: Number(data.suppliesTotal || 0),
          studentCount: Number(data.studentCount || 0),
          totalPerStudent: Number(data.totalPerStudent || 0),
          totalCollectable: Number(data.totalCollectable || 0)
        });
      } catch (_) {
        setFeePlan(null);
        setFeeMeta({
          suppliesTotal: 0,
          studentCount: 0,
          totalPerStudent: 0,
          totalCollectable: 0
        });
      }
    }

    loadFeePlan();
  }, [admin, form.classId, form.academicYearId]);

  async function reloadPayments(token, schoolId) {
    const paymentsRes = await apiClient(`/school-management/payments/schools/${schoolId}`, { token });
    setPayments(paymentsRes.payments || []);
  }

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      if (!form.studentId) {
        throw new Error('Veuillez sélectionner un élève.');
      }
      if (!form.amountDue || Number.isNaN(Number(form.amountDue)) || !form.amountPaid || Number.isNaN(Number(form.amountPaid))) {
        throw new Error('Veuillez choisir un versement ou utiliser les frais annuels.');
      }
      const token = getSchoolToken();
      const schoolId = admin.schoolId;

      const payload = {
        schoolId,
        ...form,
        isInstallment: Boolean(form.isInstallment),
        amountDue: parseFloat(form.amountDue),
        amountPaid: parseFloat(form.amountPaid),
        notes: form.isInstallment
          ? `[VERSEMENT] ${String(form.notes || '').trim()}`
          : form.notes
      };

      const response = await apiClient('/school-management/payments', {
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
        isInstallment: false,
        notes: ''
      });
      setStudentSearch('');
      setShowStudentSuggestions(false);
      setSelectedInstallment(null);

      const createdPaymentId = response?.payment?.id;
      if (createdPaymentId) {
        await downloadReceipt(createdPaymentId);
      }
    } catch (e) {
      setError(e.message || 'Erreur lors de la création du paiement.');
    } finally {
      setCreating(false);
    }
  };

  const applyInstallment = (installment) => {
    if (!installment) return;
    setForm((prev) => ({
      ...prev,
      isInstallment: true,
      amountDue: feePlan?.totalAmount ? String(feePlan.totalAmount) : prev.amountDue,
      amountPaid: String(installment.amount || ''),
      notes: installment.label ? `Versement: ${installment.label}` : prev.notes
    }));
    setSelectedInstallment({
      label: installment.label || '',
      amount: installment.amount || ''
    });
  };

  const handleSelectStudent = (student) => {
    const label = `${student.firstName || ''} ${student.lastName || ''}`.trim();
    const defaultAnnualFee = feePlan?.totalAmount ?? feeMeta.totalPerStudent ?? '';
    setForm((prev) => ({
      ...prev,
      studentId: String(student.id),
      amountDue: defaultAnnualFee !== '' && defaultAnnualFee !== null ? String(defaultAnnualFee) : prev.amountDue
    }));
    setStudentSearch(label || '');
    setShowStudentSuggestions(false);
  };

  const downloadReceipt = async (paymentId) => {
    const token = getSchoolToken();
    const schoolId = admin.schoolId;
    const url = `${API_BASE_URL}/school-management/payments/schools/${schoolId}/${paymentId}/receipt`;

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

  const handleCreatePaymentType = async (e) => {
    e.preventDefault();
    if (!admin) return;
    setCreatingType(true);
    setError('');
    try {
      const token = getSchoolToken();
      const schoolId = admin.schoolId;
      const response = await apiClient('/school-management/payments/types', {
        method: 'POST',
        token,
        body: JSON.stringify({
          schoolId,
          name: typeForm.name,
          description: typeForm.description || null
        })
      });
      setPaymentTypes((prev) => [...prev, response.paymentType].sort((a, b) => a.name.localeCompare(b.name)));
      setTypeForm({ name: '', description: '' });
    } catch (e) {
      setError(e.message || 'Erreur lors de la création du type de paiement.');
    } finally {
      setCreatingType(false);
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

      {criticalOverdueAlerts.length > 0 ? (
        <section className="card border border-red-300 bg-red-100">
          <h2 className="text-xl font-semibold text-red-800 mb-3">
            Retards critiques 3+ mois ({criticalOverdueAlerts.length})
          </h2>
          <div className="space-y-2">
            {criticalOverdueAlerts.map((row, idx) => (
              <div key={`${row.studentName}_${row.paymentType}_critical_${idx}`} className="rounded border border-red-300 bg-white px-3 py-2">
                <p className="text-sm text-red-900">
                  {row.studentName} - {row.paymentType} ({row.academicYear}) : retard de {row.overdueDays} jours, reste {row.remaining}.
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {overdueAlerts.length > 0 ? (
        <section className="card border border-red-200 bg-red-50">
          <h2 className="text-xl font-semibold text-red-700 mb-3">Alertes de retard ({overdueAlerts.length})</h2>
          <div className="space-y-2">
            {overdueAlerts.map((row, idx) => (
              <div key={`${row.studentName}_${row.paymentType}_${idx}`} className="rounded border border-red-200 bg-white px-3 py-2">
                <p className="text-sm text-red-800">
                  {row.studentName} - {row.paymentType} ({row.academicYear}) : retard de {row.overdueDays} jours, reste {row.remaining}.
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-900 mb-4">Resume des soldes (frais/versements)</h2>
        {paymentSummaries.length === 0 ? (
          <p className="text-sm text-brand-700">Aucun solde disponible.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-200">
                  <th className="text-left py-2">Élève</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Annee</th>
                  <th className="text-left py-2">Frais total</th>
                  <th className="text-left py-2">Total verse</th>
                  <th className="text-left py-2">Reste</th>
                  <th className="text-left py-2">Retard</th>
                  <th className="text-left py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {paymentSummaries.map((row, idx) => (
                  <tr key={`${row.studentName}_${row.paymentType}_${idx}`} className="border-b border-brand-100">
                    <td className="py-2">{row.studentName}</td>
                    <td className="py-2">{row.paymentType}</td>
                    <td className="py-2">{row.academicYear}</td>
                    <td className="py-2">{row.amountDue}</td>
                    <td className="py-2">{row.amountPaid}</td>
                    <td className="py-2">{row.remaining}</td>
                    <td className="py-2">
                      {row.remaining > 0 && row.overdueDays !== null ? (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          row.overdueDays >= 90
                            ? 'bg-red-200 text-red-900'
                            : row.overdueDays >= 30
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {row.overdueDays >= 90 ? `${row.overdueDays} jours (3+ mois)` : `${row.overdueDays} jours`}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        row.status === 'SOLDE' ? 'bg-green-100 text-green-800' :
                        row.status === 'PARTIEL' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {admin?.role === 'SCHOOL_ADMIN' ? (
        <section className="card">
          <h2 className="text-xl font-semibold text-brand-900 mb-4">Types de paiements</h2>
          <form onSubmit={handleCreatePaymentType} className="grid gap-3 sm:grid-cols-3">
            <input
              className="input"
              placeholder="Nom du type (ex: Cantine, Uniforme)"
              value={typeForm.name}
              onChange={(e) => setTypeForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <input
              className="input"
              placeholder="Description (optionnel)"
              value={typeForm.description}
              onChange={(e) => setTypeForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <button type="submit" className="btn-primary" disabled={creatingType}>
              {creatingType ? 'création...' : 'Ajouter le type'}
            </button>
          </form>
        </section>
      ) : null}

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
              {!form.paymentTypeId ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-brand-700">Classe</label>
                    <select
                      value={form.classId}
                      onChange={(e) => {
                        const nextClassId = e.target.value;
                        setForm(prev => ({ ...prev, classId: nextClassId, studentId: '' }));
                        setStudentSearch('');
                        setShowStudentSuggestions(false);
                      }}
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

                  <div className="relative">
                    <label className="block text-sm font-medium text-brand-700">Élève (recherche)</label>
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setShowStudentSuggestions(true);
                      }}
                      onFocus={() => setShowStudentSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowStudentSuggestions(false), 120)}
                      className="mt-1 block w-full rounded-md border border-brand-300 px-3 py-2"
                      placeholder={form.classId ? 'Rechercher un élève...' : 'Choisis d’abord une classe'}
                      disabled={!form.classId}
                      required
                    />
                    {showStudentSuggestions && form.classId ? (
                      <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-brand-200 bg-white shadow-lg">
                        {studentSuggestions.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-brand-600">Aucun élève trouvé.</div>
                        ) : (
                          studentSuggestions.slice(0, 8).map((student) => (
                            <button
                              key={student.id}
                              type="button"
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
                              onMouseDown={() => handleSelectStudent(student)}
                            >
                              <span>{student.firstName} {student.lastName}</span>
                              <span className="text-xs text-brand-500">{student.studentId || ''}</span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-xs text-brand-700">
                  <span className="font-semibold">Résumé :</span>{' '}
                  {form.academicYearId ? (academicYears.find((y) => String(y.id) === String(form.academicYearId))?.label || '-') : '-'} ·{' '}
                  {form.classId ? (classes.find((c) => String(c.id) === String(form.classId))?.name || '-') : '-'} ·{' '}
                  {form.studentId
                    ? (students.find((s) => String(s.id) === String(form.studentId))
                      ? `${students.find((s) => String(s.id) === String(form.studentId)).firstName} ${students.find((s) => String(s.id) === String(form.studentId)).lastName}`
                      : '-')
                    : '-'}
                </div>
              )}

              {form.classId && form.paymentTypeId ? (
                <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-3 text-sm text-brand-800">
                  <p className="font-semibold text-brand-900">Plan de frais de la classe</p>
                  {feePlan ? (
                    <div className="mt-3 space-y-2">
                      {selectedInstallment ? (
                        <div className="rounded border border-brand-200 bg-white px-3 py-2 text-xs text-brand-800">
                          Versement choisi : <span className="font-semibold">{selectedInstallment.label || 'Versement'}</span>{' '}
                          ({selectedInstallment.amount})
                          <button
                            type="button"
                            className="ml-2 text-xs text-brand-600 hover:text-brand-800"
                            onClick={() => {
                              setSelectedInstallment(null);
                              setForm((prev) => ({
                                ...prev,
                                isInstallment: false,
                                amountPaid: '',
                                notes: ''
                              }));
                            }}
                          >
                            Changer
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-brand-700">
                            Total des versements: <span className="font-semibold">{feePlanInstallmentTotal}</span>
                          </p>
                          {installmentsMismatch ? (
                            <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                              Le total des versements ne correspond pas aux frais annuels.
                            </div>
                          ) : null}
                          <button
                            type="button"
                            className="btn-secondary !px-3 !py-1 text-xs"
                            onClick={() => {
                              const amount = String(feePlan.totalAmount || '');
                              setForm((prev) => ({
                                ...prev,
                                isInstallment: false,
                                amountDue: amount,
                                amountPaid: amount,
                                notes: ''
                              }));
                              setSelectedInstallment(null);
                            }}
                          >
                            Utiliser les frais annuels
                          </button>
                          {Array.isArray(feePlan.installments) && feePlan.installments.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-xs text-brand-700">Versements rapides :</p>
                              <div className="flex flex-wrap gap-2">
                                {feePlan.installments.map((item, idx) => (
                                  <button
                                    key={`${item.label || 'versement'}-${idx}`}
                                    type="button"
                                    className="btn-secondary !px-3 !py-1 text-xs"
                                    onClick={() => applyInstallment(item)}
                                  >
                                    {item.label || `Versement ${idx + 1}`} : {item.amount}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-brand-700">Aucun plan de frais défini pour cette classe.</p>
                  )}
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-brand-700">Type de paiement</label>
                <select
                  value={form.paymentTypeId}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    const chosenType = paymentTypes.find((type) => String(type.id) === String(nextType));
                    const defaultAmount = chosenType?.defaultAmount ?? '';
                    setForm(prev => ({
                      ...prev,
                      paymentTypeId: nextType,
                      isInstallment: false,
                      amountDue: defaultAmount !== '' && defaultAmount !== null ? String(defaultAmount) : prev.amountDue,
                      amountPaid: defaultAmount !== '' && defaultAmount !== null ? String(defaultAmount) : '',
                      notes: ''
                    }));
                    setSelectedInstallment(null);
                  }}
                  className="mt-1 block w-full rounded-md border border-brand-300 px-3 py-2"
                  required
                >
                  <option value="">Sélectionner un type</option>
                  {paymentTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
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
