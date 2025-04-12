/**
 * Script para gerar o hash de uma senha
 * Este script utiliza a mesma função usada no sistema para garantir compatibilidade
 */

import { hashPassword } from '../server/auth';

async function main() {
  const password = 'SNKRlcl@2025'; // Senha que queremos gerar o hash
  
  try {
    const hashedPassword = await hashPassword(password);
    console.log('Password original:', password);
    console.log('Hash gerado:', hashedPassword);
  } catch (error) {
    console.error('Erro ao gerar hash:', error);
  }
}

main();