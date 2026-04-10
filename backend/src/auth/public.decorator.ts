import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca o endpoint como público (sem autenticação). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
