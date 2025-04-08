# AgendApp Serviços - Admin

Aplicativo móvel de administração para o sistema AgendApp Serviços, desenvolvido com React Native e Expo.

## Visão Geral

O AgendApp Serviços é um aplicativo móvel projetado para proprietários e administradores de diversos estabelecimentos de serviços (como salões de beleza, barbearias, clínicas, consultórios e outros negócios baseados em agendamento) que precisam gerenciar agendamentos, profissionais e serviços de forma eficiente, mesmo quando estão fora do estabelecimento.

## Funcionalidades Principais

- **Login seguro**: Autenticação para acesso ao sistema administrativo
- **Dashboard**: Visualização rápida das estatísticas principais do negócio
- **Gerenciamento de Agendamentos**: Visualizar, criar, confirmar, concluir ou cancelar agendamentos
- **Relatórios e Análises Avançadas**: Visualização de dados detalhados e métricas de desempenho
- **Gerenciamento de Profissionais**: Adicionar, editar ou remover profissionais
- **Gerenciamento de Serviços**: Adicionar, editar ou remover serviços oferecidos
- **Notificações**: Receber alertas sobre novos agendamentos ou alterações

## Estrutura do Projeto

```
├── src/                  # Código-fonte do aplicativo
│   ├── components/       # Componentes reutilizáveis
│   ├── contexts/         # Contextos React (Auth, Theme, etc.)
│   ├── hooks/            # Hooks personalizados
│   ├── navigation/       # Configuração de navegação
│   ├── screens/          # Telas do aplicativo
│   ├── services/         # Serviços de API e integração
│   ├── styles/           # Estilos e temas
│   └── utils/            # Funções utilitárias
├── App.tsx               # Componente principal do aplicativo
├── app.json              # Configuração do Expo
└── package.json          # Dependências do projeto
```

## Telas Implementadas

1. **LoginScreen**: Tela de autenticação para administradores
2. **DashboardScreen**: Tela inicial com resumo das estatísticas e acesso rápido
3. **AppointmentsScreen**: Listagem e gerenciamento de agendamentos
4. **ReportsHomeScreen**: Central de relatórios e análises com visão geral de métricas
5. **ProfessionalPerformanceScreen**: Análise detalhada de desempenho de profissionais

## Telas a serem implementadas (próximas etapas)

1. **ProfessionalsScreen**: Gerenciamento de profissionais/prestadores de serviços
2. **ServicesScreen**: Gerenciamento de serviços oferecidos
3. **SettingsScreen**: Configurações do aplicativo e do estabelecimento
4. **ClientsScreen**: Gerenciamento de clientes e sistema de fidelidade
5. **ClientAnalyticsScreen**: Análises detalhadas sobre comportamento e preferências de clientes
6. **ForecastReportScreen**: Previsões e tendências de agendamentos
7. **LoyaltyReportScreen**: Análise do programa de fidelidade

## Integração com o Backend

O aplicativo se integra com a API REST do AgendApp Serviços para:

- Autenticação de usuários
- Obtenção e manipulação de dados (agendamentos, profissionais, serviços)
- Sincronização em tempo real de informações importantes

## Conexão com a API

A conexão com a API é realizada através do arquivo `src/services/api.ts`, que configura o cliente Axios para comunicação com o backend. Por padrão, a API é configurada para se conectar ao servidor em `http://localhost:5000/api`.

Em um ambiente de produção, você precisará substituir esta URL pelo endereço real da sua API.

## Instalação

Veja o arquivo `dependencies.md` para a lista completa de dependências necessárias para executar o aplicativo.