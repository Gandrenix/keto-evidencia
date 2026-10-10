import type { Config } from '@netlify/functions'
import { route } from '../../server/router.ts'

export default async (req: Request): Promise<Response> => route(req)

export const config: Config = { path: '/api/*' }
