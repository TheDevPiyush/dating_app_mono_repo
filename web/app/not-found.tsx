
import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full text-center">
        {/* Animated Hearts SVG */}
        <div className="relative mb-8 flex justify-center">
          <svg 
            className="w-48 h-48 sm:w-64 sm:h-64 text-pink-200 animate-pulse" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          
          {/* Floating Hearts */}
          <svg 
            className="absolute w-12 h-12 text-pink-300 animate-bounce" 
            style={{ top: '-20px', right: '30%' }}
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          
          <svg 
            className="absolute w-8 h-8 text-pink-400 animate-bounce" 
            style={{ bottom: '-10px', left: '35%', animationDelay: '0.2s' }}
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>

        {/* 404 Text */}
        <h1 className="text-8xl sm:text-9xl font-bold text-pink-400 mb-4">404</h1>
        
        {/* Error Message */}
        <h2 className="text-3xl sm:text-4xl font-semibold text-gray-800 mb-4">
          Oops! Love got lost
        </h2>
        
        <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
          Looks like this page swiped left on us. Don't worry, your perfect match might be just a click away!
        </p>

        {/* Broken Heart SVG */}
        <div className="flex justify-center mb-8">
          <svg 
            className="w-24 h-24 text-pink-300 opacity-50" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.5 0 2.91.56 4 1.5 1.09-.94 2.5-1.5 4-1.5 3.08 0 5.5 2.42 5.5 5.5 0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            <line x1="16" y1="8" x2="8" y2="16" stroke="currentColor" strokeWidth="2" />
            <line x1="8" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-pink-500 rounded-full hover:bg-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-pink-500/25 w-full sm:w-auto"
          >
            <svg 
              className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go Back Home
          </Link>

          <Link
            href="/support"
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-pink-600 bg-white border-2 border-pink-300 rounded-full hover:bg-pink-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-pink-500/25 w-full sm:w-auto"
          >
            <svg 
              className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Get Support
          </Link>
        </div>


        {/* Decorative Hearts Pattern */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
          <div className="absolute top-10 left-10 animate-float">
            <svg className="w-16 h-16 text-pink-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <div className="absolute bottom-10 right-10 animate-float-delayed">
            <svg className="w-20 h-20 text-pink-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}