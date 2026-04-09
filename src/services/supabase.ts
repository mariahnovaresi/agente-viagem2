import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://egrlxjjenslwqlelrzkg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0yd7NFHvvXbNElB1VE7p5Q_TVbzgZYW';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Cliente {
  id: string;
  codigo: string;
  nome: string;
  plano: string;
  limite: number;
  consultas_usadas: number;
  vencimento: string;
  ativo: boolean;
}

// Busca o cliente pelo código que ele digitou
export async function buscarCliente(codigo: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('codigo', codigo.toUpperCase().trim())
    .single();

  if (error || !data) return null;
  return data as Cliente;
}

// Verifica se o cliente pode fazer mais consultas
export async function verificarCota(codigo: string): Promise<{
  permitido: boolean;
  mensagem: string;
  cliente: Cliente | null;
}> {
  const cliente = await buscarCliente(codigo);

  if (!cliente) {
    return {
      permitido: false,
      mensagem: '❌ Código de acesso inválido. Verifique o código enviado após seu pagamento.',
      cliente: null,
    };
  }

  if (!cliente.ativo) {
    return {
      permitido: false,
      mensagem: '❌ Seu acesso está inativo. Entre em contato pelo WhatsApp para reativar.',
      cliente: null,
    };
  }

  const hoje = new Date().toISOString().split('T')[0];
  if (cliente.vencimento < hoje) {
    return {
      permitido: false,
      mensagem: '❌ Seu plano venceu. Entre em contato pelo WhatsApp para renovar.',
      cliente: null,
    };
  }

  if (cliente.consultas_usadas >= cliente.limite) {
    return {
      permitido: false,
      mensagem: `❌ Você atingiu o limite de ${cliente.limite} consultas do seu plano ${cliente.plano}. Entre em contato para fazer upgrade! 🚀`,
      cliente,
    };
  }

  return {
    permitido: true,
    mensagem: `✅ Acesso liberado! Você tem ${cliente.limite - cliente.consultas_usadas} consultas restantes.`,
    cliente,
  };
}

// Registra uma consulta usada
export async function registrarConsulta(codigo: string): Promise<void> {
  const cliente = await buscarCliente(codigo);
  if (!cliente) return;

  await supabase
    .from('clientes')
    .update({ consultas_usadas: cliente.consultas_usadas + 1 })
    .eq('codigo', codigo.toUpperCase().trim());
}
