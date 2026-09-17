-- Vincula opcionalmente um usuário a um cadastro de Funcionário (dim_funcionarios). Ao
-- vincular, a tela de Usuários copia o cargo_id do funcionário pra usuarios.cargo_id (campo
-- já usado pelo BPM pra decidir quais tarefas o usuário pode assumir) — funcionario_id fica
-- só como referência de qual funcionário originou aquele cargo, pra tela saber quando travar
-- o campo Cargo como somente-leitura. Nullable: usuários sem cadastro de funcionário (ex.:
-- administradores, contas de sistema) continuam podendo escolher o Cargo direto.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS funcionario_id uuid REFERENCES dim_funcionarios(id);
