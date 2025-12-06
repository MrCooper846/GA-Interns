import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { InternshipStatus, WorkMode, WorkType } from '@/lib/types';
import Link from 'next/link';

interface Internship {
  id: string;
  title: string;
  description: string | null;
  work_type: WorkType | null;
  work_mode: WorkMode | null;
  duration_months: number | null;
  stipend_amount: number | null;
  status: InternshipStatus;
  created_at: string;
  company: {
    id: string;
    company_name: string | null;
  } | null;
  skills: Array<{
    id: string;
    name: string;
  }>;
}

const supabase = createClient();

export default function BrowseInternshipsPage() {
  const [loading, setLoading] = useState(true);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [filteredInternships, setFilteredInternships] = useState<Internship[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType | 'all'>('all');
  const [selectedWorkMode, setSelectedWorkMode] = useState<WorkMode | 'all'>('all');
  const [userApplied, setUserApplied] = useState<Set<string>>(new Set());

  const workTypeOptions: WorkType[] = ['full_time', 'part_time'];
  const workModeOptions: WorkMode[] = ['remote', 'onsite', 'hybrid'];

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setMessage(null);

      try {
        // Fetch all open internships with company info and skills
        const { data: internshipsData, error: internshipsErr } = await supabase
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
              company_name
            ),
            internship_skills(
              skill:skills(id, name)
            )
          `)
          .eq('status', 'open')
          .order('created_at', { ascending: false });

        if (internshipsErr) {
          setMessage('Error loading internships.');
          setLoading(false);
          return;
        }

        // Transform skills data to flat array
        const transformedInternships = (internshipsData as any[])?.map((internship) => ({
          ...internship,
          skills: internship.internship_skills?.map((is: any) => is.skill) || [],
        })) || [];

        setInternships(transformedInternships);
        setFilteredInternships(transformedInternships);

        // Fetch user's applications if logged in
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: applicationsData } = await supabase
            .from('applications')
            .select('internship_id')
            .eq('student_id', userData.user.id);

          if (applicationsData) {
            setUserApplied(new Set(applicationsData.map((app) => app.internship_id)));
          }
        }
      } catch (err) {
        setMessage('An error occurred while loading internships.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = internships;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (internship) =>
          internship.title.toLowerCase().includes(query) ||
          internship.description?.toLowerCase().includes(query) ||
          internship.company?.company_name?.toLowerCase().includes(query)
      );
    }

    // Work type filter
    if (selectedWorkType !== 'all') {
      filtered = filtered.filter((internship) => internship.work_type === selectedWorkType);
    }

    // Work mode filter
    if (selectedWorkMode !== 'all') {
      filtered = filtered.filter((internship) => internship.work_mode === selectedWorkMode);
    }

    setFilteredInternships(filtered);
  }, [searchQuery, selectedWorkType, selectedWorkMode, internships]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm">Loading internships…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Browse Internships</h1>
          <p className="text-lg text-slate-600">
            {filteredInternships.length} internship{filteredInternships.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {message && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg">{message}</div>}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Filter Internships</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <input
                type="text"
                placeholder="Title, company, keyword..."
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Work Type</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedWorkType}
                onChange={(e) => setSelectedWorkType(e.target.value as WorkType | 'all')}
              >
                <option value="all">All Types</option>
                {workTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Work Mode</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedWorkMode}
                onChange={(e) => setSelectedWorkMode(e.target.value as WorkMode | 'all')}
              >
                <option value="all">All Modes</option>
                {workModeOptions.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">&nbsp;</label>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedWorkType('all');
                  setSelectedWorkMode('all');
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm hover:bg-slate-50 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Internships List */}
        {filteredInternships.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <p className="text-slate-600">No internships found matching your criteria.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredInternships.map((internship) => (
              <div key={internship.id} className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-900 mb-1">{internship.title}</h2>
                    <p className="text-base font-medium text-slate-600">
                      {internship.company?.company_name || 'Unknown Company'}
                    </p>
                  </div>
                  {userApplied.has(internship.id) && (
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                      Applied
                    </span>
                  )}
                </div>

                {internship.description && (
                  <p className="text-slate-700 mb-5 line-clamp-2 leading-relaxed">{internship.description}</p>
                )}

                {/* Skills */}
                {internship.skills.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {internship.skills.map((skill) => (
                        <span
                          key={skill.id}
                          className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full font-medium"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Type</p>
                    <p className="text-slate-900 font-medium">{internship.work_type?.replace('_', ' ') || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Mode</p>
                    <p className="text-slate-900 font-medium">{internship.work_mode || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Duration</p>
                    <p className="text-slate-900 font-medium">
                      {internship.duration_months ? `${internship.duration_months} months` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Stipend</p>
                    <p className="text-slate-900 font-medium">
                      {internship.stipend_amount ? `$${internship.stipend_amount}` : '—'}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex gap-3 pt-2">
                  <Link
                    href={`/internships/${internship.id}/view`}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </Link>
                  {userApplied.has(internship.id) && (
                    <button
                      disabled
                      className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium cursor-not-allowed"
                    >
                      Already Applied
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
