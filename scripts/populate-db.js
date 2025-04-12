#!/usr/bin/env node

/**
 * Script para executar populate-database.ts usando tsx (TypeScript executor)
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Obter o caminho do diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminho para o arquivo TypeScript
const scriptPath = join(__dirname, 'populate-database.ts');

// Executa o script TypeScript usando tsx
const child = spawn('npx', ['tsx', scriptPath], {
  stdio: 'inherit',
  shell: true
});

// Captura eventos de erro e término
child.on('error', (error) => {
  console.error('Erro ao executar o script:', error);
  process.exit(1);
});

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`O script terminou com código de erro: ${code}`);
    process.exit(code);
  }
  console.log('Execução concluída com sucesso!');
});