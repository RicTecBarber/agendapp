# Dependências necessárias para o AgendApp Serviços - Admin

Para executar o aplicativo AgendApp Serviços Admin com sucesso, você precisará instalar as seguintes dependências:

## Dependências principais

```bash
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context axios @react-native-async-storage/async-storage
```

## UI e componentes

```bash
npm install react-native-paper react-native-vector-icons
```

## Visualização de dados e gráficos

```bash
npm install react-native-svg
```

## Data formatting e manipulação

```bash
npm install date-fns date-fns-tz
```

## Internacionalização

```bash
npm install i18n-js
```

## Configuração adicional

Em alguns casos, você pode precisar executar:

```bash
npx expo install react-native-gesture-handler
```

Para iOS, após a instalação das dependências, você precisará executar:

```bash
npx pod-install ios
```

## Executando o aplicativo

Para iniciar o aplicativo em modo de desenvolvimento:

```bash
npx expo start
```

Para executar no Android:

```bash
npx expo start --android
```

Para executar no iOS:

```bash
npx expo start --ios
```

## Configuração do Ambiente de Desenvolvimento

Para evitar problemas com SVG e outros componentes, adicione no arquivo `babel.config.js`:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Adicione os plugins que você precisa aqui
    ],
  };
};
```