import Image from "next/image";
import Link from "next/link";


export default async function Page() {

const blogs = await fetch(
    "http://api.pookiey.com/api/v1/blog/blogs",
    {
        method: "GET",
        next: { revalidate: 60 }, 
    }
    )
    .then((res) => res.json())
    .then((data) => data.blogs)
    .catch(() => {
        return [];
    });

    
    // Function to extract first image URL from content
    const extractFirstImage = (content: string[]) => {
        if (!content) return null;
        
        return content[0]
        
    };
    
    if (blogs.length === 0) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">No Blog Posts Available</h1>
                <p className="text-xl text-gray-600 mb-8">
                    There are currently no blog posts to display. Please check back later for updates.
                </p>
            </div>
        </div>
    );
    
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-12">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to the Blog</h1>
                    <p className="text-xl text-gray-600 mb-8">
                        Explore our latest articles and insights on various topics.
                    </p>
                </div>
                
                {/* Blog Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {blogs.map((blog: any) => {
                        const firstImage = extractFirstImage(blog.imageURLS);
                        
                        return (
                            <article key={blog._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                                {/* Image */}
                                {firstImage && (
                                    <div className="relative h-48 w-full">
                                        <img 
                                            src={firstImage} 
                                            alt={blog.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                
                                {/* Content */}
                                <div className="p-6">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                                        {blog.title}
                                    </h2>
                                    <p className="text-gray-600 mb-4 line-clamp-3">
                                        {blog.excerpt}
                                    </p>
                                    <Link
                                        href={`/blog/${blog.slug}`}
                                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                        Read More
                                        <svg
                                            className="w-4 h-4 ml-2"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
