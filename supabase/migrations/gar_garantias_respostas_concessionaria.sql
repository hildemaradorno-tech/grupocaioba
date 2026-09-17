-- Histórico de "Resposta Concessionária" na OS (Editar Garantia), abaixo de Resposta SHC.
-- Mesmo modelo de gar_titulos_observacoes: várias entradas por OS, cada uma com autor e
-- data, editável/excluível individualmente.
CREATE TABLE IF NOT EXISTS public.gar_garantias_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garantia_id UUID NOT NULL REFERENCES public.gar_garantias(id) ON DELETE CASCADE,
  observacao TEXT NOT NULL,
  atualizado_por TEXT,
  criado_em TIMESTAMP DEFAULT now(),
  atualizado_em TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gar_garantias_respostas_garantia_idx ON public.gar_garantias_respostas (garantia_id);

ALTER TABLE public.gar_garantias_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON public.gar_garantias_respostas FOR ALL TO authenticated USING (true) WITH CHECK (true);
