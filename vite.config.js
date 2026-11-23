import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Porta fixa 3000 (VITE_PORT para trocar). Não usa mais PORT: com PORT=3001 no terminal (a porta do
    // backend) o Vite subia na 3001 e respondia HTML no lugar da API (erro "Unexpected token '<'"), 23/11/2026.
    port: Number(process.env.VITE_PORT) || 3000,
    strictPort: true, // se a 3000 estiver ocupada, avisa em vez de pular para outra porta
  }
})
