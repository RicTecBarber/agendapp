# Sistema de Migrações Seguras para AgendApp

Este diretório contém os arquivos de migração do banco de dados para o sistema AgendApp. As migrações são mecanismos seguros para atualizar o esquema do banco de dados sem perder os dados existentes.

## Por que migrações são importantes?

- **Preservam os dados dos clientes**: As migrações atualizam apenas a estrutura do banco, mantendo todos os dados intactos
- **Permitem atualizações incrementais**: Você pode adicionar novos recursos sem afetar o que já existe
- **Fornecem controle de versão**: Cada alteração no banco é versionada e documentada
- **Facilitam rollbacks**: Em caso de problemas, você pode reverter para uma versão anterior

## Processo de Migração

### 1. Desenvolvimento

Durante o desenvolvimento, você deve:

1. Modificar os modelos em `shared/schema.ts` conforme necessário
2. Gerar uma migração com `tsx server/generate-migration.ts nome-da-migracao`
3. Revisar os arquivos SQL gerados na pasta `migrations/`
4. Testar a migração em ambiente de desenvolvimento

### 2. Deploy em Produção

Para atualizar o banco em produção com segurança:

1. **Backup**: Um backup automático é feito antes da migração
2. **Verificação**: O sistema verifica o estado do banco antes de prosseguir
3. **Migração**: As alterações são aplicadas de forma incremental
4. **Validação**: O sistema verifica se a migração foi bem sucedida

## Comandos Importantes

```bash
# Gerar arquivos de migração a partir do esquema atual
tsx server/generate-migration.ts nome-da-migracao

# Aplicar migrações pendentes ao banco de dados
tsx server/migrate.ts

# Criar backup do banco de dados
tsx server/backup.ts
```

## Boas Práticas

1. **Sempre faça backup antes de migrações em produção**
2. **Nunca modifique manualmente os arquivos SQL gerados** (a menos que saiba exatamente o que está fazendo)
3. **Teste todas as migrações em ambiente de desenvolvimento antes de aplicar em produção**
4. **Mantenha o controle de versão dos arquivos de migração** junto com o código do projeto

## Estrutura dos Arquivos de Migração

Cada migração consiste em:

- Arquivo SQL para aplicar a mudança (`migrate.sql`)
- Arquivo SQL para desfazer a mudança (`revert.sql`)
- Arquivo de metadados (`meta.json`)

Os nomes dos arquivos incluem timestamp para garantir a ordem correta de aplicação.

## Solução de Problemas

Se encontrar problemas durante a migração:

1. Verifique os logs em detalhes (`server/migrate.ts` gera logs detalhados)
2. Restaure o backup mais recente se necessário
3. Corrija os problemas no esquema e gere uma nova migração
4. Tente novamente