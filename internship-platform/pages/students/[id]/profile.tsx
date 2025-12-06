import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

type EducationLevel = 'high_school' | 'associate' | 'bachelor' | 'master' | 'phd';
type WorkType = 'full_time' | 'part_time';
type WorkMode = 'remote' | 'onsite' | 'hybrid';
type ProficiencyLevel = 'basic' | 'intermediate' | 'advanced';

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

type StudentSkill = {
  skill: {
    id: string;
    name: string;
  }[];
  proficiency_level: ProficiencyLevel | null;
};

type StudentSectorPreference = {
  sector: {
    id: string;
    name: string;
  }[];
  preference_order: number | null;
};

const supabase = createClient();

export default function StudentPublicProfilePage() {
  const router = useRouter();
  const studentId = router.query.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [skills, setSkills] = useState<StudentSkill[]>([]);
  const [sectors, setSectors] = useState<StudentSectorPreference[]>([]);

  useEffect(() => {
    const init = async () => {
      if (!router.isReady || !studentId) return;
      setLoading(true);
      setMessage(null);

      try {
        // Fetch student profile with skills and sector preferences
        const { data: profileData, error: profileErr } = await supabase
          .from('students')
          .select(`
            id,
            full_name,
            education_level,
            university,
            major,
            graduation_year,
            availability,
            work_mode_preference,
            student_skills(
              proficiency_level,
              skill:skills(id, name)
            ),
            student_sector_preferences(
              preference_order,
              sector:sectors(id, name)
            )
          `)
          .eq('id', studentId)
          .maybeSingle();

        if (profileErr) {
          setMessage('Error loading student profile.');
          setLoading(false);
          return;
        }

        if (!profileData) {
          setMessage('Student not found.');
          setLoading(false);
          return;
        }

        setProfile(profileData as StudentProfile);
        setSkills((profileData.student_skills || []) as StudentSkill[]);
        setSectors((profileData.student_sector_preferences || []) as StudentSectorPreference[]);
      } catch (err) {
        setMessage('An error occurred while loading the profile.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router.isReady, studentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm">Loading profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto p-6">
          <Link href="/company/dashboard" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
            ← Back
          </Link>
          <div className="text-center py-12">
            <p className="text-slate-600">{message || 'Student profile not found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-6">
        <Link href="/company/dashboard" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-8 pb-6 border-b">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{profile.full_name || 'Student'}</h1>
          </div>

          {/* Education Info */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Education</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-slate-500 font-medium">Education Level</p>
                <p className="text-slate-900">{profile.education_level?.replace('_', ' ') || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">University</p>
                <p className="text-slate-900">{profile.university || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Major</p>
                <p className="text-slate-900">{profile.major || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Expected Graduation</p>
                <p className="text-slate-900">{profile.graduation_year || '—'}</p>
              </div>
            </div>
          </div>

          {/* Work Preferences */}
          <div className="mb-8 pb-8 border-b">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Work Preferences</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-slate-500 font-medium">Availability</p>
                <p className="text-slate-900">{profile.availability?.replace('_', ' ') || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Work Mode Preference</p>
                <p className="text-slate-900">{profile.work_mode_preference || '—'}</p>
              </div>
            </div>
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="mb-8 pb-8 border-b">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Skills</h2>
              <div className="space-y-2">
                {skills.map((skillEntry, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm font-medium text-slate-900">{skillEntry.skill[0]?.name}</span>
                    <span className="text-xs text-slate-600 capitalize">
                      {skillEntry.proficiency_level || 'Not specified'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sector Preferences */}
          {sectors.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Sector Preferences</h2>
              <div className="flex flex-wrap gap-2">
                {sectors
                  .sort((a, b) => (a.preference_order ?? 999) - (b.preference_order ?? 999))
                  .map((sectorPref, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                      {sectorPref.sector[0]?.name}
                      {sectorPref.preference_order && <span className="ml-1 text-xs">#{sectorPref.preference_order}</span>}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
