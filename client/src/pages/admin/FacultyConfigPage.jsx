import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Settings, Trash2, ChevronUp, ChevronDown, Plus, Edit2, FileText } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store.js';
import { facultiesApi } from '../../api/faculties.api.js';

export function FacultyConfigPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('configs');
  const [editingConfig, setEditingConfig] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: faculties = [], isLoading } = useQuery({
    queryKey: ['faculties'],
    queryFn: facultiesApi.list,
  });

  const faculty = faculties.find((f) => f.coordinatorId === user?.id);

  const { data: configs = [] } = useQuery({
    queryKey: ['milestone-configs', faculty?.id],
    queryFn: () => facultiesApi.getMilestoneConfigs(faculty.id),
    enabled: !!faculty?.id,
  });


  const createMutation = useMutation({
    mutationFn: (data) => facultiesApi.createMilestoneConfig(faculty.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestone-configs', faculty?.id] });
      setShowForm(false);
      setEditingConfig(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ configId, data }) =>
      facultiesApi.updateMilestoneConfig(faculty.id, configId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestone-configs', faculty?.id] });
      setEditingConfig(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (configId) => facultiesApi.deleteMilestoneConfig(faculty.id, configId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['milestone-configs', faculty?.id] }),
  });

  const moveConfig = (index, direction) => {
    const sorted = [...configs].sort((a, b) => a.order - b.order);
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const a = sorted[index];
    const b = sorted[swapIndex];

    updateMutation.mutate({ configId: a.id, data: { order: b.order } });
    updateMutation.mutate({ configId: b.id, data: { order: a.order } });
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">טוען...</div>;
  if (!faculty) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">לא נמצאה פקולטה המנוהלת על ידך.</p>
      </div>
    );
  }

  const sortedConfigs = [...configs].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Settings size={22} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold">הגדרות פקולטה</h1>
          <p className="text-sm text-muted-foreground">{faculty.name}</p>
        </div>
      </div>

      <div className="flex border-b border-border">
        <TabBtn active={activeTab === 'configs'} onClick={() => setActiveTab('configs')}>
          אבני דרך
        </TabBtn>
        <TabBtn active={activeTab === 'weights'} onClick={() => setActiveTab('weights')}>
          משקלות
        </TabBtn>
      </div>

      {activeTab === 'configs' && (
        <ConfigsTab
          configs={sortedConfigs}
          facultyId={faculty.id}
          onMove={moveConfig}
          onEdit={(c) => { setEditingConfig(c); setShowForm(true); }}
          onDelete={(id) => {
            if (confirm('למחוק את אבן הדרך?')) deleteMutation.mutate(id);
          }}
          showForm={showForm}
          editingConfig={editingConfig}
          onShowForm={() => { setEditingConfig(null); setShowForm(true); }}
          onHideForm={() => { setEditingConfig(null); setShowForm(false); }}
          onCreate={(data) => createMutation.mutate(data)}
          onUpdate={(data) => updateMutation.mutate({ configId: editingConfig.id, data })}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {activeTab === 'weights' && (
        <WeightsTab facultyId={faculty.id} configs={sortedConfigs} />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function ConfigsTab({
  configs,
  facultyId,
  onMove,
  onEdit,
  onDelete,
  showForm,
  editingConfig,
  onShowForm,
  onHideForm,
  onCreate,
  onUpdate,
  isSaving,
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {configs.length} אבני דרך מוגדרות
        </p>
        <button
          onClick={onShowForm}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} /> הוסף אבן דרך
        </button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-white shadow-sm">
        {configs.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            אין אבני דרך עדיין. הוסף את הראשונה!
          </div>
        )}
        {configs.map((config, index) => (
          <div
            key={config.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
          >
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => onMove(index, -1)}
                disabled={index === 0}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => onMove(index, 1)}
                disabled={index === configs.length - 1}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              {config.order}
            </span>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{config.name}</p>
              {config.description && (
                <p className="text-xs text-muted-foreground truncate">{config.description}</p>
              )}
              <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                {config.deadlineOffsetDays && (
                  <span>תאריך יעד: +{config.deadlineOffsetDays} ימים</span>
                )}
                {config.requiresExaminers && <span className="text-amber-600">דורש בוחנים</span>}
                {!config.isRequired && <span className="text-slate-400">אופציונלי</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/admin/faculty/config/${config.id}/template`}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2 py-1 rounded-md transition-colors"
              >
                <FileText size={12} /> טופס ציונים
              </Link>
              <button
                onClick={() => onEdit(config)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => onDelete(config.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <ConfigForm
          initial={editingConfig}
          nextOrder={configs.length + 1}
          onSave={editingConfig ? onUpdate : onCreate}
          onCancel={onHideForm}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

function ConfigForm({ initial, nextOrder, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    order: initial?.order ?? nextOrder,
    deadlineOffsetDays: initial?.deadlineOffsetDays ?? '',
    isRequired: initial?.isRequired ?? true,
    requiresExaminers: initial?.requiresExaminers ?? false,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      order: Number(form.order),
      deadlineOffsetDays: form.deadlineOffsetDays !== '' ? Number(form.deadlineOffsetDays) : null,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4"
    >
      <h3 className="font-semibold text-sm">{initial ? 'עריכת אבן דרך' : 'אבן דרך חדשה'}</h3>

      <div className="grid grid-cols-2 gap-4">
        <Field label="שם" required>
          <input
            className="input-base"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
          />
        </Field>
        <Field label="סדר">
          <input
            type="number"
            min={1}
            className="input-base"
            value={form.order}
            onChange={(e) => set('order', e.target.value)}
          />
        </Field>
      </div>

      <Field label="תיאור">
        <textarea
          className="input-base resize-none"
          rows={2}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>

      <Field label="ימים עד לתאריך יעד (מתחילת פרויקט)">
        <input
          type="number"
          min={0}
          className="input-base"
          value={form.deadlineOffsetDays}
          onChange={(e) => set('deadlineOffsetDays', e.target.value)}
          placeholder="השאר ריק אם אין תאריך יעד קבוע"
        />
      </Field>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.isRequired}
            onChange={(e) => set('isRequired', e.target.checked)}
          />
          חובה
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.requiresExaminers}
            onChange={(e) => set('requiresExaminers', e.target.checked)}
          />
          דורש בוחנים חיצוניים
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isSaving}
          className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isSaving ? 'שומר...' : 'שמור'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 rounded-md text-sm border border-border hover:bg-muted transition-colors"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

function WeightsTab({ facultyId, configs }) {
  const qc = useQueryClient();
  const { data: weights = [] } = useQuery({
    queryKey: ['weights', facultyId],
    queryFn: () => facultiesApi.getWeights(facultyId),
    enabled: !!facultyId,
  });

  const [values, setValues] = useState({});

  useEffect(() => {
    const weightMap = new Map(weights.map((w) => [w.configId, w.weight]));
    setValues(Object.fromEntries(configs.map((c) => [c.id, (weightMap.get(c.id) ?? 0) * 100])));
  }, [weights, configs]);

  const total = Object.values(values).reduce((s, v) => s + (Number(v) || 0), 0);
  const isValid = Math.abs(total - 100) < 0.5;

  const mutation = useMutation({
    mutationFn: (w) => facultiesApi.updateWeights(facultyId, w),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weights', facultyId] }),
  });

  const handleSave = () => {
    const payload = configs.map((c) => ({
      configId: c.id,
      weight: (Number(values[c.id]) || 0) / 100,
    }));
    mutation.mutate(payload);
  };

  if (configs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        הגדר אבני דרך קודם כדי לקבוע משקלות.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        קבע את המשקל (%) של כל אבן דרך בחישוב הציון הסופי. הסכום חייב להיות 100%.
      </p>

      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
        {configs.map((config) => (
          <div
            key={config.id}
            className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0"
          >
            <span className="flex-1 text-sm font-medium">{config.name}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={values[config.id] ?? 0}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [config.id]: e.target.value }))
                }
                className="input-base w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className={`text-sm font-medium ${isValid ? 'text-green-600' : 'text-destructive'}`}>
          סכום: {total.toFixed(1)}% {isValid ? '✓' : '— חייב להיות 100%'}
        </p>
        <button
          onClick={handleSave}
          disabled={!isValid || mutation.isPending}
          className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {mutation.isPending ? 'שומר...' : 'שמור משקלות'}
        </button>
      </div>

      {mutation.isSuccess && (
        <p className="text-sm text-green-600">המשקלות נשמרו בהצלחה.</p>
      )}
      {mutation.isError && (
        <p className="text-sm text-destructive">שגיאה בשמירה. נסה שנית.</p>
      )}
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
