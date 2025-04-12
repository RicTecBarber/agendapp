import { drizzleManager } from "./drizzle-manager";

/**
 * Script para aplicar migrações ao banco de dados de forma segura
 * Este script aplica todas as migrações pendentes sem destruir os dados existentes
 * 
 * Características:
 * - Faz backup automático antes de alterações (se configurado)
 * - Aplica migrações incrementais sem reset do banco
 * - Verifica integridade antes e depois das operações
 * - Garante a preservação dos dados existentes
 */
async function main() {
  console.log("=== SISTEMA DE MIGRAÇÃO SEGURA DE BANCO DE DADOS ===");
  console.log("Iniciando processo de migração com preservação de dados...");
  
  try {
    // Verificar estado inicial do banco
    console.log("\n1. Verificando estado atual do banco de dados...");
    const initialState = await drizzleManager.checkDatabaseState();
    console.log(`- Conexão: ${initialState.connected ? 'OK' : 'FALHA'}`);
    if (initialState.connected) {
      console.log(`- Tabelas encontradas: ${initialState.tables}`);
      console.log(`- Tamanho atual do banco: ${initialState.databaseSizeReadable}`);
    }
    
    if (!initialState.connected) {
      throw new Error("Não foi possível conectar ao banco de dados. Verifique as credenciais e tente novamente.");
    }
    
    // Executar backup (se estiver em produção)
    if (process.env.NODE_ENV === 'production') {
      console.log("\n2. Ambiente de produção detectado. Realizando backup preventivo...");
      const backupPath = await drizzleManager.backupDatabase();
      if (!backupPath) {
        throw new Error("Backup falhou. Migração abortada para proteção dos dados.");
      }
      console.log(`- Backup concluído: ${backupPath}`);
    } else {
      console.log("\n2. Ambiente de desenvolvimento detectado. Backup opcional (não realizado).");
    }
    
    // Aplicar migrações de forma segura
    console.log("\n3. Aplicando migrações de forma incremental...");
    const migrationSuccess = await drizzleManager.applyMigrations();
    
    if (!migrationSuccess) {
      throw new Error("Falha ao aplicar migrações.");
    }
    
    // Verificar estado final
    console.log("\n4. Verificando estado final do banco de dados...");
    const finalState = await drizzleManager.checkDatabaseState();
    console.log(`- Conexão: ${finalState.connected ? 'OK' : 'FALHA'}`);
    if (finalState.connected) {
      console.log(`- Tabelas encontradas: ${finalState.tables}`);
      console.log(`- Tamanho final do banco: ${finalState.databaseSizeReadable}`);
    }
    
    console.log("\n=== MIGRAÇÃO CONCLUÍDA COM SUCESSO ===");
    console.log("Os dados existentes foram preservados e o esquema foi atualizado.");
  } catch (error) {
    console.error("\n❌ ERRO DURANTE MIGRAÇÃO:", error);
    process.exit(1);
  } finally {
    // Encerra as conexões com o banco
    await drizzleManager.close();
  }
}

// Executa o script
main();