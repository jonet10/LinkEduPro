"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { getStudent, getToken } from "@/lib/auth";

const MONCASH_URL = process.env.NEXT_PUBLIC_MONCASH_PAY_URL || "";
const NATCASH_URL = process.env.NEXT_PUBLIC_NATCASH_PAY_URL || "";

function formatHTG(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "HTG",
    maximumFractionDigits: 2
  }).format(amount);
}

export default function CatchupPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => getToken(), []);
  const student = useMemo(() => getStudent(), []);
  const isStudent = student?.role === "STUDENT";

  const sessionId = Number(searchParams.get("sessionId") || 0);
  const initialAmount = Number(searchParams.get("amount") || 0);

  const [method, setMethod] = useState("MONCASH");
  const [amount, setAmount] = useState(initialAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    if (!isStudent) {
      router.push("/rattrapage");
    }
  }, [token, isStudent, router]);

  useEffect(() => {
    setAmount(initialAmount);
  }, [initialAmount]);

  function openProviderWindow(selectedMethod) {
    const providerUrl = selectedMethod === "MONCASH" ? MONCASH_URL : NATCASH_URL;
    if (!providerUrl || typeof window === "undefined") return false;
    window.open(providerUrl, "_blank", "noopener,noreferrer");
    return true;
  }

  async function onPay() {
    if (!sessionId) {
      setError("Session invalide.");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");
    try {
      const opened = openProviderWindow(method);
      const data = await apiClient(`/catchup/${sessionId}/pay`, {
        method: "POST",
        token,
        body: JSON.stringify({
          paymentMethod: method,
          amount: Number(amount || 0)
        })
      });
      setInfo(
        opened
          ? "Paiement validé. La fenêtre de paiement a été ouverte."
          : (data.message || "Paiement validé.")
      );
      router.push(`/rattrapage?session=${sessionId}`);
    } catch (e) {
      setError(e.message || "Impossible de valider le paiement.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="card">
        <h1 className="text-2xl font-bold text-brand-900">Paiement rattrapage</h1>
        <p className="mt-2 text-sm text-brand-700">
          Devise utilisée: <strong>HTG</strong>. Choisis ton canal de paiement puis valide.
        </p>
      </div>

      <div className="card space-y-4">
        <div>
          <p className="text-sm text-brand-700">Méthode</p>
          <select className="input mt-1 w-full max-w-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="MONCASH">MonCash</option>
            <option value="NATCASH">NatCash</option>
          </select>
        </div>

        <div>
          <p className="text-sm text-brand-700">Montant à payer</p>
          <p className="mt-1 text-xl font-semibold text-brand-900">{formatHTG(amount)}</p>
        </div>

        {!MONCASH_URL || !NATCASH_URL ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Les URLs MonCash/NatCash ne sont pas configurées. Ajoute `NEXT_PUBLIC_MONCASH_PAY_URL` et
            `NEXT_PUBLIC_NATCASH_PAY_URL` pour redirection automatique.
          </p>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {info ? <p className="text-sm text-green-600">{info}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={onPay} disabled={loading || !sessionId}>
            {loading ? "Validation..." : `Payer via ${method === "MONCASH" ? "MonCash" : "NatCash"}`}
          </button>
          <Link href="/rattrapage" className="btn-secondary">
            Annuler
          </Link>
        </div>
      </div>
    </section>
  );
}
