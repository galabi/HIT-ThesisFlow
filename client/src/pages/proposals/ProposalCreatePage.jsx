import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useProposalMutations } from '../../hooks/useProposals.js';
import { facultiesApi } from '../../api/faculties.api.js';
import { proposalsApi } from '../../api/proposals.api.js';

export function ProposalCreatePage() {
  const navigate = useNavigate();
  const { create } = useProposalMutations();

  const { data: faculties = [] } = useQuery({
    queryKey: ['faculties'],
    queryFn: facultiesApi.list,
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    maxStudents: 1,
    facultyId: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [publishAfter, setPublishAfter] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addTag = () => {
    const label = tagInput.trim();
    if (label && !tags.includes(label)) {
      setTags((t) => [...t, label]);
      setTagInput('');
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    create.mutate(
      { ...form, maxStudents: Number(form.maxStudents), tags },
      {
        onSuccess: (proposal) => {
          if (publishAfter) {
            proposalsApi.publish(proposal.id).then(() => navigate(`/proposals/${proposal.id}`));
          } else {
            navigate(`/proposals/${proposal.id}`);
          }
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
        >
          <ArrowRight size={18} />
        </button>
        <h1 className="text-xl font-bold">הצעת פרויקט חדשה</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="כותרת" required>
          <input
            className="input-base"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
          />
        </Field>

        <Field label="תיאור" required>
          <textarea
            className="input-base resize-none"
            rows={4}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            required
          />
        </Field>

        <Field label="דרישות קדם (אופציונלי)">
          <textarea
            className="input-base resize-none"
            rows={2}
            value={form.requirements}
            onChange={(e) => set('requirements', e.target.value)}
            placeholder="קורסים, ידע נדרש..."
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="פקולטה" required>
            <select
              className="input-base"
              value={form.facultyId}
              onChange={(e) => set('facultyId', e.target.value)}
              required
            >
              <option value="">בחר פקולטה</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </Field>

          <Field label="מספר סטודנטים מקסימלי">
            <input
              type="number"
              min={1}
              max={5}
              className="input-base"
              value={form.maxStudents}
              onChange={(e) => set('maxStudents', e.target.value)}
            />
          </Field>
        </div>

        <Field label="תגיות (הפרד בפסיק או Enter)">
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                className="input-base flex-1"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="למשל: ML, Python, אלגוריתמים"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-1.5 border border-border rounded-md text-sm hover:bg-muted transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags((t) => t.filter((x) => x !== tag))}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Field>

        {create.isError && (
          <p className="text-sm text-destructive">
            {create.error?.response?.data?.message || 'שגיאה ביצירת ההצעה'}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={create.isPending}
            onClick={() => setPublishAfter(false)}
            className="px-4 py-1.5 border border-border rounded-md text-sm hover:bg-muted disabled:opacity-60 transition-colors"
          >
            {create.isPending && !publishAfter ? 'שומר...' : 'שמור כטיוטה'}
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            onClick={() => setPublishAfter(true)}
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {create.isPending && publishAfter ? 'מפרסם...' : 'שמור ופרסם'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive mr-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
