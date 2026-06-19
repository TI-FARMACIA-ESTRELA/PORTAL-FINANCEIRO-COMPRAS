import { Card } from '@/components';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { roleLabel } from '@/layouts/roleBadge';

export function ProfilePage() {
  const user = useCurrentUser();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Perfil</h2>
        <p className="mt-1 text-sm text-gray-500">Dados da sua conta no portal.</p>
      </div>
      <Card className="max-w-lg">
        <dl className="divide-y divide-gray-100 text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">Número de usuário</dt>
            <dd className="font-medium text-gray-900">{user.userNumber}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">Nome</dt>
            <dd className="font-medium text-gray-900">{user.name}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">Perfil</dt>
            <dd className="font-medium text-gray-900">{roleLabel[user.role]}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
