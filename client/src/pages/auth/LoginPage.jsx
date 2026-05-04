import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@hit/shared';
import { useAuth } from '../../hooks/useAuth.js';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    setError('');
    try {
      await login(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה בכניסה למערכת');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">HIT ThesisFlow</h1>
          <p className="text-muted-foreground text-sm mt-1">מערכת ניהול פרויקטי גמר</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">דואל</label>
            <input
              {...register('email')}
              type="email"
              placeholder="your@email.ac.il"
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

          {error && (
            <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'מתחבר...' : 'כניסה למערכת'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          אין לך חשבון?{' '}
          <Link to="/register" className="text-primary hover:underline">
            הרשמה
          </Link>
        </p>
      </div>
    </div>
  );
}
