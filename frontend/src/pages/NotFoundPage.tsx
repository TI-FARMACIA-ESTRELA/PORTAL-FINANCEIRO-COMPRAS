import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <p className="text-5xl font-bold text-primary-600">404</p>
      <h1 className="mt-2 text-lg font-semibold text-gray-900">Página não encontrada</h1>
      <p className="mt-1 text-sm text-gray-500">
        O endereço acessado não existe no Portal Financeiro.
      </p>
      <Link to="/dashboard" className="btn-primary mt-6">
        Voltar ao dashboard
      </Link>
    </div>
  );
}
