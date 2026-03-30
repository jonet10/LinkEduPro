import Link from 'next/link';
import CourseEnrollButton from '../../../components/CourseEnrollButton';
import CourseDiscussion from '../../../components/CourseDiscussion';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchCourse(id) {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/v2/courses/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.course || null;
  } catch (_) {
    return null;
  }
}

export default async function CourseDetailPage({ params }) {
  const course = await fetchCourse(params.id);
  if (!course) {
    return (
      <main>
        <section className="header-hero">
          <h1>Cours introuvable</h1>
          <p>Le cours demande n’existe pas ou n’est pas accessible.</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="header-hero">
        <h1>{course.title}</h1>
        <p>{course.description}</p>
        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span className="badge">{course.isFree ? 'Gratuit' : 'Payant'}</span>
          <span className="badge">{course.certificate ? 'Certifie' : 'Sans certificat'}</span>
        </div>
      </section>

      <section className="course-header">
        <img
          src={course.thumbnail || 'https://images.unsplash.com/photo-1509062522246-3755977927d7'}
          alt={course.title}
        />
        <div>
          <div className="info-grid">
            <div className="info-card">
              <strong>Duree</strong>
              <p>{course.duration || 'N/A'} min</p>
            </div>
            <div className="info-card">
              <strong>Niveau</strong>
              <p>{course.level || 'General'}</p>
            </div>
            <div className="info-card">
              <strong>Langue</strong>
              <p>{course.language || 'fr'}</p>
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <CourseEnrollButton courseId={course.id} />
            {course.progress && (
              <div style={{ flex: 1 }}>
                <small>Progression {course.progress.progressPercentage}%</small>
                <div className="progress-bar">
                  <span style={{ width: `${course.progress.progressPercentage}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <h2 className="section-title">Orientation</h2>
      <section className="module-list">
        <div className="module-card">
          <h3>Metiers associes</h3>
          <p className="meta">
            {course.relatedCareers?.length ? course.relatedCareers.join(', ') : 'Aucune suggestion pour le moment.'}
          </p>
        </div>
        <div className="module-card">
          <h3>Cours suivants suggeres</h3>
          <ul>
            {(course.nextCourses || []).map((item) => (
              <li className="lesson-item" key={item.id}>
                <span>{item.title}</span>
                <Link className="btn secondary" href={`/courses/${item.id}`}>Voir</Link>
              </li>
            ))}
          </ul>
          {!course.nextCourses?.length && (
            <p className="meta">Aucun cours recommande pour le moment.</p>
          )}
        </div>
        <div className="module-card">
          <h3>Support tutor</h3>
          <p className="meta">
            {course.tutorSupport ? (course.tutorSupportNote || 'Support tutor disponible sur demande.') : 'Pas de support tutor pour ce cours.'}
          </p>
        </div>
      </section>

      <h2 className="section-title">Modules</h2>
      <section className="module-list">
        {course.modules?.map((module) => (
          <div className="module-card" key={module.id}>
            <h3>{module.title}</h3>
            <ul>
              {module.lessons?.map((lesson) => (
                <li className="lesson-item" key={lesson.id}>
                  <span>{lesson.title} ({lesson.type})</span>
                  <Link className="btn secondary" href={`/courses/${course.id}/lesson/${lesson.id}`}>
                    Ouvrir
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <CourseDiscussion courseId={course.id} />
    </main>
  );
}
