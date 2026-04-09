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

export async function buscarCliente(codigo: string): Promise<Cliente | null> {
  const codigoLimpo = codigo.toUpperCase().trim();

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .ilike('codigo', codigoLimpo)
    .limit(1);

  if (error) {
    console.error('Erro ao buscar cliente:', error);
    return null;
  }

  if (!data || data.length === 0) {
    console.log('Nenhum cliente encontrado para o código:', codigoLimpo);
    return null;
  }

  return data[0] as Cliente;
}

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

export async function registrarConsulta(codigo: string): Promise<void> {
  const cliente = await buscarCliente(codigo);
  if (!cliente) return;

  await supabase
    .from('clientes')
    .update({ consultas_usadas: cliente.consultas_usadas + 1 })
    .ilike('codigo', codigo.toUpperCase().trim());
}
