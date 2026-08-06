import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function initDb() {
  const db = await open({
    filename: path.join(__dirname, 'portal.db'),
    driver: sqlite3.Database
  })

  await db.exec('PRAGMA foreign_keys = ON')

  // Tabela: grupos_acesso
  await db.exec(`
    CREATE TABLE IF NOT EXISTS grupos_acesso (
      id TEXT PRIMARY KEY,
      nome_grupo TEXT NOT NULL UNIQUE,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Tabela: usuarios
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      grupo_id TEXT NOT NULL,
      ativo BOOLEAN DEFAULT 1,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (grupo_id) REFERENCES grupos_acesso(id) ON DELETE RESTRICT
    )
  `)

  // Tabela: permissoes_telas
  await db.exec(`
    CREATE TABLE IF NOT EXISTS permissoes_telas (
      id TEXT PRIMARY KEY,
      grupo_id TEXT NOT NULL,
      menu_path TEXT NOT NULL,
      visualizar BOOLEAN DEFAULT 1,
      editar BOOLEAN DEFAULT 1,
      excluir BOOLEAN DEFAULT 1,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(grupo_id, menu_path),
      FOREIGN KEY (grupo_id) REFERENCES grupos_acesso(id) ON DELETE CASCADE
    )
  `)

  // Atualiza o esquema existente quando a tabela já existe mas não tem as colunas novas.
  const permsColumns = await db.all("PRAGMA table_info(permissoes_telas)")
  const columnNames = permsColumns.map(col => col.name)
  if (!columnNames.includes('editar')) {
    await db.exec("ALTER TABLE permissoes_telas ADD COLUMN editar BOOLEAN DEFAULT 1")
  }
  if (!columnNames.includes('excluir')) {
    await db.exec("ALTER TABLE permissoes_telas ADD COLUMN excluir BOOLEAN DEFAULT 1")
  }

  return db
}
