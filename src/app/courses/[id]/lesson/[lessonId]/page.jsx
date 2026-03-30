import Link from 'next/link';
import LessonProgressButton from '../../../../components/LessonProgressButton';

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

function flattenLessons(modules = []) {
  const lessons = [];
  modules.forEach((module) => {
    const moduleOrder = Number(module.order || 0);
    (module.lessons || []).forEach((lesson) => {
      lessons.push({ ...lesson, moduleTitle: module.title, moduleOrder });
    });
  });
  return lessons.sort((a, b) => {
    if (a.moduleOrder !== b.moduleOrder) return a.moduleOrder - b.moduleOrder;
    return (a.order || 0) - (b.order || 0);
  });
}

export default async function LessonPlayerPage({ params }) {
  const course = await fetchCourse(params.id);
  if (!course) {
    return (
      <main>
        <section className="header-hero">
          <h1>Lecon introuvable</h1>
          <p>Impossible de charger ce cours.</p>
        </section>
      </main>
    );
  }

  const lessons = flattenLessons(course.modules || []);
  const lessonIndex = lessons.findIndex((item) => String(item.id) === String(params.lessonId));
  const lesson = lessons[lessonIndex];
  const nextLesson = lessonIndex >= 0 ? lessons[lessonIndex + 1] : null;

  if (!lesson) {
    return (
      <main>
        <section className="header-hero">
          <h1>Lecon introuvable</h1>
          <p>Cette lecon n’existe pas.</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="header-hero">
        <h1>{course.title}</h1>
        <p>{lesson.moduleTitle} · {lesson.title}</p>
      </section>

      <section className="player-shell">
        {lesson.type === 'pdf' && (
          <iframe className="player-frame" src={lesson.contentUrl} title={lesson.title} />
        )}
        {lesson.type === 'video' && (
          <video className="player-frame" src={lesson.contentUrl} controls />
        )}
        {lesson.type === 'text' && (
          <div>
            <h3>{lesson.title}</h3>
            <p>{lesson.textContent}</p>
          </div>
        )}
        {lesson.type === 'quiz' && (
          <div>
            <h3>Quiz</h3>
            <p>Le quiz sera disponible ici.</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
          <LessonProgressButton courseId={course.id} lessonId={lesson.id} />
          <Link className="btn secondary" href={`/courses/${course.id}`}>Retour au cours</Link>
          {nextLesson && (
            <Link className="btn" href={`/courses/${course.id}/lesson/${nextLesson.id}`}>Suivant</Link>
          )}
        </div>
      </section>
    </main>
  );
}
