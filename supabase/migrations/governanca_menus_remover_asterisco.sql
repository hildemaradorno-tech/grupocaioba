-- Remove do catálogo do Dealer.net os menus marcados com "(*)" (legado): o export do Dealer.net
-- lista "Faturas (*)" e "Lançamentos (*)" ao lado dos menus reais, mas na tela de Acesso a Botão
-- do próprio Dealer.net só existe um "Faturas"/"Lançamentos". Os botões Incluir/Alterar de cada
-- um saem junto (ON DELETE CASCADE). Nenhum desses nós tem marcação de grupo.
DELETE FROM governanca_menus
WHERE sistema = 'Dealer.net'
  AND nome LIKE '%(*)';
