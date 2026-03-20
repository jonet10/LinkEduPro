'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';

const emptyFeeForm = {
  totalAmount: '',
  installments: []
};

const emptySupplyForm = {
  name: '',
  quantity: '1',
  unitCost: ''
};

export default function SchoolSettingsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [feeForm, setFeeForm] = useState(emptyFeeForm);
  const [feePlan, setFeePlan] = useState(null);
  const [feeMeta, setFeeMeta] = useState({
    suppliesTotal: 0,
    studentCount: 0,
    totalPerStudent: 0,
    totalCollectable: 0
  });
  const [supplies, setSupplies] = useState([]);
  const [suppliesMeta, setSuppliesMeta] = useState({
    suppliesTotal: 0,
    studentCount: 0,
    totalCollectable: 0
  });
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [typeForm, setTypeForm] = useState({ name: '', description: '', amount: '' });
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [savingType, setSavingType] = useState(false);
  const [supplyForm, setSupplyForm] = useState(emptySupplyForm);
  const [editingSupplyId, setEditingSupplyId] = useState(null);
  const [editSupplyForm, setEditSupplyForm] = useState({
    name: '',
    quantity: '',
    unitCost: ''
  });
  const [configForm, setConfigForm] = useState({
    logo: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [savingFeePlan, setSavingFeePlan] = useState(false);
  const [savingSupply, setSavingSupply] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canEdit = admin?.role === 'SCHOOL_ADMIN';

  const installmentsTotal = useMemo(() => (
    feeForm.installments.reduce((total, item) => total + Number(item.amount || 0), 0)
  ), [feeForm.installments]);

  useEffect(() => {
    async function load() {
      const token = getSchoolToken();
      const currentAdmin = getSchoolAdmin();
      const allowedRoles = ['SCHOOL_ADMIN'];

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
        const [classesRes, yearsRes, configRes, typesRes] = await Promise.all([
          apiClient(`/school-management/classes/schools/${schoolId}`, { token }),
          apiClient(`/school-management/schools/${schoolId}/academic-years`, { token }),
          apiClient(`/school-management/config/schools/${schoolId}`, { token }),
          apiClient(`/school-management/payments/types/schools/${schoolId}`, { token })
        ]);

        const classList = classesRes.classes || [];
        const yearList = yearsRes.academicYears || [];
        setClasses(classList);
        setAcademicYears(yearList);
        setConfigForm({
          logo: configRes?.config?.logo || '',
          phone: configRes?.config?.phone || '',
          address: configRes?.config?.address || ''
        });
        setPaymentTypes(typesRes?.paymentTypes || []);

        const defaultClassId = classList[0]?.id ? String(classList[0].id) : '';
        const defaultYearId = yearList[0]?.id ? String(yearList[0].id) : '';
        setSelectedClassId(defaultClassId);
        setSelectedYearId(defaultYearId);

        if (defaultClassId) {
          await loadClassData(defaultClassId, defaultYearId, currentAdmin, token);
        }
      } catch (e) {
        setError(e.message || 'Impossible de charger les paramètres.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function loadClassData(classId, yearId, adminUser = admin, tokenValue = null) {
    if (!adminUser || !classId) return;
    const token = tokenValue || getSchoolToken();
    const schoolId = adminUser.schoolId;
    const query = yearId ? `?academicYearId=${encodeURIComponent(yearId)}` : '';

    const [feeRes, suppliesRes] = await Promise.all([
      apiClient(`/school-management/fee-plans/schools/${schoolId}/classes/${classId}${query}`, { token }),
      apiClient(`/school-management/supplies/schools/${schoolId}/classes/${classId}${query}`, { token })
    ]);

    setFeePlan(feeRes.feePlan || null);
    setFeeForm({
      totalAmount: feeRes.feePlan?.totalAmount ? String(feeRes.feePlan.totalAmount) : '',
      installments: Array.isArray(feeRes.feePlan?.installments)
        ? feeRes.feePlan.installments.map((item) => ({
            label: item.label || '',
            amount: item.amount || '',
            dueDate: item.dueDate ? String(item.dueDate).slice(0, 10) : ''
          }))
        : []
    });
    setFeeMeta({
      suppliesTotal: Number(feeRes.suppliesTotal || 0),
      studentCount: Number(feeRes.studentCount || 0),
      totalPerStudent: Number(feeRes.totalPerStudent || 0),
      totalCollectable: Number(feeRes.totalCollectable || 0)
    });

    setSupplies(suppliesRes.supplies || []);
    setSuppliesMeta({
      suppliesTotal: Number(suppliesRes.suppliesTotal || 0),
      studentCount: Number(suppliesRes.studentCount || 0),
      totalCollectable: Number(suppliesRes.totalCollectable || 0)
    });
  }

  async function onClassChange(value) {
    setSelectedClassId(value);
    setError('');
    setSuccess('');
    if (!value) return;
    try {
      await loadClassData(value, selectedYearId);
    } catch (e) {
      setError(e.message || 'Erreur lors du chargement de la classe.');
    }
  }

  async function onYearChange(value) {
    setSelectedYearId(value);
    setError('');
    setSuccess('');
    if (!selectedClassId) return;
    try {
      await loadClassData(selectedClassId, value);
    } catch (e) {
      setError(e.message || 'Erreur lors du chargement de l’année.');
    }
  }

  function addInstallment() {
    setFeeForm((prev) => ({
      ...prev,
      installments: [...prev.installments, { label: '', amount: '', dueDate: '' }]
    }));
  }

  function updateInstallment(index, field, value) {
    setFeeForm((prev) => ({
      ...prev,
      installments: prev.installments.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      )
    }));
  }

  function removeInstallment(index) {
    setFeeForm((prev) => ({
      ...prev,
      installments: prev.installments.filter((_, idx) => idx !== index)
    }));
  }

  async function saveFeePlan(e) {
    e.preventDefault();
    if (!admin || !selectedClassId || !selectedYearId) return;
    setSavingFeePlan(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      const payload = {
        schoolId: admin.schoolId,
        classId: Number(selectedClassId),
        academicYearId: Number(selectedYearId),
        totalAmount: parseFloat(feeForm.totalAmount || 0),
        installments: feeForm.installments
          .filter((item) => item.label && item.amount)
          .map((item) => ({
            label: item.label,
            amount: Number(item.amount),
            dueDate: item.dueDate || null
          }))
      };

      await apiClient('/school-management/fee-plans', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });

      await loadClassData(selectedClassId, selectedYearId);
      setSuccess('Frais enregistrés avec succès.');
    } catch (e) {
      setError(e.message || 'Impossible de sauvegarder les frais.');
    } finally {
      setSavingFeePlan(false);
    }
  }

  async function createSupply(e) {
    e.preventDefault();
    if (!admin || !selectedClassId || !selectedYearId) return;
    setSavingSupply(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      await apiClient('/school-management/supplies', {
        method: 'POST',
        token,
        body: JSON.stringify({
          schoolId: admin.schoolId,
          classId: Number(selectedClassId),
          academicYearId: Number(selectedYearId),
          name: supplyForm.name,
          quantity: Number(supplyForm.quantity || 1),
          unitCost: Number(supplyForm.unitCost || 0)
        })
      });

      setSupplyForm(emptySupplyForm);
      await loadClassData(selectedClassId, selectedYearId);
      setSuccess('Fourniture ajoutée.');
    } catch (e) {
      setError(e.message || 'Impossible d’ajouter la fourniture.');
    } finally {
      setSavingSupply(false);
    }
  }

  async function createPaymentType(e) {
    e.preventDefault();
    if (!admin) return;
    setSavingType(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      const trimmedName = typeForm.name.trim();
      const existing = paymentTypes.find(
        (type) => String(type.name || '').trim().toLowerCase() === trimmedName.toLowerCase()
      );
      const payload = {
        schoolId: admin.schoolId,
        name: trimmedName,
        description: typeForm.description || null,
        defaultAmount: typeForm.amount ? Number(typeForm.amount) : null
      };

      if (existing && editingTypeId !== existing.id) {
        const response = await apiClient(`/school-management/payments/types/${existing.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({
            description: payload.description,
            defaultAmount: payload.defaultAmount
          })
        });
        setPaymentTypes((prev) =>
          prev.map((type) => (type.id === existing.id ? { ...type, ...response.paymentType } : type))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setTypeForm({ name: '', description: '', amount: '' });
        setEditingTypeId(null);
        setSuccess('Type de paiement mis à jour.');
        return;
      }

      const response = await apiClient(editingTypeId ? `/school-management/payments/types/${editingTypeId}` : '/school-management/payments/types', {
        method: editingTypeId ? 'PATCH' : 'POST',
        token,
        body: JSON.stringify(
          editingTypeId
            ? {
                name: trimmedName,
                description: payload.description,
                defaultAmount: payload.defaultAmount
              }
            : payload
        )
      });
      if (editingTypeId) {
        setPaymentTypes((prev) =>
          prev.map((type) => (type.id === editingTypeId ? { ...type, ...response.paymentType } : type))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setTypeForm({ name: '', description: '', amount: '' });
        setEditingTypeId(null);
        setSuccess('Type de paiement mis à jour.');
        return;
      }

      const created = response.paymentType;
      if (created) {
        setPaymentTypes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setTypeForm({ name: '', description: '', amount: '' });
      setSuccess('Type de paiement ajouté.');
      return;
    } catch (e) {
      setError(e.message || 'Impossible de créer le type de paiement.');
    } finally {
      setSavingType(false);
    }
  }

  async function deletePaymentType(typeId) {
    if (!admin) return;
    if (!window.confirm('Supprimer ce type de paiement ?')) return;
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/payments/types/${typeId}`, {
        method: 'DELETE',
        token
      });
      setPaymentTypes((prev) => prev.filter((type) => type.id !== typeId));
      if (editingTypeId === typeId) {
        setEditingTypeId(null);
        setTypeForm({ name: '', description: '', amount: '' });
      }
      setSuccess('Type de paiement supprimé.');
    } catch (e) {
      setError(e.message || 'Impossible de supprimer le type de paiement.');
    }
  }

  function startEditPaymentType(type) {
    setEditingTypeId(type.id);
    setTypeForm({
      name: type.name || '',
      description: type.description || '',
      amount: type.defaultAmount ? String(type.defaultAmount) : ''
    });
  }

  function startEditSupply(supply) {
    setEditingSupplyId(supply.id);
    setEditSupplyForm({
      name: supply.name || '',
      quantity: String(supply.quantity || 1),
      unitCost: String(supply.unitCost || 0)
    });
  }

  async function saveEditSupply(id) {
    if (!admin) return;
    setSavingSupply(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/supplies/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          name: editSupplyForm.name,
          quantity: Number(editSupplyForm.quantity || 1),
          unitCost: Number(editSupplyForm.unitCost || 0)
        })
      });
      setEditingSupplyId(null);
      await loadClassData(selectedClassId, selectedYearId);
      setSuccess('Fourniture mise à jour.');
    } catch (e) {
      setError(e.message || 'Impossible de modifier la fourniture.');
    } finally {
      setSavingSupply(false);
    }
  }

  async function deleteSupply(id) {
    if (!admin) return;
    const ok = window.confirm('Supprimer cette fourniture ?');
    if (!ok) return;
    setSavingSupply(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/supplies/${id}`, {
        method: 'DELETE',
        token
      });
      await loadClassData(selectedClassId, selectedYearId);
      setSuccess('Fourniture supprimée.');
    } catch (e) {
      setError(e.message || 'Impossible de supprimer la fourniture.');
    } finally {
      setSavingSupply(false);
    }
  }

  async function saveConfig(e) {
    e.preventDefault();
    if (!admin) return;
    setSavingConfig(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/config/schools/${admin.schoolId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          logo: configForm.logo || null,
          phone: configForm.phone || null,
          address: configForm.address || null
        })
      });
      setSuccess('Paramètres école enregistrés.');
    } catch (e) {
      setError(e.message || 'Impossible de sauvegarder les paramètres.');
    } finally {
      setSavingConfig(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8">Chargement...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-brand-700">Paramètres</p>
          <h1 className="text-2xl font-bold text-brand-900">Frais & fournitures par classe</h1>
        </div>
        <button className="btn-secondary" type="button" onClick={() => router.push('/school-management/dashboard')}>
          Retour dashboard
        </button>
      </section>

      {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p> : null}
      {success ? <p className="rounded border border-green-200 bg-green-50 p-3 text-green-700">{success}</p> : null}

      <section className="card">
        <h2 className="text-lg font-semibold text-brand-900 mb-4">Sélection classe / année</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className="input"
            value={selectedClassId}
            onChange={(e) => onClassChange(e.target.value)}
          >
            <option value="">Choisir une classe</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          <select
            className="input"
            value={selectedYearId}
            onChange={(e) => onYearChange(e.target.value)}
          >
            <option value="">Choisir une année</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>{year.label}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="card">
          <h2 className="text-lg font-semibold text-brand-900 mb-4">Frais annuels</h2>
          <form onSubmit={saveFeePlan} className="grid gap-3">
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Total annuel (ex: 35000)"
              value={feeForm.totalAmount}
              onChange={(e) => setFeeForm((prev) => ({ ...prev, totalAmount: e.target.value }))}
              disabled={!canEdit}
              required
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-800">Versements</p>
                <button
                  type="button"
                  className="btn-secondary !px-3 !py-1"
                  onClick={addInstallment}
                  disabled={!canEdit}
                >
                  Ajouter
                </button>
              </div>
              {feeForm.installments.length === 0 ? (
                <p className="text-sm text-brand-700">Aucun versement défini.</p>
              ) : (
                <div className="space-y-2">
                  {feeForm.installments.map((item, index) => (
                    <div key={`installment-${index}`} className="grid gap-2 sm:grid-cols-4">
                      <input
                        className="input"
                        placeholder="Libellé"
                        value={item.label}
                        onChange={(e) => updateInstallment(index, 'label', e.target.value)}
                        disabled={!canEdit}
                      />
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        placeholder="Montant"
                        value={item.amount}
                        onChange={(e) => updateInstallment(index, 'amount', e.target.value)}
                        disabled={!canEdit}
                      />
                      <input
                        className="input"
                        type="date"
                        value={item.dueDate}
                        onChange={(e) => updateInstallment(index, 'dueDate', e.target.value)}
                        disabled={!canEdit}
                      />
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-2"
                        onClick={() => removeInstallment(index)}
                        disabled={!canEdit}
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-sm text-brand-700">
              Total des versements: <span className="font-semibold">{installmentsTotal}</span>
            </div>
            <button className="btn-primary w-fit" type="submit" disabled={!canEdit || savingFeePlan}>
              {savingFeePlan ? 'Enregistrement...' : 'Enregistrer les frais'}
            </button>
          </form>
        </article>

        <article className="card">
          <h2 className="text-lg font-semibold text-brand-900 mb-4">Résumé encaissement</h2>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span>Élèves inscrits</span>
              <span className="font-semibold">{feeMeta.studentCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Fournitures / élève</span>
              <span className="font-semibold">{feeMeta.suppliesTotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Total / élève</span>
              <span className="font-semibold">{feeMeta.totalPerStudent}</span>
            </div>
            <div className="flex justify-between">
              <span>Total à encaisser</span>
              <span className="font-semibold">{feeMeta.totalCollectable}</span>
            </div>
          </div>
          {feePlan ? (
            <p className="mt-4 text-sm text-brand-700">
              Plan actif: {feePlan.totalAmount} HTG, mis à jour le {new Date(feePlan.updatedAt).toLocaleDateString('fr-FR')}.
            </p>
          ) : (
            <p className="mt-4 text-sm text-brand-700">Aucun plan de frais défini.</p>
          )}
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="card">
          <h2 className="text-lg font-semibold text-brand-900 mb-4">Inventaire des fournitures</h2>
          <form onSubmit={createSupply} className="grid gap-3 sm:grid-cols-3">
            <input
              className="input"
              placeholder="Nom (ex: Cahier)"
              value={supplyForm.name}
              onChange={(e) => setSupplyForm((prev) => ({ ...prev, name: e.target.value }))}
              disabled={!canEdit}
              required
            />
            <input
              className="input"
              type="number"
              min="1"
              placeholder="Quantité"
              value={supplyForm.quantity}
              onChange={(e) => setSupplyForm((prev) => ({ ...prev, quantity: e.target.value }))}
              disabled={!canEdit}
            />
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Prix unitaire"
              value={supplyForm.unitCost}
              onChange={(e) => setSupplyForm((prev) => ({ ...prev, unitCost: e.target.value }))}
              disabled={!canEdit}
              required
            />
            <button className="btn-primary w-fit" type="submit" disabled={!canEdit || savingSupply}>
              {savingSupply ? 'Ajout...' : 'Ajouter'}
            </button>
          </form>

          <div className="mt-4 overflow-x-auto">
            {supplies.length === 0 ? (
              <p className="text-sm text-brand-700">Aucune fourniture enregistrée.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-200">
                    <th className="py-2 text-left">Nom</th>
                    <th className="py-2 text-left">Quantité</th>
                    <th className="py-2 text-left">Prix unitaire</th>
                    <th className="py-2 text-left">Total</th>
                    <th className="py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {supplies.map((supply) => {
                    const total = Number(supply.quantity || 0) * Number(supply.unitCost || 0);
                    const isEditing = editingSupplyId === supply.id;
                    return (
                      <tr key={supply.id} className="border-b border-brand-100">
                        <td className="py-2">
                          {isEditing ? (
                            <input
                              className="input !py-1"
                              value={editSupplyForm.name}
                              onChange={(e) => setEditSupplyForm((prev) => ({ ...prev, name: e.target.value }))}
                            />
                          ) : supply.name}
                        </td>
                        <td className="py-2">
                          {isEditing ? (
                            <input
                              className="input !py-1"
                              type="number"
                              min="1"
                              value={editSupplyForm.quantity}
                              onChange={(e) => setEditSupplyForm((prev) => ({ ...prev, quantity: e.target.value }))}
                            />
                          ) : supply.quantity}
                        </td>
                        <td className="py-2">
                          {isEditing ? (
                            <input
                              className="input !py-1"
                              type="number"
                              min="0"
                              step="0.01"
                              value={editSupplyForm.unitCost}
                              onChange={(e) => setEditSupplyForm((prev) => ({ ...prev, unitCost: e.target.value }))}
                            />
                          ) : supply.unitCost}
                        </td>
                        <td className="py-2">{total}</td>
                        <td className="py-2">
                          {canEdit ? (
                            <div className="flex gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn-primary !px-3 !py-1"
                                    onClick={() => saveEditSupply(supply.id)}
                                  >
                                    Enregistrer
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary !px-3 !py-1"
                                    onClick={() => setEditingSupplyId(null)}
                                  >
                                    Annuler
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="btn-secondary !px-3 !py-1"
                                    onClick={() => startEditSupply(supply)}
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary !px-3 !py-1"
                                    onClick={() => deleteSupply(supply.id)}
                                  >
                                    Supprimer
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-brand-700">Lecture seule</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="card">
          <h2 className="text-lg font-semibold text-brand-900 mb-4">Coordonnées de l’école</h2>
          <form onSubmit={saveConfig} className="grid gap-3">
            <input
              className="input"
              placeholder="Logo (URL)"
              value={configForm.logo}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, logo: e.target.value }))}
              disabled={!canEdit}
            />
            <input
              className="input"
              placeholder="Téléphone"
              value={configForm.phone}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, phone: e.target.value }))}
              disabled={!canEdit}
            />
            <input
              className="input"
              placeholder="Adresse"
              value={configForm.address}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, address: e.target.value }))}
              disabled={!canEdit}
            />
            <button className="btn-primary w-fit" type="submit" disabled={!canEdit || savingConfig}>
              {savingConfig ? 'Enregistrement...' : 'Enregistrer les coordonnées'}
            </button>
          </form>
          <p className="mt-4 text-sm text-brand-700">
            Ces coordonnées apparaîtront automatiquement sur la fiche de paiement PDF.
          </p>
        </article>

        <article className="card">
          <h2 className="text-lg font-semibold text-brand-900 mb-4">Types de paiement</h2>
          <form onSubmit={createPaymentType} className="grid gap-3 sm:grid-cols-4">
            <input
              className="input"
              placeholder="Nom du type (ex: Cantine, Cantique)"
              value={typeForm.name}
              onChange={(e) => setTypeForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              disabled={!canEdit}
            />
            <input
              className="input"
              placeholder="Prix (HTG)"
              type="number"
              step="0.01"
              value={typeForm.amount}
              onChange={(e) => setTypeForm((prev) => ({ ...prev, amount: e.target.value }))}
              disabled={!canEdit}
            />
            <input
              className="input"
              placeholder="Description (optionnel)"
              value={typeForm.description}
              onChange={(e) => setTypeForm((prev) => ({ ...prev, description: e.target.value }))}
              disabled={!canEdit}
            />
            <button className="btn-primary" type="submit" disabled={!canEdit || savingType}>
              {savingType ? (editingTypeId ? 'Mise à jour...' : 'Ajout...') : (editingTypeId ? 'Mettre à jour' : 'Ajouter le type')}
            </button>
          </form>
          {paymentTypes.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {paymentTypes.map((type) => (
                <div key={type.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs text-brand-800">
                  <span className="font-semibold">{type.name}</span>
                  {type.defaultAmount ? <span className="text-brand-600">· {type.defaultAmount} HTG</span> : null}
                  {type.description ? <span className="text-brand-500">· {type.description}</span> : null}
                  {canEdit ? (
                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary !px-2 !py-1 text-xs"
                        onClick={() => startEditPaymentType(type)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="btn-secondary !px-2 !py-1 text-xs"
                        onClick={() => deletePaymentType(type.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-brand-700">Aucun type de paiement enregistré.</p>
          )}
        </article>
      </section>

      {admin?.role === 'SCHOOL_ACCOUNTANT' ? (
        <p className="text-xs text-brand-600">
          Ton rôle est en lecture seule pour les paramètres. Contacte un administrateur pour modifier les frais.
        </p>
      ) : null}
    </main>
  );
}
