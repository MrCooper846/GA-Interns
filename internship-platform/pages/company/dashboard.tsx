import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { InternshipStatus, WorkMode, WorkType } from '@/lib/types';
import Link from 'next/link';

type CompanyProfile = {
  company_name: string;
  website: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
};

type Internship = {
  id: string;
  title: string;
  description: string | null;
  work_mode: WorkMode | null;
  work_type: WorkType | null;
  duration_months: number | null;
  stipend_amount: number | null;
  status: InternshipStatus;
  created_at: string;
  applications_count?: number;
};

const supabase = createClient();

export default function CompanyDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [internships, setInternships] = useState<Internship[]>([]);
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

      // Fetch company profile
      const { data: profileData, error: profileErr } = await supabase
        .from('companies')
        .select('company_name, website, location, contact_name, contact_email')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        setMessage('Error loading profile.');
      } else {
        setProfile(profileData as CompanyProfile);
      }

      // Fetch internships
      const { data: internshipsData, error: internshipsErr } = await supabase
        .from('internships')
        .select('id, title, description, work_mode, work_type, duration_months, stipend_amount, status, created_at')
        .eq('company_id', userId)
        .order('created_at', { ascending: false });

      if (internshipsErr) {
        setMessage('Error loading internships.');
      } else {
        // Fetch application counts for each internship
        const internshipsWithCounts = await Promise.all(
          (internshipsData || []).map(async (internship) => {
            const { count } = await supabase
              .from('applications')
              .select('*', { count: 'exact', head: true })
              .eq('internship_id', internship.id);
            return { ...internship, applications_count: count || 0 };
          })
        );
        setInternships(internshipsWithCounts as Internship[]);
      }

      setLoading(false);
    };

    init();
  }, []);

  const getStatusColor = (status: InternshipStatus) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleInternshipStatus = async (internshipId: string, currentStatus: InternshipStatus) => {
    const newStatus: InternshipStatus = currentStatus === 'open' ? 'closed' : 'open';
    const { error } = await supabase
      .from('internships')
      .update({ status: newStatus })
      .eq('id', internshipId);

    if (error) {
      setMessage('Error updating internship status.');
    } else {
      setInternships((prev) =>
        prev.map((int) => (int.id === internshipId ? { ...int, status: newStatus } : int))
      );
      setMessage(`Internship ${newStatus === 'open' ? 'opened' : 'closed'} successfully.`);
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
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Company Dashboard</h1>
          <div className="flex gap-3">
            <Link
              href="/company/profile"
              className="text-sm px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
            >
              Edit Profile
            </Link>
            <Link
              href="/company/internships/create"
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Create Internship
            </Link>
          </div>
        </div>

        {message && <div className="mb-4 text-sm text-blue-700">{message}</div>}

        {/* Profile Summary */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Company Profile</h2>
          {profile ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">Company Name</p>
                <p className="text-base">{profile.company_name || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Website</p>
                <p className="text-base">
                  {profile.website ? (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {profile.website}
                    </a>
                  ) : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Location</p>
                <p className="text-base">{profile.location || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Contact Name</p>
                <p className="text-base">{profile.contact_name || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Contact Email</p>
                <p className="text-base">{profile.contact_email || '—'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              No profile information found. Please{' '}
              <Link href="/company/profile" className="text-blue-600 hover:underline">
                complete your profile
              </Link>
              .
            </p>
          )}
        </section>

        {/* Internships */}
        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">My Internships</h2>
            <span className="text-sm text-slate-600">{internships.length} total</span>
          </div>
          {internships.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-600 mb-4">You haven't created any internships yet.</p>
              <Link
                href="/company/internships/create"
                className="inline-block text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Your First Internship
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {internships.map((internship) => (
                <div key={internship.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">{internship.title}</h3>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {internship.description || 'No description'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ml-4 ${getStatusColor(internship.status)}`}>
                      {internship.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm text-slate-600 mt-3">
                    <div>
                      <span className="font-medium">Applications:</span> {internship.applications_count || 0}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {internship.work_type?.replace('_', ' ') || '—'}
                    </div>
                    <div>
                      <span className="font-medium">Mode:</span> {internship.work_mode || '—'}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {internship.duration_months ? `${internship.duration_months} months` : '—'}
                    </div>
                    <div>
                      <span className="font-medium">Stipend:</span> {internship.stipend_amount ? `$${internship.stipend_amount}` : '—'}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link
                      href={`/company/internships/${internship.id}/applications`}
                      className="text-sm px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      View Applications
                    </Link>
                    <Link
                      href={`/company/internships/${internship.id}/edit`}
                      className="text-sm px-3 py-1 border border-slate-300 rounded-md hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => toggleInternshipStatus(internship.id, internship.status)}
                      className={`text-sm px-3 py-1 rounded-md ${
                        internship.status === 'open'
                          ? 'border border-red-300 text-red-700 hover:bg-red-50'
                          : 'border border-green-300 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {internship.status === 'open' ? 'Close' : 'Open'}
                    </button>
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