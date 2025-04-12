const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/pages/admin/ClientsPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Substituir a primeira ocorrência
content = content.replace(
  /\/\/ Fechar o dropdown e abrir a página de agendamento\s+const url = `\/admin\/agendamentos\/novo\?cliente=\${encodeURIComponent\(client\.client_name\)}\&telefone=\${encodeURIComponent\(client\.client_phone\)}`;\s+window\.location\.href = url;/,
  `// Fechar o dropdown e abrir a página de agendamento
                                    const baseUrl = \`/admin/agendamentos/novo?cliente=\${encodeURIComponent(client.client_name)}&telefone=\${encodeURIComponent(client.client_phone)}\`;
                                    // Usar getUrlWithTenant para manter o contexto do tenant
                                    const url = getUrlWithTenant(baseUrl);
                                    window.location.href = url;`
);

// Substituir as outras ocorrências
content = content.replace(
  /const url = `\/admin\/agendamentos\/novo\?cliente=\${encodeURIComponent\(selectedClient\.client_name\)}\&telefone=\${encodeURIComponent\(selectedClient\.client_phone\)}`;\s+window\.location\.href = url;/,
  `const baseUrl = \`/admin/agendamentos/novo?cliente=\${encodeURIComponent(selectedClient.client_name)}&telefone=\${encodeURIComponent(selectedClient.client_phone)}\`;
                // Usar getUrlWithTenant para manter o contexto do tenant
                const url = getUrlWithTenant(baseUrl);
                window.location.href = url;`
);

content = content.replace(
  /const url = `\/admin\/agendamentos\/novo\?cliente=\${encodeURIComponent\(newClientData\.name\)}\&telefone=\${encodeURIComponent\(newClientData\.phone\)}`;\s+window\.location\.href = url;/,
  `const baseUrl = \`/admin/agendamentos/novo?cliente=\${encodeURIComponent(newClientData.name)}&telefone=\${encodeURIComponent(newClientData.phone)}\`;
                // Usar getUrlWithTenant para manter o contexto do tenant
                const url = getUrlWithTenant(baseUrl);
                window.location.href = url;`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Arquivo ClientsPage.tsx atualizado com sucesso!');
