-- Minha Nota Fiscal (prestador PJ): com o menu 'minha-nota-fiscal', o usuário lê só o que é dele —
-- o funcionário ligado ao usuário em usuarios.funcionario_id. Policies só de LEITURA (somam às existentes).
CREATE OR REPLACE FUNCTION public.sec_meu_funcionario_id()
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$
  SELECT funcionario_id FROM public.usuarios
  WHERE ativo IS NOT FALSE AND lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1
$$;

DROP POLICY IF EXISTS minha_nf_ler ON fato_comissoes_calculadas;
CREATE POLICY minha_nf_ler ON fato_comissoes_calculadas FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu('minha-nota-fiscal')) AND funcionario_id = (SELECT sec_meu_funcionario_id()));

DROP POLICY IF EXISTS minha_nf_ler ON fato_comissoes_lotes;
CREATE POLICY minha_nf_ler ON fato_comissoes_lotes FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu('minha-nota-fiscal')) AND EXISTS (
    SELECT 1 FROM fato_comissoes_calculadas c WHERE c.lote_id = fato_comissoes_lotes.id AND c.funcionario_id = (SELECT sec_meu_funcionario_id())));

-- Políticas/regras do cargo do próprio funcionário (pra montar a nota e o cálculo detalhado).
DROP POLICY IF EXISTS minha_nf_ler ON fato_politica_comissao;
CREATE POLICY minha_nf_ler ON fato_politica_comissao FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu('minha-nota-fiscal')) AND cargo_id = (SELECT f.cargo_id FROM dim_funcionarios f WHERE f.id = (SELECT sec_meu_funcionario_id())));

DROP POLICY IF EXISTS minha_nf_ler ON dim_regras_comissao;
CREATE POLICY minha_nf_ler ON dim_regras_comissao FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu('minha-nota-fiscal')));
DROP POLICY IF EXISTS minha_nf_ler ON dim_regras_comissao_faixas;
CREATE POLICY minha_nf_ler ON dim_regras_comissao_faixas FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu('minha-nota-fiscal')));

NOTIFY pgrst, 'reload schema';
