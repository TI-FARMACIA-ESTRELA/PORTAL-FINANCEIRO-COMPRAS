import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components';
import { extractApiError } from '@/services/api/client';
import { useAuth } from './authContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, status } = useAuth();
  const [userNumber, setUserNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedNumber = Number(userNumber);
    if (!Number.isInteger(parsedNumber) || parsedNumber <= 0) {
      setError('Informe um número de usuário válido.');
      return;
    }
    if (!password) {
      setError('Informe sua senha.');
      return;
    }

    setLoading(true);
    try {
      await login(parsedNumber, password);
      toast.success('Login realizado com sucesso');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(extractApiError(err, 'Não foi possível entrar. Verifique suas credenciais.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 px-4">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-10"
        aria-hidden="true"
      >
        <defs>
          <pattern id="plus" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M20 12v16M12 20h16"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#plus)" />
      </svg>

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl sm:p-10">
        <div className="flex flex-col items-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor">
              <path d="M12 4v16M4 12h16" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </span>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Portal Financeiro Comercial</h1>
          <p className="mt-1 text-sm text-gray-500">Farmácia Estrela</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="userNumber" className="mb-1 block text-sm font-medium text-gray-700">
              Número de usuário
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <UserIcon className="h-5 w-5" />
              </span>
              <input
                id="userNumber"
                type="text"
                inputMode="numeric"
                value={userNumber}
                onChange={(e) => setUserNumber(e.target.value)}
                placeholder="Ex.: 1"
                className="input-base pl-10"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Senha
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <LockClosedIcon className="h-5 w-5" />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="input-base pl-10 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-600/10">
              {error}
            </div>
          ) : null}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" className="border-white" /> : null}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
