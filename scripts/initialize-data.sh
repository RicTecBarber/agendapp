#!/bin/bash

# Executar o script de inicialização usando tsx
echo "Executando script de inicialização de dados..."
npm exec tsx scripts/initialize-data.ts

echo "Processo concluído."