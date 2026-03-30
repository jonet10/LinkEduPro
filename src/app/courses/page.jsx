import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchCourses(query = '') {
  if (!API_BASE) return [];
  const url = query ? `${API_BASE}/v2/courses?${query}` : `${API_BASE}/v2/courses`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.courses || [];
  } catch (_) {
    return [];
  }
}

export default async function CoursesPage({ searchParams }) {
  const params = new URLSearchParams();
  if (searchParams?.q) params.set('q', searchParams.q);
  if (searchParams?.category) params.set('category', searchParams.category);
  if (searchParams?.language) params.set('language', searchParams.language);
  if (searchParams?.level) params.set('level', searchParams.level);
  if (searchParams?.status) params.set('status', searchParams.status);

  const courses = await fetchCourses(params.toString());

  return (
    <main>
      <section className="header-hero">
        <h1>Classe Numerique – Catalogue de cours</h1>
        <p>
          Explore des cours structures comme un MOOC. EduPro t’accompagne pas a pas,
          et les contenus PDF ou video sont accessibles en ligne.
        </p>
      </section>

      <form className="toolbar">
        <input name="q" placeholder="Rechercher un cours..." defaultValue={searchParams?.q || ''} />
        <select name="category" defaultValue={searchParams?.category || ''}>
          <option value="">Categorie</option>
          <option value="Sciences">Sciences</option>
          <option value="Math">Math</option>
          <option value="Langues">Langues</option>
          <option value="Informatique">Informatique</option>
        </select>
        <select name="language" defaultValue={searchParams?.language || ''}>
          <option value="">Langue</option>
          <option value="fr">Francais</option>
          <option value="ht">Kreyol</option>
        </select>
        <select name="level" defaultValue={searchParams?.level || ''}>
          <option value="">Niveau</option>
          <option value="NSI">NSI</option>
          <option value="NSII">NSII</option>
          <option value="NSIII">NSIII</option>
          <option value="NSIV">NSIV</option>
          <option value="Universitaire">Universitaire</option>
        </select>
        <select name="status" defaultValue={searchParams?.status || ''}>
          <option value="">Disponibilite</option>
          <option value="open">Ouvert a inscription</option>
          <option value="upcoming">Bientot</option>
          <option value="archived">Archive</option>
        </select>
      </form>

      <section className="course-grid">
        {courses.map((course) => (
          <article className="course-card" key={course.id}>
            <img
              src={course.thumbnail || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f'}
              alt={course.title}
            />
            <span className="badge">
              {course.isFree ? 'Gratuit' : 'Payant'} • {course.certificate ? 'Certifie' : 'Sans certificat'}
            </span>
            <h3>{course.title}</h3>
            <p className="meta">{course.provider || 'LinkEduPro'} · {course.language || 'fr'}</p>
            <p className="meta">Duree: {course.duration || 'N/A'} min · Niveau: {course.level || 'General'}</p>
            <p className="meta">{course.lessonsCount || 0} lecons</p>
            <Link className="btn" href={`/courses/${course.id}`}>Voir le cours</Link>
          </article>
        ))}
        {courses.length === 0 && (
          <div className="course-card">
            <h3>Aucun cours disponible</h3>
            <p className="meta">Ajoute des cours via la synchronisation PDF ou l’admin.</p>
          </div>
        )}
      </section>
    </main>
  );
}
