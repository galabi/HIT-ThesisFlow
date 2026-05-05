import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronUp, ChevronDown, ArrowRight, GripVertical } from 'lucide-react';
import { templatesApi } from '../../api/templates.api.js';
import { facultiesApi } from '../../api/faculties.api.js';

const FIELD_TYPES = [
  { value: 'NUMBER', label: 'מספרי' },
  { value: 'RUBRIC', label: 'רובריקה' },
  { value: 'BOOLEAN', label: 'כן/לא' },
  { value: 'TEXT', label: 'טקסט חופשי' },
];

const emptyField = () => ({
  _id: crypto.randomUUID(),
  label: '',
  fieldType: 'NUMBER',
  maxScore: 100,
  minScore: 0,
  weight: 0,
  order: 1,
  isRequired: true,
  helpText: '',
  rubricItems: [],
});

export function GradeFormBuilderPage() {
  const { configId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: template, isLoading: loadingTemplate } = useQuery({
    queryKey: ['template', configId],
    queryFn: () => templatesApi.get(configId),
    retry: false,
  });

  const { data: faculties = [] } = useQuery({
    queryKey: ['faculties'],
    queryFn: facultiesApi.list,
  });

  const configName = faculties
    .flatMap((f) => f.milestoneConfigs ?? [])
    .find((c) => c.id === configId)?.name;

  const [fields, setFields] = useState([]);

  useEffect(() => {
    if (template) {
      setFields(
        template.fields.map((f) => ({
          ...f,
          _id: f.id,
          rubricItems: f.rubricItems ?? [],
        }))
      );
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: (data) => templatesApi.save(configId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template', configId] });
      qc.invalidateQueries({ queryKey: ['milestone-configs'] });
    },
  });

  const totalWeight = fields.reduce((s, f) => s + (Number(f.weight) || 0), 0);
  const weightsValid = fields.length === 0 || Math.abs(totalWeight - 1) < 0.005;

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { ...emptyField(), order: prev.length + 1 },
    ]);
  };

  const updateField = (idx, patch) =>
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));

  const removeField = (idx) =>
    setFields((prev) => prev.filter((_, i) => i !== idx).map((f, i) => ({ ...f, order: i + 1 })));

  const moveField = (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= fields.length) return;
    setFields((prev) => {
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((f, i) => ({ ...f, order: i + 1 }));
    });
  };

  const addRubricItem = (fieldIdx) =>
    updateField(fieldIdx, {
      rubricItems: [
        ...(fields[fieldIdx].rubricItems ?? []),
        { label: '', score: 0 },
      ],
    });

  const updateRubricItem = (fieldIdx, itemIdx, patch) => {
    const items = [...(fields[fieldIdx].rubricItems ?? [])];
    items[itemIdx] = { ...items[itemIdx], ...patch };
    updateField(fieldIdx, { rubricItems: items });
  };

  const removeRubricItem = (fieldIdx, itemIdx) => {
    const items = (fields[fieldIdx].rubricItems ?? []).filter((_, i) => i !== itemIdx);
    updateField(fieldIdx, { rubricItems: items });
  };

  const handleSave = () => {
    const payload = fields.map(({ _id, id, rubricItems, ...f }, i) => ({
      ...f,
      order: i + 1,
      rubricItems: (rubricItems ?? []).filter((r) => r.label),
    }));
    saveMutation.mutate({ fields: payload });
  };

  if (loadingTemplate && !template) {
    return <div className="p-6 text-muted-foreground">טוען טופס...</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/faculty')}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
        >
          <ArrowRight size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold">בניית טופס ציונים</h1>
          {configName && <p className="text-sm text-muted-foreground">{configName}</p>}
        </div>
      </div>

      <div className="space-y-3">
        {fields.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
            אין שדות עדיין. הוסף שדה ראשון.
          </div>
        )}

        {fields.map((field, idx) => (
          <FieldCard
            key={field._id}
            field={field}
            index={idx}
            total={fields.length}
            onUpdate={(patch) => updateField(idx, patch)}
            onRemove={() => removeField(idx)}
            onMove={(dir) => moveField(idx, dir)}
            onAddRubricItem={() => addRubricItem(idx)}
            onUpdateRubricItem={(itemIdx, patch) => updateRubricItem(idx, itemIdx, patch)}
            onRemoveRubricItem={(itemIdx) => removeRubricItem(idx, itemIdx)}
          />
        ))}
      </div>

      <button
        onClick={addField}
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 border border-dashed border-primary/40 hover:border-primary px-4 py-2 rounded-lg w-full justify-center transition-colors"
      >
        <Plus size={16} /> הוסף שדה
      </button>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="text-sm">
          {fields.length > 0 && (
            <span className={weightsValid ? 'text-green-600' : 'text-destructive'}>
              סכום משקלות: {(totalWeight * 100).toFixed(0)}%{' '}
              {weightsValid ? '✓' : '— חייב להיות 100%'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin/faculty')}
            className="px-4 py-1.5 rounded-md text-sm border border-border hover:bg-muted transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={(!weightsValid && fields.length > 0) || saveMutation.isPending}
            className="bg-primary text-primary-foreground px-5 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {saveMutation.isPending ? 'שומר...' : 'שמור טופס'}
          </button>
        </div>
      </div>

      {saveMutation.isSuccess && (
        <p className="text-sm text-green-600 text-center">הטופס נשמר בהצלחה.</p>
      )}
      {saveMutation.isError && (
        <p className="text-sm text-destructive text-center">
          {saveMutation.error?.response?.data?.message || 'שגיאה בשמירה'}
        </p>
      )}
    </div>
  );
}

function FieldCard({
  field,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  onAddRubricItem,
  onUpdateRubricItem,
  onRemoveRubricItem,
}) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 pt-1">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-1">
          {index + 1}
        </span>

        <div className="flex-1 grid grid-cols-2 gap-3">
          <SmallField label="שם השדה">
            <input
              className="input-base"
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="לדוגמה: ציון מצגת"
            />
          </SmallField>

          <SmallField label="סוג שדה">
            <select
              className="input-base"
              value={field.fieldType}
              onChange={(e) => onUpdate({ fieldType: e.target.value })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </SmallField>

          {field.fieldType !== 'TEXT' && field.fieldType !== 'BOOLEAN' && (
            <>
              <SmallField label="ציון מקסימלי">
                <input
                  type="number"
                  min={0}
                  className="input-base"
                  value={field.maxScore}
                  onChange={(e) => onUpdate({ maxScore: Number(e.target.value) })}
                />
              </SmallField>
              <SmallField label="משקל (0–1)">
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  className="input-base"
                  value={field.weight}
                  onChange={(e) => onUpdate({ weight: Number(e.target.value) })}
                />
              </SmallField>
            </>
          )}

          {(field.fieldType === 'TEXT' || field.fieldType === 'BOOLEAN') && (
            <SmallField label="משקל (0–1)">
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                className="input-base"
                value={field.weight}
                onChange={(e) => onUpdate({ weight: Number(e.target.value) })}
              />
            </SmallField>
          )}

          <SmallField label="הסבר (אופציונלי)" className="col-span-2">
            <input
              className="input-base"
              value={field.helpText}
              onChange={(e) => onUpdate({ helpText: e.target.value })}
              placeholder="הסבר קצר לממלא הטופס"
            />
          </SmallField>
        </div>

        <button
          onClick={onRemove}
          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors mt-1"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {field.fieldType === 'RUBRIC' && (
        <RubricEditor
          items={field.rubricItems ?? []}
          onAdd={onAddRubricItem}
          onUpdate={onUpdateRubricItem}
          onRemove={onRemoveRubricItem}
        />
      )}
    </div>
  );
}

function RubricEditor({ items, onAdd, onUpdate, onRemove }) {
  return (
    <div className="border-t border-border pt-3 mt-1 space-y-2 pr-7">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">פריטי רובריקה</p>
        <button
          onClick={onAdd}
          className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
        >
          <Plus size={12} /> הוסף
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="input-base flex-1"
            value={item.label}
            onChange={(e) => onUpdate(i, { label: e.target.value })}
            placeholder="תיאור הרמה"
          />
          <input
            type="number"
            min={0}
            className="input-base w-20 text-center"
            value={item.score}
            onChange={(e) => onUpdate(i, { score: Number(e.target.value) })}
            placeholder="ציון"
          />
          <button
            onClick={() => onRemove(i)}
            className="p-1 text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

function SmallField({ label, className = '', children }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
