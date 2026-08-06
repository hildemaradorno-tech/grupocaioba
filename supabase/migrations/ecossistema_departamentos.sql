-- ============================================================
-- MÓDULO: Ecossistema — "Minha Concessionária"
-- Departamentos da concessionária e os sistemas que cada um usa,
-- exibidos num diagrama radial ligado ao hub central (Concessionária).
-- sistemas: jsonb array de {nome, cor, icone, emoji} — cada sistema tem
-- cor e ícone/emoji próprios, editáveis clicando no nó dele no diagrama.
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS ecossistema_departamentos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL,
  sistemas   jsonb NOT NULL DEFAULT '[]',
  cor        text,
  ordem      int NOT NULL DEFAULT 0,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ecossistema_departamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON ecossistema_departamentos;
CREATE POLICY "auth_all" ON ecossistema_departamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
