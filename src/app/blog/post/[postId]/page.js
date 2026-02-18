import Link from 'next/link';

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  if (/^https?:\/\//i.test(apiUrl)) {
    return apiUrl.replace(/\/+$/, '');
  }

  return `${backendUrl.replace(/\/+$/, '')}${apiUrl.startsWith('/') ? apiUrl : `/${apiUrl}`}`;
}

function resolveMediaUrl(url) {
  if (!url) return null;
  const raw = String(url).trim();
  if (!raw) return null;
  if (/^(https?:)?\/\//i.test(raw)) return raw;

  const apiBase = getApiBaseUrl();
  const backendOrigin = apiBase.replace(/\/api\/?$/, '');
  return raw.startsWith('/') ? `${backendOrigin}${raw}` : `${backendOrigin}/${raw}`;
}

async function fetchPost(postId) {
  const res = await fetch(`${getApiBaseUrl()}/public/blog/posts/${postId}`, {
    cache: 'no-store'
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.post || null;
}

export async function generateMetadata({ params }) {
  const post = await fetchPost(params.postId);
  if (!post) {
    return { title: 'Article introuvable - LinkEduPro' };
  }

  const image = resolveMediaUrl(post.imageUrl);
  return {
    title: `${post.title} - LinkEduPro`,
    description: post.excerpt || post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      images: image ? [{ url: image }] : []
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: post.title,
      description: post.excerpt || post.title,
      images: image ? [image] : []
    }
  };
}

export default async function PublicBlogPostPage({ params }) {
  const post = await fetchPost(params.postId);

  if (!post) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <section className="card space-y-3">
          <h1 className="text-2xl font-semibold text-brand-900">Article introuvable</h1>
          <p className="text-sm text-brand-700">Ce lien ne correspond pas a une publication publique.</p>
          <Link href="/blog" className="btn-secondary inline-flex">Voir le blog</Link>
        </section>
      </main>
    );
  }

  const imageUrl = resolveMediaUrl(post.imageUrl);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <article className="card space-y-4">
        <h1 className="text-3xl font-bold text-brand-900">{post.title}</h1>
        <p className="text-sm text-brand-700">
          {post.author?.firstName} {post.author?.lastName} · {post.author?.role}
        </p>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={post.title}
            className="max-h-[460px] w-full rounded-lg border border-brand-100 object-cover"
          />
        ) : null}
        {post.excerpt ? <p className="text-base text-brand-800">{post.excerpt}</p> : null}
        <p className="whitespace-pre-wrap text-justify text-brand-900">{post.content}</p>
        <div className="pt-2">
          <Link href={`/blog?post=${post.id}`} className="btn-secondary inline-flex">Ouvrir dans le blog</Link>
        </div>
      </article>
    </main>
  );
}
