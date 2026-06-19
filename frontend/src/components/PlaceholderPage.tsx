import type { ReactNode } from 'react';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { Card } from './Card';

interface PlaceholderPageProps {
  title: string;
  subtitle?: string;
  phaseNote?: string;
  children?: ReactNode;
}

/**
 * Página placeholder para módulos que serão implementados nas próximas fases.
 * Mantém a identidade visual sem implementar regras de negócio.
 */
export function PlaceholderPage({
  title,
  subtitle,
  phaseNote = 'Este módulo será implementado em uma fase posterior do plano técnico.',
  children,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {children ?? (
        <Card>
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <WrenchScrewdriverIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">Em construção</p>
              <p className="text-sm text-gray-500">{phaseNote}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
