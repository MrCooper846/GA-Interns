import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import Link from 'next/link';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <main className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl font-bold mb-6">
          Welcome to the GA Internship Platform
        </h1>
        <p className="text-xl text-slate-700 mb-8 max-w-2xl mx-auto">
          Connect talented students with exciting internship opportunities. 
          Whether you're a student looking for your next role or a company seeking great interns, 
          we've got you covered.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Sign Up
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-16">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">For Students</h2>
            <ul className="text-left space-y-2 text-slate-700">
              <li>✓ Browse internship opportunities</li>
              <li>✓ Create your profile and showcase your skills</li>
              <li>✓ Apply to positions that match your interests</li>
              <li>✓ Track your application status</li>
            </ul>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">For Companies</h2>
            <ul className="text-left space-y-2 text-slate-700">
              <li>✓ Post internship opportunities</li>
              <li>✓ Review qualified applicants</li>
              <li>✓ Manage your internship program</li>
              <li>✓ Provide feedback and make hiring decisions</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
