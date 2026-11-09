import React from 'react';
import { Link } from 'react-router-dom';

export default function AuthLayout({ title, subtitle, children, linkText, linkTo }) {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding Graphic */}
      <div className="hidden lg:flex lg:w-1/2 bg-ora-maroon text-white flex-col justify-center p-16 relative overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full translate-x-1/3 translate-y-1/3"></div>
        
        <div className="relative z-10">
          <div className="text-sm font-bold tracking-widest uppercase mb-4 text-gray-300">One Account. Every Module.</div>
          <h1 className="text-4xl font-bold leading-tight mb-6">
            Where Oromo<br/>
            <span className="text-yellow-500">scholarship</span> finds its<br/>
            community.
          </h1>
          <p className="text-gray-300 max-w-md">
            Publish in the Journal, deposit in the Repository, borrow from the Library, or contribute to the Wikipedia.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{title}</h2>
            <p className="text-gray-500 text-sm">{subtitle}</p>
          </div>
          
          {children}
          
          <div className="mt-6 text-center text-sm text-gray-600">
            {linkText} <Link to={linkTo} className="text-ora-maroon font-bold hover:underline">{linkTo === '/login' ? 'Sign in' : 'Create an account'}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}