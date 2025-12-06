import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { UserRole } from '@/lib/types';

type CompanyProfile = {
  id: string;
  company_name: string;
  website: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
};

const supabase = createClient();

export default function CompanyProfilePage() {
  const [authId, setAuthId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [profile, setProfile] = useState<CompanyProfile | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

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

      const { data: publicUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!publicUser) {
        const userRole = (user.user_metadata?.role as UserRole) ?? 'company';
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

      const { data: companyData } = await supabase
        .from('companies')
        .select('id, company_name, website, location, contact_name, contact_email')
        .eq('id', user.id)
        .maybeSingle();

      if (companyData) {
        setProfile(companyData as CompanyProfile);
        setCompanyName(companyData.company_name ?? '');
        setWebsite(companyData.website ?? '');
        setLocation(companyData.location ?? '');
        setContactName(companyData.contact_name ?? '');
        setContactEmail(companyData.contact_email ?? '');
      } else {
        setProfile(null);
      }

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
      company_name: companyName.trim(),
      website: website.trim() || null,
      location: location.trim() || null,
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
    };

    try {
      if (profile) {
        const { error } = await supabase.from('companies').update(payload).eq('id', authId);
        if (error) throw error;
        setMessage('Profile updated.');
      } else {
        const { error } = await supabase.from('companies').insert(payload);
        if (error) throw error;
        setMessage('Profile created.');
      }

      const { data: companyData } = await supabase
        .from('companies')
        .select('id, company_name, website, location, contact_name, contact_email')
        .eq('id', authId)
        .maybeSingle();

      setProfile((companyData as CompanyProfile) ?? null);
    } catch (e: any) {
      setMessage(e.message || 'Failed to save profile.');
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
        <h1 className="text-2xl font-semibold mb-4">Company Profile</h1>

        {message && <div className="mb-4 text-sm text-blue-700">{message}</div>}

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Company Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Company Name *</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Inc."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input
                type="url"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco, CA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Contact Name</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input
                type="email"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleSaveProfile}
              disabled={saving || !companyName.trim()}
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {profile ? 'Save changes' : 'Create profile'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}