import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidCnpj } from './cnpj.util';

/**
 * Valida CNPJ quando informado. Valores vazios/nulos passam (use junto de @IsOptional).
 */
export function IsCnpj(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCnpj',
      target: object.constructor,
      propertyName,
      options: { message: 'CNPJ inválido.', ...validationOptions },
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null || value === '') return true;
          return typeof value === 'string' && isValidCnpj(value);
        },
      },
    });
  };
}
