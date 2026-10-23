-- Nome completo do usuário (usado em documentos, ex.: assinatura da Nota de Débito)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nome_completo text;
