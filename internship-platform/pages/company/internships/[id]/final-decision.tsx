import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { FinalDecision } from '@/lib/types';

type SelectedIntern = {
  application_id: string;
  student_id: string;
  student_name: string;
  existing_decision: {
    id: string;
    decision: FinalDecision;
    comment: string | null;
  } | null;
};

const supabase = createClient();

export default function InternshipFinalDecisionPage() {
  const router = useRouter();
  const internshipId = router.query.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [internshipTitle, setInternshipTitle] = useState('');
  const [selectedInterns, setSelectedInterns] = useState<SelectedIntern[]>([]);

  // UI state: which intern to edit
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editingDecision, setEditingDecision] = useState<FinalDecision | ''>('');
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
        // For each selected intern, load their final decision
        const interns = await Promise.all(
          (appsData as any[]).map(async (app) => {
            const { data: decision } = await supabase
              .from('final_decision')
              .select('id, decision, comment')
              .eq('application_id', app.id)
              .maybeSingle();

            return {
              application_id: app.id,
              student_id: app.student_id,
              student_name: app.student?.full_name || 'Unknown',
              existing_decision: decision || null,
            };
          })
        );
        setSelectedInterns(interns);
      }

      setLoading(false);
    };

    init();
  }, [internshipId]);

  const saveDecision = async (applicationId: string) => {
    if (!editingDecision) {
      setMessage('Decision is required.');
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const intern = selectedInterns.find((i) => i.application_id === applicationId);

      if (intern?.existing_decision) {
        // Update existing
        const { error } = await supabase
          .from('final_decision')
          .update({
            decision: editingDecision as FinalDecision,
            comment: editingComment.trim() || null,
          })
          .eq('id', intern.existing_decision.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from('final_decision').insert({
          application_id: applicationId,
          decision: editingDecision as FinalDecision,
          comment: editingComment.trim() || null,
        });
        if (error) throw error;
      }

      setMessage('Final decision saved.');
      setEditingAppId(null);
      setEditingDecision('');
      setEditingComment('');

      // Refresh
      const { data: decision } = await supabase
        .from('final_decision')
        .select('id, decision, comment')
        .eq('application_id', applicationId)
        .maybeSingle();

      setSelectedInterns((prev) =>
        prev.map((i) =>
          i.application_id === applicationId
            ? { ...i, existing_decision: decision || null }
            : i
        )
      );
    } catch (e: any) {
      setMessage(e.message || 'Failed to save decision.');
    } finally {
      setSaving(false);
    }
  };

  const openEditDecision = (applicationId: string) => {
    const intern = selectedInterns.find((i) => i.application_id === applicationId);
    setEditingAppId(applicationId);
    setEditingDecision((intern?.existing_decision?.decision as FinalDecision) || '');
    setEditingComment(intern?.existing_decision?.comment ?? '');
  };

  const cancelEdit = () => {
    setEditingAppId(null);
    setEditingDecision('');
    setEditingComment('');
  };

  const getDecisionBadge = (decision: FinalDecision) => {
    return decision === 'would_hire'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
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
          <h1 className="text-2xl font-semibold">Final Decisions — {internshipTitle}</h1>
          <div className="flex gap-2">
            <Link
              href={`/company/internships/${internshipId}/feedback`}
              className="text-sm px-4 py-2 border rounded-md"
            >
              Back to Feedback
            </Link>
            <Link
              href={`/company/internships/${internshipId}/final-decision`}
              className="text-sm px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Final Decisions
            </Link>
            <Link href="/company/dashboard" className="text-sm px-4 py-2 border rounded-md">
              Dashboard
            </Link>
          </div>
        </div>

        {message && <div className="mb-4 text-sm text-blue-700">{message}</div>}

        {selectedInterns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-600">No selected interns yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedInterns.map((intern) => {
              const isEditing = editingAppId === intern.application_id;

              return (
                <div key={intern.application_id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-base">{intern.student_name}</h3>
                      {intern.existing_decision && (
                        <span
                          className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getDecisionBadge(
                            intern.existing_decision.decision
                          )}`}
                        >
                          {intern.existing_decision.decision.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Decision *</label>
                        <select
                          className="w-full border rounded-md px-3 py-2 text-sm"
                          value={editingDecision}
                          onChange={(e) => setEditingDecision((e.target.value as FinalDecision) || '')}
                        >
                          <option value="">Select…</option>
                          <option value="would_hire">Would Hire</option>
                          <option value="would_not_hire">Would Not Hire</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Comment (optional)</label>
                        <textarea
                          className="w-full border rounded-md px-3 py-2 text-sm"
                          rows={3}
                          value={editingComment}
                          onChange={(e) => setEditingComment(e.target.value)}
                          placeholder="Add notes…"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveDecision(intern.application_id)}
                          disabled={saving}
                          className="text-sm px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save Decision
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
                    <div className="mt-4">
                      {intern.existing_decision ? (
                        <div>
                          <p className="text-sm text-slate-600">
                            {intern.existing_decision.comment && (
                              <>
                                <span className="font-medium">Comment:</span> {intern.existing_decision.comment}
                              </>
                            )}
                          </p>
                          <button
                            onClick={() => openEditDecision(intern.application_id)}
                            className="text-sm px-3 py-1 mt-2 border rounded-md hover:bg-slate-50"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openEditDecision(intern.application_id)}
                          className="text-sm px-3 py-1 border rounded-md hover:bg-slate-50"
                        >
                          Add Decision
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}