import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { drizzleManager } from "./drizzle-manager";

// Use __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

/**
 * Script para gerar arquivos de migração SQL
 * Este script usa drizzle-kit para criar arquivos SQL com as alterações
 * necessárias para atualizar o esquema do banco sem perder dados
 */
async function main() {
  console.log("=== GERADOR DE MIGRAÇÕES SEGURAS ===");
  
  try {
    // Verificar banco atual
    console.log("\n1. Verificando estado atual do banco de dados...");
    const dbState = await drizzleManager.checkDatabaseState();
    if (!dbState.connected) {
      throw new Error("Não foi possível conectar ao banco de dados. Verifique as credenciais e tente novamente.");
    }
    console.log(`- Banco conectado: ${dbState.connected ? 'OK' : 'FALHA'}`);
    console.log(`- Tabelas existentes: ${dbState.tables}`);
    
    // Criar o diretório de migrações se não existir
    const migrationsDir = path.join(__dirname, "../migrations");
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log(`\n2. Diretório de migrações criado: ${migrationsDir}`);
    } else {
      console.log(`\n2. Diretório de migrações já existe: ${migrationsDir}`);
    }
    
    // Gerar timestamp para nome de migração
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const migrationName = process.argv[2] || "schema-update";
    const migrationFileName = `${timestamp}_${migrationName.replace(/\s+/g, "-")}`;
    
    console.log(`\n3. Gerando migração: ${migrationFileName}`);
    
    // Executar drizzle-kit para gerar migração
    const command = `npx drizzle-kit generate:pg --schema=./shared/schema.ts --out=./migrations`;
    console.log(`- Executando comando: ${command}`);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes("Waiting for filesystem")) {
      console.warn("Avisos durante geração:", stderr);
    }
    
    console.log("- Saída do comando:");
    console.log(stdout);
    
    // Verificar se os arquivos foram criados
    const files = fs.readdirSync(migrationsDir);
    console.log(`\n4. Arquivos de migração criados (${files.length} total):`);
    files.forEach(file => {
      console.log(`- ${file}`);
    });
    
    console.log("\n=== MIGRAÇÃO GERADA COM SUCESSO ===");
    console.log("Use o comando a seguir para aplicar a migração:");
    console.log("  npm run db:migrate");
  } catch (error) {
    console.error("\n❌ ERRO DURANTE GERAÇÃO DE MIGRAÇÃO:", error);
    process.exit(1);
  } finally {
    // Encerra as conexões com o banco
    await drizzleManager.close();
  }
}

// Executar o script
main();