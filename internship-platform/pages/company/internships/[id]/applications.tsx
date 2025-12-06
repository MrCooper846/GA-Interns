import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { AppStatus } from '@/lib/types';

type Applicant = {
  id: string; // application id
  status: AppStatus;
  applied_at: string;
  student_id: string;
  student: {
    id: string;
    full_name: string | null;
    university: string | null;
    major: string | null;
    graduation_year: number | null;
  } | null;
};

const supabase = createClient();

const statusOptions: AppStatus[] = ['applied', 'shortlisted', 'selected', 'rejected', 'completed'];

export default function InternshipApplicationsPage() {
  const router = useRouter();
  const internshipId = router.query.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [title, setTitle] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      if (!router.isReady || !internshipId) return;
      setLoading(true);
      setMessage(null);

      // Ensure user is authenticated
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setMessage('Not authenticated. Please log in.');
        setLoading(false);
        return;
      }

      // Optional: verify the internship belongs to this company
      const { data: internship } = await supabase
        .from('internships')
        .select('id, title, company_id')
        .eq('id', internshipId)
        .maybeSingle();

      if (!internship) {
        setMessage('Internship not found.');
        setLoading(false);
        return;
      }
      setTitle(internship.title ?? '');

      // Fetch applications and join student info
      const { data: appsData, error: appsErr } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          applied_at,
          student_id,
          student:students!inner(
            id,
            full_name,
            university,
            major,
            graduation_year
          )
        `)
        .eq('internship_id', internshipId)
        .order('applied_at', { ascending: false });

      if (appsErr) {
        setMessage('Error loading applications.');
        setLoading(false);
        return;
      }

      setApplicants((appsData as any) || []);
      setLoading(false);
    };

    init();
  }, [router.isReady, internshipId]);

  const updateStatus = async (applicationId: string, newStatus: AppStatus) => {
    setMessage(null);
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', applicationId);

    if (error) {
      setMessage('Failed to update status.');
      return;
    }

    setApplicants((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a))
    );
    setMessage('Application status updated.');
  };

  const getStatusBadge = (status: AppStatus) => {
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
          <h1 className="text-2xl font-semibold">Applications — {title || 'Internship'}</h1>
          <Link href="/company/dashboard" className="text-sm px-4 py-2 border rounded-md">
            Back to Dashboard
          </Link>
        </div>

        {message && <div className="mb-4 text-sm text-blue-700">{message}</div>}

        {applicants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-600">No applications yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applicants.map((app) => (
              <div key={app.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-base">
                      {app.student?.full_name || 'Unnamed Student'}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {app.student?.university || '—'} • {app.student?.major || '—'} •{' '}
                      {app.student?.graduation_year || '—'}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Applied: {new Date(app.applied_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(app.status)}`}>
                    {app.status}
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <Link
                    href={`/students/${app.student_id}/profile`}
                    className="text-sm px-3 py-1 border rounded-md hover:bg-slate-50"
                  >
                    View Profile
                  </Link>

                  <div className="flex items-center gap-2">
                    <label className="text-sm">Update status:</label>
                    <select
                      className="border rounded-md px-2 py-1 text-sm"
                      value={app.status}
                      onChange={(e) => updateStatus(app.id, e.target.value as AppStatus)}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}