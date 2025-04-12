import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, pool } from "./db";
import path from "path";
import { fileURLToPath } from "url";

// Use __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script para aplicar migrações ao banco de dados de forma segura
 * Este script aplica todas as migrações pendentes sem destruir os dados existentes
 */
async function main() {
  console.log("Iniciando processo de migração do banco de dados...");
  
  try {
    // Executa as migrações
    await migrate(db, {
      migrationsFolder: path.join(__dirname, "../migrations"),
    });
    
    console.log("Migração concluída com sucesso!");
  } catch (error) {
    console.error("Erro durante a migração:", error);
    process.exit(1);
  } finally {
    // Encerra o pool para que o script possa terminar
    await pool.end();
  }
}

main();