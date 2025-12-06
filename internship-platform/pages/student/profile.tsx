import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';

// Database enum types matching exactly
type EducationLevel = 'high_school' | 'associate' | 'bachelor' | 'master' | 'phd';
type WorkType = 'full_time' | 'part_time';
type WorkMode = 'remote' | 'onsite' | 'hybrid';
type ProficiencyLevel = 'basic' | 'intermediate' | 'advanced';
type UserRole = 'student' | 'company' | 'admin';

type StudentProfile = {
  id: string;
  full_name: string;
  education_level: EducationLevel | null;
  university: string | null;
  major: string | null;
  graduation_year: number | null;
  availability: WorkType | null;
  work_mode_preference: WorkMode | null;
};

type Sector = { id: string; name: string };
type Skill = { id: string; name: string };

type StudentSectorPreference = {
  id: string;
  student_id: string;
  sector_id: string;
  preference_order: number | null;
};

type StudentSkill = {
  id: string;
  student_id: string;
  skill_id: string;
  proficiency_level: ProficiencyLevel | null;
};

const supabase = createClient();

export default function StudentProfilePage() {
  const [authId, setAuthId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [profile, setProfile] = useState<StudentProfile | null>(null);

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  const [preferences, setPreferences] = useState<StudentSectorPreference[]>([]);
  const [studentSkills, setStudentSkills] = useState<StudentSkill[]>([]);

  const [fullName, setFullName] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>('');
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [graduationYear, setGraduationYear] = useState<number | ''>('');
  const [availability, setAvailability] = useState<WorkType | ''>('');
  const [workMode, setWorkMode] = useState<WorkMode | ''>('');

  const [newSectorId, setNewSectorId] = useState<string>('');
  const [newSectorOrder, setNewSectorOrder] = useState<number | ''>('');

  const [newSkillId, setNewSkillId] = useState<string>('');
  const [newSkillLevel, setNewSkillLevel] = useState<ProficiencyLevel | ''>('');

  const educationOptions: EducationLevel[] = ['high_school', 'associate', 'bachelor', 'master', 'phd'];
  const availabilityOptions: WorkType[] = ['full_time', 'part_time'];
  const workModeOptions: WorkMode[] = ['remote', 'onsite', 'hybrid'];
  const proficiencyOptions: ProficiencyLevel[] = ['basic', 'intermediate', 'advanced'];

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
      const user = userData.user;
      setAuthId(user.id);

      // Check if user exists in public.users
      const { data: publicUser, error: publicUserErr } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!publicUser) {
        // Try to create the user record
        const userRole = (user.user_metadata?.role as UserRole) ?? 'student';
        const { error: insertErr } = await supabase
          .from('users')
          .insert({ id: user.id, email: user.email, role: userRole })
          .select()
          .single();
        
        if (insertErr) {
          setMessage(`Error creating user profile: ${insertErr.message}. Please contact support.`);
          setLoading(false);
          return;
        }
      }

      const [{ data: sectorsData }, { data: skillsData }] = await Promise.all([
        supabase.from('sectors').select('id,name').order('name', { ascending: true }),
        supabase.from('skills').select('id,name').order('name', { ascending: true }),
      ]);
      setSectors(sectorsData ?? []);
      setSkills(skillsData ?? []);

      const { data: studentData } = await supabase
        .from('students')
        .select(
          'id, full_name, education_level, university, major, graduation_year, availability, work_mode_preference'
        )
        .eq('id', user.id)
        .maybeSingle();

      if (studentData) {
        setProfile(studentData as StudentProfile);
        setFullName(studentData.full_name ?? '');
        setEducationLevel(studentData.education_level as EducationLevel || '');
        setUniversity(studentData.university ?? '');
        setMajor(studentData.major ?? '');
        setGraduationYear(studentData.graduation_year ?? '');
        setAvailability(studentData.availability as WorkType || '');
        setWorkMode(studentData.work_mode_preference as WorkMode || '');
      } else {
        setProfile(null);
      }

      const [{ data: prefsData }, { data: stuSkillsData }] = await Promise.all([
        supabase
          .from('student_sector_preferences')
          .select('id, student_id, sector_id, preference_order')
          .eq('student_id', user.id)
          .order('preference_order', { ascending: true, nullsFirst: true }),
        supabase
          .from('student_skills')
          .select('id, student_id, skill_id, proficiency_level')
          .eq('student_id', user.id),
      ]);

      setPreferences(prefsData ?? []);
      setStudentSkills(stuSkillsData ?? []);
      setLoading(false);
    };

    init();
  }, []);

  const handleSaveProfile = async () => {
    if (!authId) return;
    setSaving(true);
    setMessage(null);

    const payload = {
      id: authId,
      full_name: fullName.trim(),
      education_level: (educationLevel || null) as EducationLevel | null,
      university: university.trim() || null,
      major: major.trim() || null,
      graduation_year: graduationYear === '' ? null : Number(graduationYear),
      availability: (availability || null) as WorkType | null,
      work_mode_preference: (workMode || null) as WorkMode | null,
    };

    try {
      if (profile) {
        const { error } = await supabase.from('students').update(payload).eq('id', authId);
        if (error) throw error;
        setMessage('Profile updated.');
      } else {
        const { error } = await supabase.from('students').insert(payload);
        if (error) throw error;
        setMessage('Profile created.');
      }

      const { data: studentData } = await supabase
        .from('students')
        .select(
          'id, full_name, education_level, university, major, graduation_year, availability, work_mode_preference'
        )
        .eq('id', authId)
        .maybeSingle();

      setProfile((studentData as StudentProfile) ?? null);
    } catch (e: any) {
      setMessage(e.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const addSectorPreference = async () => {
    if (!authId || !newSectorId) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        student_id: authId,
        sector_id: newSectorId,
        preference_order: newSectorOrder === '' ? null : Number(newSectorOrder),
      };
      const { error } = await supabase.from('student_sector_preferences').insert(payload);
      if (error) throw error;
      setNewSectorId('');
      setNewSectorOrder('');
      const { data } = await supabase
        .from('student_sector_preferences')
        .select('id, student_id, sector_id, preference_order')
        .eq('student_id', authId)
        .order('preference_order', { ascending: true, nullsFirst: true });
      setPreferences(data ?? []);
      setMessage('Sector preference added.');
    } catch (e: any) {
      setMessage(e.message || 'Failed to add sector preference.');
    } finally {
      setSaving(false);
    }
  };

  const updateSectorPreference = async (prefId: string, newOrder: number | null) => {
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('student_sector_preferences')
        .update({ preference_order: newOrder })
        .eq('id', prefId);
      if (error) throw error;
      setPreferences((prev) =>
        prev.map((p) => (p.id === prefId ? { ...p, preference_order: newOrder } : p))
      );
      setMessage('Sector preference updated.');
    } catch (e: any) {
      setMessage(e.message || 'Failed to update sector preference.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSectorPreference = async (prefId: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase.from('student_sector_preferences').delete().eq('id', prefId);
      if (error) throw error;
      setPreferences((prev) => prev.filter((p) => p.id !== prefId));
      setMessage('Sector preference deleted.');
    } catch (e: any) {
      setMessage(e.message || 'Failed to delete sector preference.');
    } finally {
      setSaving(false);
    }
  };

  const addStudentSkill = async () => {
    if (!authId || !newSkillId || !newSkillLevel) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        student_id: authId,
        skill_id: newSkillId,
        proficiency_level: newSkillLevel as ProficiencyLevel,
      };
      const { error } = await supabase.from('student_skills').insert(payload);
      if (error) throw error;
      setNewSkillId('');
      setNewSkillLevel('');
      const { data } = await supabase
        .from('student_skills')
        .select('id, student_id, skill_id, proficiency_level')
        .eq('student_id', authId);
      setStudentSkills(data ?? []);
      setMessage('Skill added.');
    } catch (e: any) {
      setMessage(e.message || 'Failed to add skill.');
    } finally {
      setSaving(false);
    }
  };

  const updateStudentSkill = async (rowId: string, level: ProficiencyLevel) => {
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('student_skills')
        .update({ proficiency_level: level as ProficiencyLevel })
        .eq('id', rowId);
      if (error) throw error;
      setStudentSkills((prev) => prev.map((s) => (s.id === rowId ? { ...s, proficiency_level: level } : s)));
      setMessage('Skill updated.');
    } catch (e: any) {
      setMessage(e.message || 'Failed to update skill.');
    } finally {
      setSaving(false);
    }
  };

  const deleteStudentSkill = async (rowId: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase.from('student_skills').delete().eq('id', rowId);
      if (error) throw error;
      setStudentSkills((prev) => prev.filter((s) => s.id !== rowId));
      setMessage('Skill deleted.');
    } catch (e: any) {
      setMessage(e.message || 'Failed to delete skill.');
    } finally {
      setSaving(false);
    }
  };

  const sectorNameById = useMemo(() => {
    const map = new Map<string, string>();
    sectors.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [sectors]);

  const skillNameById = useMemo(() => {
    const map = new Map<string, string>();
    skills.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [skills]);

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
        <h1 className="text-2xl font-semibold mb-4">Student Profile</h1>

        {message && <div className="mb-4 text-sm text-blue-700">{message}</div>}

        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full name</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Education level</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={educationLevel}
                onChange={(e) => setEducationLevel((e.target.value as EducationLevel) || '')}
              >
                <option value="">Select…</option>
                {educationOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">University</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="University name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Major</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="Major"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Graduation year</label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={graduationYear === '' ? '' : graduationYear}
                onChange={(e) => setGraduationYear(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2026"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Availability</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={availability}
                onChange={(e) => setAvailability((e.target.value as WorkType) || '')}
              >
                <option value="">Select…</option>
                {availabilityOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Work mode preference</label>
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
          </div>

          <div className="mt-4">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {profile ? 'Save changes' : 'Create profile'}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Sector Preferences</h2>

          <div className="flex flex-col md:flex-row gap-2 md:items-end mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Sector</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={newSectorId}
                onChange={(e) => setNewSectorId(e.target.value)}
              >
                <option value="">Select sector…</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-44">
              <label className="block text-sm font-medium mb-1">Preference order</label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={newSectorOrder === '' ? '' : newSectorOrder}
                onChange={(e) => setNewSectorOrder(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1"
              />
            </div>
            <button
              onClick={addSectorPreference}
              disabled={saving || !newSectorId}
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <ul className="divide-y">
            {preferences.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{sectorNameById.get(p.sector_id) || p.sector_id}</div>
                  <div className="text-xs text-slate-600">
                    Preference order: {p.preference_order ?? '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-24 border rounded-md px-2 py-1 text-sm"
                    value={p.preference_order ?? ''}
                    onChange={(e) =>
                      updateSectorPreference(
                        p.id,
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    placeholder="order"
                  />
                  <button
                    onClick={() => deleteSectorPreference(p.id)}
                    className="text-sm px-3 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {preferences.length === 0 && (
              <li className="py-2 text-sm">No preferences yet.</li>
            )}
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Skills</h2>

          <div className="flex flex-col md:flex-row gap-2 md:items-end mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Skill</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={newSkillId}
                onChange={(e) => setNewSkillId(e.target.value)}
              >
                <option value="">Select skill…</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-44">
              <label className="block text-sm font-medium mb-1">Proficiency level</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel((e.target.value as ProficiencyLevel) || '')}
              >
                <option value="">Select…</option>
                {proficiencyOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={addStudentSkill}
              disabled={saving || !newSkillId || !newSkillLevel}
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <ul className="divide-y">
            {studentSkills.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{skillNameById.get(s.skill_id) || s.skill_id}</div>
                  <div className="text-xs text-slate-600">Level: {s.proficiency_level ?? '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="w-36 border rounded-md px-2 py-1 text-sm"
                    value={s.proficiency_level ?? ''}
                    onChange={(e) =>
                      updateStudentSkill(s.id, e.target.value as ProficiencyLevel)
                    }
                  >
                    <option value="">Select…</option>
                    {proficiencyOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => deleteStudentSkill(s.id)}
                    className="text-sm px-3 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {studentSkills.length === 0 && (
              <li className="py-2 text-sm">No skills yet.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}