# ODONTOFORENSE Mobile

Aplicativo React Native para gerenciamento de casos forenses odontológicos. Permite login, visualização e edição de casos, registro de evidências com imagem, geração de relatórios e laudos, e administração de usuários.

## Funcionalidades

- **Login**: Autenticação de usuários com e-mail e senha.
- **Dashboard**: Visualização de gráficos e estatísticas dos casos, usuários e evidências.
- **Casos**: Cadastro, edição, visualização e exclusão de casos forenses, incluindo dados de vítimas.
- **Evidências**: Upload de imagens com descrição, por caso.
- **Relatórios e Laudos**: Geração de relatórios e laudos técnicos com opção de exportação em PDF.
- **Cadastro de Usuários**: Apenas administradores podem acessar. Permite gerenciar os usuários da plataforma.

## Tecnologias Utilizadas

- **React Native** com Expo
- **Axios** para chamadas HTTP
- **AsyncStorage** para persistência de token
- **React Navigation** para navegação entre telas
- **react-native-chart-kit** para gráficos
- **expo-print** e **expo-sharing** para geração e compartilhamento de PDF
- **expo-image-picker** para upload de imagens

## Instalação

```bash
git clone https://github.com/seuusuario/odontoforense-app.git
cd odontoforense-app
npm install
npm start
```

## Backend

O aplicativo se conecta à API disponível em:  
`https://odontoforense-backend.onrender.com/api/`

## Usuários para Teste

- **Administrador**  
  Email: vinicius.santos@gmail.com  
  Senha: vsantos123

- **Perito**  
  Email: samuel.mendes@gmail.com  
  Senha: smendes123

- **Assistente**  
  Email: eduarda.oliveira@gmail.com  
  Senha: eoliveira123

## Estrutura de Telas

- `LoginScreen.js`
- `DashboardScreen.js`
- `CasosScreen.js`
- `EvidenciasScreen.js`
- `RelatorioScreen.js`
- `CadastroScreen.js`
- `App.js` (estrutura principal de navegação)

## Observações

- Usuários têm permissões específicas conforme o tipo (administrador, perito, assistente).
- Relatórios e laudos são gerados via IA e exportados como PDF.

---

© 2025 ODONTOFORENSE