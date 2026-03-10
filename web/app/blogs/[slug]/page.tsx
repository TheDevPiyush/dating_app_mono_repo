interface PageProps {
    params: {
        slug: string;
    }   
}

interface BlogPost {
    title: string;
    content: string;
    excerpt: string;
    imageURLS: string[];
    keywords: string[];
    slug: string;
}
export const revalidate = 3600; 
export const Page = async ({ params }: PageProps) => {
    const { slug } = await params;

    const res = await fetch(`http://api.pookiey.com/api/v1/blog/blogs/${slug}`, {
        method: 'GET',
        // cache: 'no-store', 
        next: { revalidate: 60 }, // Revalidate every minute
    });

    const data = await res.json();

    if (!res.ok) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog Post Not Found</h1>
                    <p className="text-xl text-gray-600 mb-8">
                        No blog post found for the slug: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{slug}</span>
                    </p>
                    <a 
                        href="/blog" 
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Return to Blog
                    </a>
                </div>
            </div>
        );
    }

    const blog: BlogPost = data.blog

    return (
        <main className="min-h-screen bg-gray-50 py-12">
            <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <header className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        {blog.title}
                    </h1>
                    
                    {/* Excerpt */}
                    <p className="text-xl text-gray-600 border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r">
                        {blog.excerpt}
                    </p>
                </header>

                {/* Keywords/Tags */}
                {blog.keywords && blog.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                        {blog.keywords.map((keyword, index) => (
                            <span 
                                key={index}
                                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full hover:bg-gray-300 transition-colors"
                            >
                                #{keyword}
                            </span>
                        ))}
                    </div>
                )}

                {/* Image Gallery */}
                {blog.imageURLS && blog.imageURLS.length > 0 && (
                    <div className="mb-8">
                        {blog.imageURLS.length === 1 ? (
                            // Single image
                            <div className="rounded-lg overflow-hidden shadow-lg">
                                <img 
                                    src={blog.imageURLS[0]} 
                                    alt={blog.title}
                                    className="w-full h-auto object-cover max-h-[500px]"
                                />
                            </div>
                        ) : (
                            // Multiple images grid
                            <div className={`grid gap-4 ${
                                blog.imageURLS.length === 2 
                                    ? 'grid-cols-1 md:grid-cols-2' 
                                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                            }`}>
                                {blog.imageURLS.map((image, index) => (
                                    <div key={index} className="rounded-lg overflow-hidden shadow-lg">
                                        <img 
                                            src={image} 
                                            alt={`${blog.title} - Image ${index + 1}`}
                                            className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Main Content - HTML rendered safely */}
                <div className="prose prose-lg max-w-none bg-white rounded-lg shadow-sm p-6 md:p-8">
                    <div 
                        dangerouslySetInnerHTML={{ __html: blog.content }}
                        className="blog-content"
                    />
                </div>

                {/* Footer Section */}
                <footer className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <a 
                            href="/blogs" 
                            className="inline-flex items-center text-blue-600 hover:text-blue-800"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to all posts
                        </a>
                        
                    
                    </div>
                </footer>
            </article>

          
           
        </main>
    );
};

export default Page;
