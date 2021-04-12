import { client } from './client';
import { server } from './server';

export const stew = typeof document === 'object' ? client : server;
