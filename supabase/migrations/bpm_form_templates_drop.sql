-- Reverte a migration bpm_form_templates.sql — feature de "Modelos de Formulário" removida a
-- pedido do usuário (não gostou) logo depois de criada.
DROP TABLE IF EXISTS bpm_form_templates;
