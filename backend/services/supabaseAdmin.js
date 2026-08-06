/**
 * Client Supabase com service role, usado pela camada de sincronização de
 * KPI (kpiSyncService/kpiSyncScheduler) para ler/gravar as tabelas de
 * agendamento e cache sem depender de sessão de usuário.
 *
 * Inicialização preguiçosa (só na primeira chamada): em módulos ES, todo
 * import estático é avaliado ANTES do corpo do server.js rodar — inclusive
 * antes das chamadas dotenv.config() de lá. Se o client fosse criado no topo
 * deste arquivo (import-time), process.env.SUPABASE_URL/SERVICE_KEY ainda
 * estariam vazios e o client ficaria null para sempre.
 */
import { createClient } from '@supabase/supabase-js'

let _client
let _tentouCriar = false

export function getSupabaseAdmin() {
  if (!_tentouCriar) {
    _tentouCriar = true
    _client = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
      ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null
  }
  return _client
}
