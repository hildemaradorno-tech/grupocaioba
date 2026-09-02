-- ============================================================
-- Exclusão das categorias (Nível 1) que ficaram totalmente vazias
-- depois da exclusão de itens em governanca_menus_dealernet_excluir.sql
-- (todo o conteúdo delas já tinha sido removido, sobrou só o "cabeçalho"
-- da categoria sem nenhum filho).
-- Executar no Supabase SQL Editor
-- ============================================================

DELETE FROM governanca_menus
WHERE sistema = 'Dealer.net'
  AND pai_id IS NULL
  AND nome IN (
    'BackOffice Plus', 'BAJAJ', 'Chery', 'Dafra', 'DWFServices', 'ECF',
    'EMRYS', 'FastService', 'Fendt', 'Fleet Rental', 'FParts', 'FReport',
    'Gateway', 'Intelligent Supply', 'Iveco', 'Kawasaki', 'MAN',
    'Massey Ferguson', 'Scania', 'Stellantis', 'Valtra', 'VOLKSWAGEN'
  );
