import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { AppStatus } from '@/lib/types';
import Link from 'next/link';

type StudentProfile = {
  full_name: string;
  university: string | null;
  major: string | null;
  graduation_year: number | null;
};

type Application = {
  id: string;
  status: AppStatus;
  applied_at: string;
  internship: {
    id: string;
    title: string;
    company: {
      company_name: string;
    };
    work_type: string;
    work_mode: string;
    stipend_amount: number | null;
  };
};

const supabase = createClient();

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setMessage(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setMessage('Not authenticated. Please log in.');
        setLoading(false);
        return;
      }

      const userId = userData.user.id;

      // Fetch student profile
      const { data: profileData, error: profileErr } = await supabase
        .from('students')
        .select('full_name, university, major, graduation_year')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        setMessage('Error loading profile.');
      } else {
        setProfile(profileData as StudentProfile);
      }

      // Fetch applications with internship and company details
      const { data: appsData, error: appsErr } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          applied_at,
          internship:internships!inner(
            id,
            title,
            work_type,
            work_mode,
            stipend_amount,
            company:companies!inner(
              company_name
            )
          )
        `)
        .eq('student_id', userId)
        .order('applied_at', { ascending: false });

      if (appsErr) {
        setMessage('Error loading applications.');
      } else {
        setApplications(appsData as any || []);
      }

      setLoading(false);
    };

    init();
  }, []);

  const getStatusColor = (status: AppStatus) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'shortlisted':
        return 'bg-yellow-100 text-yellow-800';
      case 'selected':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Student Dashboard</h1>
          <Link
            href="/student/profile"
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Edit Profile
          </Link>
        </div>

        {message && <div className="mb-4 text-sm text-red-600">{message}</div>}

        {/* Profile Summary */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Profile Summary</h2>
          {profile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">Name</p>
                <p className="text-base">{profile.full_name || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">University</p>
                <p className="text-base">{profile.university || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Major</p>
                <p className="text-base">{profile.major || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Graduation Year</p>
                <p className="text-base">{profile.graduation_year || '—'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">No profile information found. Please complete your profile.</p>
          )}
        </section>

        {/* Applications */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">My Applications</h2>
          {applications.length === 0 ? (
            <p className="text-sm text-slate-600">You haven't applied to any internships yet.</p>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-base">{app.internship.title}</h3>
                      <p className="text-sm text-slate-600">{app.internship.company.company_name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-slate-600 mt-3">
                    <div>
                      <span className="font-medium">Type:</span> {app.internship.work_type?.replace('_', ' ')}
                    </div>
                    <div>
                      <span className="font-medium">Mode:</span> {app.internship.work_mode}
                    </div>
                    <div>
                      <span className="font-medium">Stipend:</span> {app.internship.stipend_amount ? `$${app.internship.stipend_amount}` : 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Applied:</span> {new Date(app.applied_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}