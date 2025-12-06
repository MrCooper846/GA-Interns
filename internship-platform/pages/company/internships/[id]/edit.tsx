import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@/lib/supabase';
import { InternshipStatus, WorkMode, WorkType } from '@/lib/types';
import Link from 'next/link';

type Internship = {
  id: string;
  company_id: string;
  sector_id: string;
  title: string;
  description: string | null;
  work_mode: WorkMode | null;
  work_type: WorkType | null;
  duration_months: number | null;
  stipend_amount: number | null;
  status: InternshipStatus;
  created_at: string;
};

const supabase = createClient();

export default function EditInternshipPage() {
  const router = useRouter();
  const id = router.query.id as string | undefined;

  const [authId, setAuthId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState<string>('');
  const [workType, setWorkType] = useState<WorkType | ''>('');
  const [workMode, setWorkMode] = useState<WorkMode | ''>('');
  const [durationMonths, setDurationMonths] = useState<number | ''>('');
  const [stipendAmount, setStipendAmount] = useState<number | ''>('');
  const [status, setStatus] = useState<InternshipStatus>('open');

  const workTypeOptions: WorkType[] = ['full_time', 'part_time'];
  const workModeOptions: WorkMode[] = ['remote', 'onsite', 'hybrid'];
  const statusOptions: InternshipStatus[] = ['open', 'closed'];

  useEffect(() => {
    const init = async () => {
      if (!id) return;
      setLoading(true);
      setMessage(null);

      // Auth
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setMessage('Not authenticated. Please log in.');
        setLoading(false);
        return;
      }
      const userId = userData.user.id;
      setAuthId(userId);

      // Load internship
      const { data, error } = await supabase
        .from('internships')
        .select(
          'id, company_id, sector_id, title, description, work_mode, work_type, duration_months, stipend_amount, status, created_at'
        )
        .eq('id', id)
        .maybeSingle();

      if (error) {
        setMessage('Error loading internship.');
        setLoading(false);
        return;
      }
      if (!data) {
        setMessage('Internship not found.');
        setLoading(false);
        return;
      }

      // Ownership check (optional, client-side hint; enforce with RLS)
      if (data.company_id !== userId) {
        setMessage('You do not have permission to edit this internship.');
        setLoading(false);
        return;
      }

      // Populate form
      setTitle(data.title ?? '');
      setDescription(data.description ?? '');
      setWorkType((data.work_type as WorkType) || '');
      setWorkMode((data.work_mode as WorkMode) || '');
      setDurationMonths(data.duration_months ?? '');
      setStipendAmount(data.stipend_amount ?? '');
      setStatus(data.status as InternshipStatus);

      setLoading(false);
    };

    init();
  }, [id]);

  const handleSave = async () => {
    if (!authId || !id) return;
    if (!title.trim()) {
      setMessage('Title is required.');
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload: Partial<Internship> = {
      title: title.trim(),
      description: description.trim() || null,
      work_type: (workType || null) as WorkType | null,
      work_mode: (workMode || null) as WorkMode | null,
      duration_months: durationMonths === '' ? null : Number(durationMonths),
      stipend_amount: stipendAmount === '' ? null : Number(stipendAmount),
      status,
    };

    try {
      const { error } = await supabase.from('internships').update(payload).eq('id', id);
      if (error) throw error;
      setMessage('Internship updated.');
    } catch (e: any) {
      setMessage(e.message || 'Failed to update internship.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Delete this internship? This cannot be undone.')) return;

    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase.from('internships').delete().eq('id', id);
      if (error) throw error;
      router.push('/company/dashboard');
    } catch (e: any) {
      setMessage(e.message || 'Failed to delete internship.');
    } finally {
      setSaving(false);
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
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Edit Internship</h1>
          <div className="flex gap-2">
            <Link href="/company/dashboard" className="text-sm px-4 py-2 border rounded-md">
              Back to Dashboard
            </Link>
            <button
              onClick={handleDelete}
              className="text-sm px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>

        {message && <div className="mb-4 text-sm text-blue-700">{message}</div>}

        <section className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Software Engineering Intern"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the role..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Work Type</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={workType}
                onChange={(e) => setWorkType((e.target.value as WorkType) || '')}
              >
                <option value="">Select…</option>
                {workTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Work Mode</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={workMode}
                onChange={(e) => setWorkMode((e.target.value as WorkMode) || '')}
              >
                <option value="">Select…</option>
                {workModeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Duration (months)</label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={durationMonths === '' ? '' : durationMonths}
                onChange={(e) => setDurationMonths(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="3"
                min={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stipend Amount</label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={stipendAmount === '' ? '' : stipendAmount}
                onChange={(e) => setStipendAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1000"
                min={0}
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as InternshipStatus)}
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Save Changes
            </button>
            <Link href={`/company/internships/${id}/applications`} className="text-sm px-4 py-2 border rounded-md">
              View Applications
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}