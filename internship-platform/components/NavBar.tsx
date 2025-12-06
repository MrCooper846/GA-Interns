import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@/lib/supabase';
import { UserRole } from '@/lib/types';

const supabase = createClient();

export default function NavBar() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setRole(null);
        setEmail(null);
        return;
      }
      setEmail(user.email ?? null);
      const metaRole = (user.user_metadata?.role as UserRole) ?? null;
      setRole(metaRole);
    };
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setEmail(null);
    router.push('/login');
  };

  const hideNav = router.pathname === '/login';

  if (hideNav) return null;

  return (
    <header className="w-full border-b bg-white shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
          GA Internships
        </Link>

        <div className="flex items-center gap-6">
          {role === 'student' && (
            <>
              <Link href="/student/dashboard" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
              <Link href="/student/profile" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                Profile
              </Link>
              <Link href="/internships/browse" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                Browse Internships
              </Link>
            </>
          )}

          {role === 'company' && (
            <>
              <Link href="/company/dashboard" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
              <Link href="/company/profile" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                Company Profile
              </Link>
              <Link href="/company/internships/create" className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-colors">
                Create Internship
              </Link>
            </>
          )}

          {role === 'admin' && (
            <>
              <Link href="/admin/dashboard" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                Admin
              </Link>
              <Link href="/admin/users" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                Users
              </Link>
              <Link href="/admin/internships" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                Internships
              </Link>
            </>
          )}

          {!role && (
            <>
              <Link href="/internships/browse" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                Browse Internships
              </Link>
              <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                Login
              </Link>
              <Link href="/login" className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-colors">
                Sign Up
              </Link>
            </>
          )}

          {email && (
            <div className="flex items-center gap-3 ml-3 pl-3 border-l">
              <span className="text-sm text-slate-600">{email}</span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}