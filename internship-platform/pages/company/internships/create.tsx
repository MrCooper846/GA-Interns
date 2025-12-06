import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { InternshipStatus, WorkMode, WorkType } from '@/lib/types';
import Link from 'next/link';

const supabase = createClient();

interface Sector {
  id: string;
  name: string;
}

interface Skill {
  id: string;
  name: string;
}

export default function CreateInternshipPage() {
  const [authId, setAuthId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState<WorkType | ''>('');
  const [workMode, setWorkMode] = useState<WorkMode | ''>('');
  const [durationMonths, setDurationMonths] = useState<number | ''>('');
  const [stipendAmount, setStipendAmount] = useState<number | ''>('');
  const [status, setStatus] = useState<InternshipStatus>('open');
  const [sectorId, setSectorId] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Data options
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  const workTypeOptions: WorkType[] = ['full_time', 'part_time'];
  const workModeOptions: WorkMode[] = ['remote', 'onsite', 'hybrid'];
  const statusOptions: InternshipStatus[] = ['open', 'closed'];

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setMessage(null);

      const { data: userData, error } = await supabase.auth.getUser();
      if (error || !userData.user) {
        setMessage('Not authenticated. Please log in.');
        setLoading(false);
        return;
      }
      setAuthId(userData.user.id);

      // Fetch sectors and skills
      const [{ data: sectorsData }, { data: skillsData }] = await Promise.all([
        supabase.from('sectors').select('id, name').order('name'),
        supabase.from('skills').select('id, name').order('name'),
      ]);

      if (sectorsData) setSectors(sectorsData);
      if (skillsData) setSkills(skillsData);

      setLoading(false);
    };
    init();
  }, []);

  const handleCreate = async () => {
    if (!authId) return;
    if (!title.trim()) {
      setMessage('Title is required.');
      return;
    }
    if (!sectorId) {
      setMessage('Sector is required.');
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload = {
      company_id: authId,
      sector_id: sectorId,
      title: title.trim(),
      description: description.trim() || null,
      work_type: (workType || null) as WorkType | null,
      work_mode: (workMode || null) as WorkMode | null,
      duration_months: durationMonths === '' ? null : Number(durationMonths),
      stipend_amount: stipendAmount === '' ? null : Number(stipendAmount),
      status,
    };

    try {
      const { data, error } = await supabase
        .from('internships')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;

      // Insert selected skills into internship_skills table
      if (data?.id && selectedSkills.length > 0) {
        const skillsPayload = selectedSkills.map((skillId) => ({
          internship_id: data.id,
          skill_id: skillId,
        }));

        const { error: skillsError } = await supabase
          .from('internship_skills')
          .insert(skillsPayload);

        if (skillsError) throw skillsError;
      }

      setMessage('Internship created.');
      // Redirect to dashboard
      if (data?.id) {
        window.location.href = `/company/internships/${data.id}/edit`;
      }
    } catch (e: any) {
      setMessage(e.message || 'Failed to create internship.');
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
          <h1 className="text-2xl font-semibold">Create Internship</h1>
          <Link href="/company/dashboard" className="text-sm px-4 py-2 border rounded-md">
            Back to Dashboard
          </Link>
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

            <div>
              <label className="block text-sm font-medium mb-1">Sector *</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
                required
              >
                <option value="">Select a sector…</option>
                {sectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the role, responsibilities, and benefits..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Skills</label>
              <div className="border rounded-md p-3 bg-slate-50 max-h-48 overflow-y-auto">
                {skills.length > 0 ? (
                  <div className="space-y-2">
                    {skills.map((skill) => (
                      <label key={skill.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSkills.includes(skill.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSkills([...selectedSkills, skill.id]);
                            } else {
                              setSelectedSkills(selectedSkills.filter((id) => id !== skill.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{skill.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No skills available</p>
                )}
              </div>
              {selectedSkills.length > 0 && (
                <p className="text-xs text-slate-600 mt-1">{selectedSkills.length} skill(s) selected</p>
              )}
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
              onClick={handleCreate}
              disabled={saving || !title.trim()}
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Create Internship
            </button>
            <Link href="/company/dashboard" className="text-sm px-4 py-2 border rounded-md">
              Cancel
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}