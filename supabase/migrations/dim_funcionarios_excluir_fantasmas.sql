-- Registros "fantasma" — duplicados de funcionários já demitidos (gêmeo correto tem
-- código de funcionário, Situação=Demitido e Data de Demissão preenchidos; este fantasma
-- ficou sem código, com Situação em branco/"1-Trabalhando" e ativo=true, aparecendo
-- incorretamente como elegível em Cálculo de Comissões). Confirmado 1 a 1 antes de excluir —
-- cada um tem exatamente um gêmeo já demitido com o mesmo nome.
DELETE FROM dim_funcionarios WHERE id IN (
  'f47ec3d8-3c77-46dd-aef1-eb0d588ed6ce', -- Karoline Thimoteo de Andrade
  'fcc930e9-8e05-436d-89da-687580344740', -- Gladys Aparecida Oliveira
  'db101688-8577-41fd-855c-ed397892254d', -- João Victor de Andrade Garcia
  '261da36a-273d-4d74-85c2-1b185a651edd', -- Elias Vaz Aguero
  '06c50708-8d3c-4a14-b824-9aa050988281', -- Leonardo Silva Costa
  '1ba98fbd-5740-4c05-8857-01fb9fd711d2', -- Rute Maria Neres de Lima
  '31337da2-ed75-4715-9996-59bc2030adee', -- Gabriel Menezes Rodrigues
  '0c1098ff-1770-47f2-a7a2-003765f32c7b', -- Gisele Fernanda Pereira Amaro
  '057c43fe-f00a-468a-8394-087081f6188d', -- Waldemir Severino da Silva
  '8179d78f-883a-4113-8a77-59657efa7c7a', -- Jeferson Aquino Nunes
  '445c882c-9431-43a2-b4b8-d9d1565a5f3e'  -- Cristina Aparecida da Silva Duarte
);
