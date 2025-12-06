import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { WorkMode, WorkType } from '@/lib/types';

interface Internship {
  id: string;
  title: string;
  description: string | null;
  work_type: WorkType | null;
  work_mode: WorkMode | null;
  duration_months: number | null;
  stipend_amount: number | null;
  status: string;
  created_at: string;
  company: {
    id: string;
    company_name: string | null;
    website: string | null;
    location: string | null;
    contact_email: string | null;
  } | null;
  sector: {
    id: string;
    name: string;
  } | null;
  skills: Array<{
    id: string;
    name: string;
  }>;
}

const supabase = createClient();

export default function InternshipViewPage() {
  const router = useRouter();
  const id = router.query.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [internship, setInternship] = useState<Internship | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!id) return;
      setLoading(true);
      setMessage(null);

      try {
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          setUserId(userData.user.id);

          // Get user role
          const { data: userDbData } = await supabase
            .from('users')
            .select('role')
            .eq('id', userData.user.id)
            .maybeSingle();
          setUserRole(userDbData?.role || null);
        }

        // Fetch internship details with company, sector, and skills
        const { data: internshipData, error: internshipErr } = await supabase
          .from('internships')
          .select(`
            id,
            title,
            description,
            work_type,
            work_mode,
            duration_months,
            stipend_amount,
            status,
            created_at,
            company:companies!inner(
              id,
              company_name,
              website,
              location,
              contact_email
            ),
            sector:sectors(
              id,
              name
            ),
            internship_skills(
              skill:skills(id, name)
            )
          `)
          .eq('id', id)
          .maybeSingle();

        if (internshipErr) {
          setMessage('Error loading internship.');
          setLoading(false);
          return;
        }

        if (!internshipData) {
          setMessage('Internship not found.');
          setLoading(false);
          return;
        }

        // Transform skills and flatten company/sector arrays
        const transformedInternship = {
          ...internshipData,
          company: Array.isArray(internshipData.company) ? internshipData.company[0] : internshipData.company,
          sector: Array.isArray(internshipData.sector) ? internshipData.sector[0] : internshipData.sector,
          skills: internshipData.internship_skills?.map((is: any) => is.skill) || [],
        } as Internship;

        setInternship(transformedInternship);

        // Check if user has already applied
        if (userData.user) {
          const { data: applicationData } = await supabase
            .from('applications')
            .select('id')
            .eq('student_id', userData.user.id)
            .eq('internship_id', id)
            .maybeSingle();

          setHasApplied(!!applicationData);
        }
      } catch (err) {
        setMessage('An error occurred while loading the internship.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id]);

  const handleApply = async () => {
    if (!userId || !id) {
      setMessage('Please log in to apply.');
      return;
    }

    if (userRole !== 'student') {
      setMessage('Only students can apply for internships.');
      return;
    }

    setIsApplying(true);
    setMessage(null);

    try {
      const { error } = await supabase.from('applications').insert({
        student_id: userId,
        internship_id: id,
        status: 'applied',
      });

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          setMessage('You have already applied for this internship.');
        } else {
          setMessage('Failed to submit application.');
        }
      } else {
        setMessage('Application submitted successfully!');
        setHasApplied(true);
      }
    } catch (err) {
      setMessage('An error occurred while submitting your application.');
    } finally {
      setIsApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm">Loading internship details…</p>
      </div>
    );
  }

  if (!internship) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto p-6">
          <Link href="/internships/browse" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Browse
          </Link>
          <div className="text-center py-12">
            <p className="text-slate-600">{message || 'Internship not found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto p-6">
        <Link href="/internships/browse" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Browse
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{internship.title}</h1>
            <p className="text-lg text-slate-600 mb-2">
              {internship.company?.company_name || 'Unknown Company'}
            </p>
            {internship.sector && (
              <p className="text-sm text-slate-500">
                Sector: <span className="font-medium text-slate-700">{internship.sector.name}</span>
              </p>
            )}
          </div>

          {message && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                message.includes('successfully')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {message}
            </div>
          )}

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 pb-8 border-b">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Work Type</p>
              <p className="text-slate-900">{internship.work_type?.replace('_', ' ') || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Work Mode</p>
              <p className="text-slate-900">{internship.work_mode || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Duration</p>
              <p className="text-slate-900">
                {internship.duration_months ? `${internship.duration_months} months` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Stipend</p>
              <p className="text-slate-900">
                {internship.stipend_amount ? `$${internship.stipend_amount}` : '—'}
              </p>
            </div>
          </div>

          {/* Description */}
          {internship.description && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">About This Internship</h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{internship.description}</p>
            </div>
          )}

          {/* Required Skills */}
          {internship.skills.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {internship.skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Company Information */}
          {internship.company && (
            <div className="mb-8 pb-8 border-b">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">About the Company</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-slate-500 font-medium">Company</p>
                  <p className="text-slate-900">{internship.company.company_name || '—'}</p>
                </div>
                {internship.company.location && (
                  <div>
                    <p className="text-slate-500 font-medium">Location</p>
                    <p className="text-slate-900">{internship.company.location}</p>
                  </div>
                )}
                {internship.company.website && (
                  <div>
                    <p className="text-slate-500 font-medium">Website</p>
                    <a
                      href={internship.company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {internship.company.website}
                    </a>
                  </div>
                )}
                {internship.company.contact_email && (
                  <div>
                    <p className="text-slate-500 font-medium">Contact Email</p>
                    <a href={`mailto:${internship.company.contact_email}`} className="text-blue-600 hover:underline">
                      {internship.company.contact_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Info */}
          <div className="mb-4">
            <p className="text-xs text-slate-500">
              Posted: {new Date(internship.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Apply Button */}
          <div className="flex gap-3">
            {userRole === 'student' ? (
              <>
                <button
                  onClick={handleApply}
                  disabled={isApplying || hasApplied || internship.status !== 'open'}
                  className={`px-6 py-3 rounded-md font-medium text-sm transition-colors ${
                    hasApplied
                      ? 'bg-slate-100 text-slate-600 cursor-not-allowed'
                      : internship.status !== 'open'
                      ? 'bg-slate-100 text-slate-600 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isApplying ? 'Submitting...' : hasApplied ? 'Already Applied' : 'Apply Now'}
                </button>
                {internship.status !== 'open' && (
                  <div className="px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">This internship is no longer accepting applications.</p>
                  </div>
                )}
              </>
            ) : userId ? (
              <div className="px-6 py-3 bg-slate-100 text-slate-700 rounded-md text-sm font-medium">
                Only students can apply for internships.
              </div>
            ) : (
              <Link
                href="/login"
                className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium text-sm hover:bg-blue-700"
              >
                Log In to Apply
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
