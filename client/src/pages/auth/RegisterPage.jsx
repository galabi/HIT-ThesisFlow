import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, Role, StudentLevel } from '@hit/shared';
import { authApi } from '../../api/auth.api.js';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';

const roleOptions = [
  { value: Role.STUDENT, label: 'סטודנט' },
  { value: Role.SUPERVISOR, label: 'מנחה' },
  { value: Role.EXAMINER, label: 'בוחן' },
];

const levelOptions = [
  { value: StudentLevel.BSC_3, label: "תואר ראשון - שנה ג'" },
  { value: StudentLevel.BSC_4, label: "תואר ראשון - שנה ד'" },
  { value: StudentLevel.MSC_1, label: "תואר שני - שנה א'" },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) });

  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    setError('');
    try {
      await authApi.register(data);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה ברישום');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-8" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">הרשמה למערכת</h1>
          <p className="text-muted-foreground text-sm mt-1">HIT ThesisFlow</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">שם פרטי</label>
              <input
                {...register('firstName')}
                className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.firstName && <p className="text-destructive text-xs">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">שם משפחה</label>
              <input
                {...register('lastName')}
                className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.lastName && <p className="text-destructive text-xs">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">דואל</label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">סיסמה</label>
            <input
              {...register('password')}
              type="password"
              className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">תפקיד</label>
            <select
              {...register('role')}
              className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white"
            >
              <option value="">בחר תפקיד</option>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.role && <p className="text-destructive text-xs">{errors.role.message}</p>}
          </div>

          {selectedRole === Role.STUDENT && (
            <div className="space-y-1">
              <label className="text-sm font-medium">שנת לימוד</label>
              <select
                {...register('studentLevel')}
                className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white"
              >
                <option value="">בחר שנת לימוד</option>
                {levelOptions.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'נרשם...' : 'הרשמה'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          יש לך חשבון?{' '}
          <Link to="/login" className="text-primary hover:underline">
            כניסה
          </Link>
        </p>
      </div>
    </div>
  );
}
