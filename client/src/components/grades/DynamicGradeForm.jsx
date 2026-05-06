import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '../../api/templates.api.js';
import { calculateSubmissionScore } from '@hit/shared';

/**
 * Renders a grade form based on the GradeFormTemplate for a given configId.
 * Calls onSubmit({ comments, responses }) when the user submits.
 */
export function DynamicGradeForm({ configId, onSubmit, isSaving, error }) {
  const { data: template, isLoading } = useQuery({
    queryKey: ['template', configId],
    queryFn: () => templatesApi.get(configId),
    retry: false,
  });

  const [comments, setComments] = useState('');
  const [values, setValues] = useState({});

  const fields = template?.fields ?? [];

  const set = (fieldId, patch) =>
    setValues((prev) => ({ ...prev, [fieldId]: { ...(prev[fieldId] ?? {}), ...patch } }));

  // Real-time score preview
  const previewScore = useMemo(() => {
    if (fields.length === 0) return 0;
    const responses = fields.map((f) => {
      const v = values[f.id] ?? {};
      let numericValue = 0;
      if (f.fieldType === 'BOOLEAN') numericValue = v.booleanValue ? f.maxScore : 0;
      else if (f.fieldType === 'NUMBER' || f.fieldType === 'RUBRIC') numericValue = v.numericValue ?? 0;
      return { fieldId: f.id, numericValue };
    });
    return calculateSubmissionScore(
      fields.map((f) => ({ fieldId: f.id, weight: f.weight, maxScore: f.maxScore })),
      responses
    );
  }, [fields, values]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const responses = fields.map((f) => {
      const v = values[f.id] ?? {};
      return {
        fieldId: f.id,
        numericValue:
          f.fieldType === 'BOOLEAN'
            ? v.booleanValue
              ? f.maxScore
              : 0
            : f.fieldType === 'TEXT'
            ? null
            : (v.numericValue ?? null),
        booleanValue: f.fieldType === 'BOOLEAN' ? (v.booleanValue ?? false) : null,
        textValue: f.fieldType === 'TEXT' ? (v.textValue ?? null) : null,
      };
    });
    onSubmit({ comments, responses });
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">טוען טופס...</div>;

  if (!template || fields.length === 0) {
    return (
      <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
        לא הוגדר טופס ציונים לאבן דרך זו. פנה לרכז הפקולטה.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field, idx) => (
        <FieldInput
          key={field.id}
          field={field}
          index={idx}
          value={values[field.id] ?? {}}
          onChange={(patch) => set(field.id, patch)}
        />
      ))}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">הערות (אופציונלי)</label>
        <textarea
          className="input-base resize-none"
          rows={3}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="הערות כלליות לגבי ההגשה..."
        />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="text-sm">
          <span className="text-muted-foreground">ציון מוקדם: </span>
          <span className="font-bold text-primary text-lg">{previewScore.toFixed(1)}</span>
          <span className="text-muted-foreground text-xs"> / 100</span>
        </div>

        {error && (
          <p className="text-xs text-destructive">
            {error?.response?.data?.message || 'שגיאה בשמירה'}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="bg-primary text-primary-foreground px-5 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isSaving ? 'שומר ציון...' : 'הגש ציון'}
        </button>
      </div>
    </form>
  );
}

function FieldInput({ field, index, value, onChange }) {
  return (
    <div className="bg-slate-50 border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {index + 1}. {field.label}
            {field.isRequired && <span className="text-destructive mr-1">*</span>}
          </p>
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
        {field.fieldType !== 'TEXT' && field.fieldType !== 'BOOLEAN' && (
          <span className="text-xs text-muted-foreground shrink-0">
            מקסימום: {field.maxScore} | משקל: {(field.weight * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {field.fieldType === 'NUMBER' && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={field.minScore ?? 0}
            max={field.maxScore}
            step={1}
            value={value.numericValue ?? field.minScore ?? 0}
            onChange={(e) => onChange({ numericValue: Number(e.target.value) })}
            className="flex-1"
          />
          <input
            type="number"
            min={field.minScore ?? 0}
            max={field.maxScore}
            value={value.numericValue ?? ''}
            onChange={(e) => onChange({ numericValue: Number(e.target.value) })}
            className="input-base w-20 text-center"
          />
        </div>
      )}

      {field.fieldType === 'RUBRIC' && (
        <div className="space-y-1.5">
          {(field.rubricItems ?? [])
            .sort((a, b) => b.score - a.score)
            .map((item) => (
              <label
                key={item.id ?? item.label}
                className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer border transition-colors ${
                  value.numericValue === item.score
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name={`rubric-${field.id}`}
                  checked={value.numericValue === item.score}
                  onChange={() => onChange({ numericValue: item.score })}
                  className="shrink-0"
                />
                <span className="text-sm flex-1">{item.label}</span>
                <span className="text-xs font-medium text-primary">{item.score}</span>
              </label>
            ))}
        </div>
      )}

      {field.fieldType === 'BOOLEAN' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.booleanValue ?? false}
            onChange={(e) => onChange({ booleanValue: e.target.checked })}
          />
          <span className="text-sm">כן ({field.maxScore} נקודות)</span>
        </label>
      )}

      {field.fieldType === 'TEXT' && (
        <textarea
          className="input-base resize-none"
          rows={3}
          value={value.textValue ?? ''}
          onChange={(e) => onChange({ textValue: e.target.value })}
          placeholder="הזן תשובה..."
        />
      )}
    </div>
  );
}
