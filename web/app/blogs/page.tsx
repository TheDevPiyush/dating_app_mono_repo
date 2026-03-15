import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";

const BLOG_API = "http://api.pookiey.com/api/v1/blog/blogs";

type BlogItem = {
  _id: string;
  title: string;
  excerpt: string;
  slug: string;
  imageURLS?: string[];
  publishedAt?: string;
  keywords?: string[];
};

function extractFirstImage(imageURLS: string[] | undefined): string | null {
  if (!imageURLS?.length) return null;
  return imageURLS[0];
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function estimateReadTime(excerpt: string): number {
  const words = excerpt?.trim().split(/\s+/)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 60));
}

export default async function BlogsPage() {
  const blogs: BlogItem[] = await fetch(BLOG_API, {
    method: "GET",
    next: { revalidate: 60 },
  })
    .then((res) => res.json())
    .then((data) => data.blogs ?? [])
    .catch(() => []);

  if (blogs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#fdf5f7] via-white to-[#f8e8ec]" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#E94057]/10 blur-3xl" />
        <div className="relative text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#E94057]/10 text-[#E94057] mb-6">
            <BookOpen className="w-10 h-10" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#2A1F2D] mb-3">
            No posts yet
          </h1>
          <p className="text-[#6F6077] text-lg mb-8">
            We’re cooking up something good. Check back soon for stories, tips, and updates.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#E94057] px-6 py-3 text-white font-semibold hover:bg-[#E94057]/90 transition-colors"
          >
            Back to home
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const [featured, ...rest] = blogs;
  const featuredImage = extractFirstImage(featured.imageURLS);

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#fdf5f7] via-white to-[#faf5f8]" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#E94057]/8 blur-3xl -z-10 translate(20%, -20%)" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#4B164C]/10 blur-3xl -z-10 translate(-20%, 20%)" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        {/* Hero */}
        <header className="text-center mb-14 md:mb-18">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E94057]/10 text-[#E94057] px-4 py-2 text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            Stories & ideas
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#2A1F2D] tracking-tight mb-4">
            The Pookiey Blog
          </h1>
          <p className="text-lg md:text-xl text-[#6F6077] max-w-2xl mx-auto">
            Dating tips, success stories, and updates from the team. Read, smile, and get inspired.
          </p>
        </header>

        {/* Featured post */}
        <section className="mb-14 md:mb-18">
          <Link
            href={`/blogs/${featured.slug}`}
            className="group block glass-card rounded-3xl overflow-hidden border border-white/50 shadow-xl hover:shadow-[0_25px_50px_-12px_rgba(42,31,45,0.2)] transition-all duration-300 hover:-translate-y-1"
          >
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[320px] bg-[#2A1F2D]/5">
                {featuredImage ? (
                  <img
                    src={featuredImage}
                    alt={featured.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#E94057]/30">
                    <BookOpen className="w-20 h-20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#2A1F2D]/70 via-transparent to-transparent" />
                <span className="absolute top-4 left-4 rounded-full bg-[#E94057] px-3 py-1 text-xs font-semibold text-white uppercase tracking-wider">
                  Featured
                </span>
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center">
                {featured.publishedAt && (
                  <time className="text-sm text-[#6F6077] mb-2">
                    {formatDate(featured.publishedAt)}
                  </time>
                )}
                <h2 className="text-2xl md:text-3xl font-bold text-[#2A1F2D] mb-3 group-hover:text-[#E94057] transition-colors line-clamp-2">
                  {featured.title}
                </h2>
                <p className="text-[#6F6077] mb-6 line-clamp-3">
                  {featured.excerpt}
                </p>
                <span className="inline-flex items-center gap-2 text-[#E94057] font-semibold">
                  Read article
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </Link>
        </section>

        {/* More posts */}
        <section>
          <h2 className="text-xl font-semibold text-[#2A1F2D] mb-6">More stories</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {rest.map((blog) => {
              const firstImage = extractFirstImage(blog.imageURLS);
              const readMins = estimateReadTime(blog.excerpt);
              return (
                <article key={blog._id}>
                  <Link
                    href={`/blogs/${blog.slug}`}
                    className="group block h-full glass-card rounded-2xl overflow-hidden border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative aspect-[16/10] bg-[#2A1F2D]/5">
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt={blog.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[#E94057]/20">
                          <BookOpen className="w-12 h-12" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#2A1F2D]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-5 md:p-6">
                      <div className="flex items-center gap-2 text-xs text-[#6F6077] mb-2">
                        {blog.publishedAt && (
                          <time>{formatDate(blog.publishedAt)}</time>
                        )}
                        {blog.publishedAt && (
                          <span className="text-[#E94057]">·</span>
                        )}
                        <span>{readMins} min read</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#2A1F2D] mb-2 line-clamp-2 group-hover:text-[#E94057] transition-colors">
                        {blog.title}
                      </h3>
                      <p className="text-[#6F6077] text-sm line-clamp-2 mb-4">
                        {blog.excerpt}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E94057]">
                        Read more
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="mt-16 md:mt-20 text-center">
          <p className="text-[#6F6077] mb-2">Can’t get enough?</p>
          <Link
            href="/"
            className="text-[#E94057] font-semibold hover:underline inline-flex items-center gap-1.5"
          >
            Explore Pookiey
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
