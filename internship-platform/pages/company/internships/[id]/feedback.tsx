import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

type SelectedIntern = {
  application_id: string;
  student_id: string;
  student_name: string;
  existing_feedbacks: Array<{
    id: string;
    month_index: number;
    rating: number | null;
    comment: string | null;
  }>;
};

const supabase = createClient();

export default function InternshipFeedbackPage() {
  const router = useRouter();
  const internshipId = router.query.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [internshipTitle, setInternshipTitle] = useState('');
  const [selectedInterns, setSelectedInterns] = useState<SelectedIntern[]>([]);

  // UI state: which intern & month to edit
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editingRating, setEditingRating] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState('');

  useEffect(() => {
    const init = async () => {
      if (!internshipId) return;
      setLoading(true);
      setMessage(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setMessage('Not authenticated.');
        setLoading(false);
        return;
      }

      // Load internship
      const { data: internship } = await supabase
        .from('internships')
        .select('title')
        .eq('id', internshipId)
        .maybeSingle();

      if (internship) setInternshipTitle(internship.title ?? '');

      // Load selected interns (status = 'selected')
      const { data: appsData } = await supabase
        .from('applications')
        .select(`
          id,
          student_id,
          student:students!inner(full_name)
        `)
        .eq('internship_id', internshipId)
        .eq('status', 'selected');

      if (appsData && appsData.length > 0) {
        // For each selected intern, load their feedback
        const interns = await Promise.all(
          (appsData as any[]).map(async (app) => {
            const { data: feedbacks } = await supabase
              .from('feedback')
              .select('id, month_index, rating, comment')
              .eq('application_id', app.id)
              .order('month_index', { ascending: true });

            return {
              application_id: app.id,
              student_id: app.student_id,
              student_name: app.student?.full_name || 'Unknown',
              existing_feedbacks: feedbacks || [],
            };
          })
        );
        setSelectedInterns(interns);
      }

      setLoading(false);
    };

    init();
  }, [internshipId]);

  const saveFeedback = async (applicationId: string, monthIndex: number) => {
    if (editingRating === null || !editingComment.trim()) {
      setMessage('Rating and comment are required.');
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Check if feedback already exists for this month
      const existing = selectedInterns
        .find((i) => i.application_id === applicationId)
        ?.existing_feedbacks.find((f) => f.month_index === monthIndex);

      if (existing) {
        const { error } = await supabase
          .from('feedback')
          .update({ rating: editingRating, comment: editingComment.trim() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('feedback').insert({
          application_id: applicationId,
          month_index: monthIndex,
          rating: editingRating,
          comment: editingComment.trim(),
        });
        if (error) throw error;
      }

      setMessage('Feedback saved.');
      setEditingFeedbackId(null);
      setEditingMonth(null);

      // Refresh
      const { data: feedbacks } = await supabase
        .from('feedback')
        .select('id, month_index, rating, comment')
        .eq('application_id', applicationId)
        .order('month_index', { ascending: true });

      setSelectedInterns((prev) =>
        prev.map((i) =>
          i.application_id === applicationId
            ? { ...i, existing_feedbacks: feedbacks || [] }
            : i
        )
      );
    } catch (e: any) {
      setMessage(e.message || 'Failed to save feedback.');
    } finally {
      setSaving(false);
    }
  };

  const openEditFeedback = (applicationId: string, monthIndex: number) => {
    const intern = selectedInterns.find((i) => i.application_id === applicationId);
    const feedback = intern?.existing_feedbacks.find((f) => f.month_index === monthIndex);

    setEditingFeedbackId(applicationId);
    setEditingMonth(monthIndex);
    setEditingRating(feedback?.rating ?? null);
    setEditingComment(feedback?.comment ?? '');
  };

  const cancelEdit = () => {
    setEditingFeedbackId(null);
    setEditingMonth(null);
    setEditingRating(null);
    setEditingComment('');
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
          <h1 className="text-2xl font-semibold">Monthly Feedback — {internshipTitle}</h1>
          <Link href="/company/dashboard" className="text-sm px-4 py-2 border rounded-md">
            Back to Dashboard
          </Link>
        </div>

        {message && <div className="mb-4 text-sm text-blue-700">{message}</div>}

        {selectedInterns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-600">No selected interns yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {selectedInterns.map((intern) => (
              <section key={intern.application_id} className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">{intern.student_name}</h2>

                <div className="space-y-4">
                  {[1, 2, 3].map((month) => {
                    const feedback = intern.existing_feedbacks.find((f) => f.month_index === month);
                    const isEditing =
                      editingFeedbackId === intern.application_id && editingMonth === month;

                    return (
                      <div key={month} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-base mb-2">Month {month}</h3>

                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium mb-1">Rating (1-5)</label>
                              <select
                                className="w-full border rounded-md px-3 py-2 text-sm"
                                value={editingRating ?? ''}
                                onChange={(e) => setEditingRating(e.target.value ? Number(e.target.value) : null)}
                              >
                                <option value="">Select…</option>
                                <option value="1">1 - Poor</option>
                                <option value="2">2 - Below Average</option>
                                <option value="3">3 - Average</option>
                                <option value="4">4 - Good</option>
                                <option value="5">5 - Excellent</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Comment</label>
                              <textarea
                                className="w-full border rounded-md px-3 py-2 text-sm"
                                rows={3}
                                value={editingComment}
                                onChange={(e) => setEditingComment(e.target.value)}
                                placeholder="Enter feedback…"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveFeedback(intern.application_id, month)}
                                disabled={saving}
                                className="text-sm px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-sm px-3 py-1 border rounded-md hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {feedback ? (
                              <div>
                                <p className="text-sm">
                                  <span className="font-medium">Rating:</span> {feedback.rating}/5
                                </p>
                                <p className="text-sm mt-1">
                                  <span className="font-medium">Comment:</span> {feedback.comment}
                                </p>
                                <button
                                  onClick={() => openEditFeedback(intern.application_id, month)}
                                  className="text-sm px-3 py-1 mt-2 border rounded-md hover:bg-slate-50"
                                >
                                  Edit
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => openEditFeedback(intern.application_id, month)}
                                className="text-sm px-3 py-1 border rounded-md hover:bg-slate-50"
                              >
                                Add Feedback
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}