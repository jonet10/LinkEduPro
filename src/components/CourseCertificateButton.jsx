'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function CourseCertificateButton({ courseId }) {
  const handleDownload = async () => {
    if (!API_BASE) return;
    const token = window.localStorage.getItem('token');
    if (!token) {
      window.alert('Connecte-toi pour telecharger le certificat.');
      return;
    }

    const res = await fetch(`${API_BASE}/v2/courses/${courseId}/certificate`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificat-course-${courseId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <button className="btn secondary" onClick={handleDownload}>Telecharger</button>
  );
}
