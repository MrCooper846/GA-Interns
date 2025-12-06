import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase';

type UserRole = 'student' | 'company' | 'admin';

const supabase = createClient();

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role }, // 'student' | 'company' | 'admin' from enum
          },
        });
        if (error) throw error;
        setMessage('Check your email to confirm your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Get auth user
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user!;
        const metaRole = (user.user_metadata?.role as UserRole) || null;

        // Prefer role from public.users (enum safe). Fallback to metadata.
        const { data: dbUser } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const effectiveRole = (dbUser?.role as UserRole) || metaRole || 'student';

        // Redirect based on role
        switch (effectiveRole) {
          case 'company':
            window.location.href = '/company/dashboard';
            break;
          case 'admin':
            window.location.href = '/admin/dashboard';
            break;
          case 'student':
          default:
            window.location.href = '/student/dashboard';
            break;
        }
      }
    } catch (err: any) {
      setMessage(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4 text-center">
          {mode === 'login' ? 'Log in' : 'Sign up'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="student">Student</option>
                <option value="company">Company</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {message && <p className="text-sm text-center text-red-600">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === 'login' ? (
            <button type="button" className="text-blue-600 underline" onClick={() => setMode('signup')}>
              Need an account? Sign up
            </button>
          ) : (
            <button type="button" className="text-blue-600 underline" onClick={() => setMode('login')}>
              Already have an account? Log in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}