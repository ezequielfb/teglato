# Teglato

Um gatinho reativo de área de trabalho inspirado no **LittleOne (小只)** — leve, 100% vetorial, com janela transparente sempre no topo (*always-on-top*), interface completamente limpa e integração nativa com **OBS Studio**.

> [!NOTE]
> **Status do Projeto:** Implementado (`v0.1.0`). Frontend (Canvas 2D + 13 pelagens + janela separada de configurações + áudio sintetizado + testes unitários) e backend nativo em Rust/Tauri v2 (hook global, bandeja do sistema, atalhos globais e servidor OBS) concluídos e verificados por testes automatizados.

---

## Principais Funcionalidades

- **Arte 100% Vetorial Procedural (Canvas 2D):** Visual fiel ao original, com proporções limpas, cauda fluida, inclinação sutil da cabeça/olhos e cinemática inversa 2D suave nas patas para alcançar cada tecla com naturalidade a 60 FPS — sem depender de dezenas de *sprites* pesados.
- **13 Pelagens Incluídas:** Troca instantânea entre todas as pelagens clássicas já liberadas desde o início:
  `Tuxedo` (Frajola), `Orange tabby`, `Brown tabby`, `Calico`, `Siamese`, `Black`, `White`, `Blue gray`, `Gray & white`, `Orange & white`, `Tortoiseshell`, `Cream` e `Silver`.
- **Sincronia em Tempo Real de Teclado e Mouse:**
  - Cada tecla física pressionada acende e abaixa na tecla exata do mini teclado em perspectiva, enquanto a pata correspondente (esquerda ou direita) estica até aquela coordenada.
  - Teclados em outros layouts (como **ABNT2 / PT-BR**) e *numpads* são mapeados automaticamente para a tecla física equivalente na grade compacta original de 5 fileiras (63 teclas), garantindo que nenhuma tecla fique sem resposta.
  - Suporte completo a **uso simultâneo** de mouse + teclado (uma pata segura e desliza o mini mouse enquanto a outra digita normalmente).
- **Ciclo de Vida, Sono e Despertar:** Piscadas naturais em intervalos aleatórios, balanço contínuo da cauda, modo sono após inatividade (olhos fechados, cauda apoiada na mesa e partículas `"Zzz"`) e animação de chacoalhar a cabeça ao acordar com o primeiro toque.
- **Overlay Limpo Sempre no Topo:** Janela sem bordas (`frameless`), fundo transparente real e *Always on Top* sobre outros aplicativos e jogos em modo janela/borderless. Possui *click-through* automático nas áreas transparentes e modo **Travar Posição** (*click-through* total sobre o gato inteiro). Zero botões, barras ou menus sobre a janela do pet.
- **Configurações Discretas:** Uma janela de configurações separada abre exclusivamente pelo ícone na **Bandeja do Sistema (System Tray)** ou por atalhos globais:
  - `Ctrl + Shift + ,` — Abrir / fechar a janela de configurações.
  - `Ctrl + Shift + L` — Travar / destravar posição da janela do gato (*click-through* total).
- **Integração Nativa com OBS Studio:** Servidor local embutido (`http://127.0.0.1:3777/?obs=1`) para adicionar como **Fonte de Navegador (*Browser Source*)** no OBS com canal Alpha 100% transparente e nítido, independente da posição do gato na sua tela (além de opção de fundo *Chroma Key* como alternativa).
- **Efeitos Sonoros Opcionais:** Motor de áudio sintetizado via Web Audio API (cliques suaves de teclado, clique de mouse e ronronar leve ao dormir), sem arquivos externos e com controle de volume e *mute*.
- **Privacidade por Padrão:** O hook global lê apenas o código físico da tecla (*keycode*) e a posição relativa do cursor para animar as patas. Nenhum texto digitado, senha ou dado pessoal é armazenado ou enviado pela rede.

---

## Por que Tauri v2 (Rust + TypeScript)?

Como o objetivo principal do **Teglato** é gerar um executável leve ("baixou, rodou") para qualquer pessoa — inclusive usuários leigos — mantendo baixo consumo em segundo plano e alta facilidade de modificação para contribuidores, a arquitetura adotada é **Tauri v2** (núcleo nativo em **Rust** + interface e renderização em **TypeScript / HTML5 Canvas 2D**).

| Critério | Tauri v2 (Rust + TS) | Electron (Node + Chromium) | C# / .NET (WPF / WinUI) | Godot Engine |
| :--- | :--- | :--- | :--- | :--- |
| **Tamanho final para baixar** | Leve (binário nativo + WebView2) | ~120+ MB | ~65–80 MB (self-contained) | ~40–70 MB |
| **Consumo de RAM em uso** | ~35–60 MB | ~180–300 MB | ~50–90 MB | ~80–140 MB |
| **Pré-requisitos no Windows 10/11** | Zero (WebView2 já vem nativo) | Zero | Zero (se empacotado) | Zero |
| **Reúso direto no OBS (Browser Source)** | 100% (mesmo código Canvas 2D) | 100% (mesmo código Canvas 2D) | Exige reescrever cena em Web | Exige export Web separado |
| **Multiplataforma** | Windows, macOS e Linux | Windows, macOS e Linux | Foco em Windows | Windows, macOS e Linux |
| **Facilidade para contribuidores** | Alta (90% do projeto em TS/Canvas) | Alta | Média (C# + XAML) | Média (GDScript + cenas binárias) |

---

## Arquitetura e Estrutura do Repositório

### Fluxo de Dados

```mermaid
flowchart LR
    OS["Teclado e Mouse Globais do Sistema"] --> Hook["Nucleo Rust (Global Input Hook)"]
    Hook --> Overlay["Janela Overlay (Limpa, Transparente, Always-on-Top)"]
    Hook --> WS["Servidor Local HTTP e WebSocket (127.0.0.1:3777)"]
    WS --> OBS["OBS Studio (Browser Source com Alpha Puro)"]
    Tray["Bandeja do Sistema ou Atalho Global"] --> Settings["Janela de Configuracoes Separada"]
    Settings --> Overlay
    Settings --> WS
```

### Estrutura de Pastas

```text
teglato/
├── .github/workflows/
│   └── release.yml              # Build e release automatizados no Windows via GitHub Actions
├── package.json                 # Dependências do frontend e scripts de build/teste
├── tsconfig.json                # Configuração estrita do TypeScript
├── vite.config.ts               # Build multi-página (overlay.html + settings.html)
├── vitest.config.ts             # Configuração da suíte de testes unitários
├── scripts/
│   └── generate-icons.mjs       # Gerador de ícones PNG/ICO sem dependências externas
├── tests/                       # Testes unitários (keyMap, 13 pelagens e CatStateMachine)
├── src/                         # Frontend TypeScript + Canvas 2D
│   ├── shared/
│   │   ├── types.ts             # Tipos compartilhados (AppConfig, InputEvent, CoatId)
│   │   └── keyMap.ts            # Grade compacta de 63 teclas + fallbacks ABNT2/numpad
│   └── renderer/
│       ├── overlay.html         # Cena 100% limpa (Desktop Overlay e OBS Browser Source)
│       ├── overlay.ts           # Loop 60 FPS, máquina de estados e ponte Tauri / WebSocket
│       ├── settings.html        # Janela separada de configurações (Tray / Atalho)
│       ├── settings.ts          # Seletor das 13 pelagens, escala, áudio, OBS e atalhos
│       ├── state.ts             # Máquina de estados pura (patas, mouse, piscada e sono)
│       ├── styles/
│       │   ├── overlay.css      # Estilos limpos com fundo transparente
│       │   └── settings.css     # Tema escuro da janela de configurações
│       ├── audio/
│       │   └── soundEngine.ts   # Síntese Web Audio API opcional (teclas, mouse, ronronar)
│       └── rig/
│           ├── coats.ts         # Definições visuais das 13 pelagens
│           ├── deskRenderer.ts  # Desk mat, mini mouse móvel e teclado em perspectiva
│           ├── catRenderer.ts   # Corpo, cabeça, olhos, cauda e patas com IK suave
│           └── particles.ts     # Partículas "Zzz" do modo sono
└── src-tauri/                   # Camada nativa em Rust (Tauri v2)
    ├── Cargo.toml               # Crates nativas (tauri, axum, rust-embed, arboard, windows)
    ├── build.rs                 # Script de build Tauri
    ├── tauri.conf.json          # Permissões, janela transparente e empacotamento NSIS/MSI
    ├── capabilities/
    │   └── default.json         # Permissões granulares para overlay e settings
    ├── icons/                   # Ícones 32x32, 128x128, 256x256 e icon.ico
    └── src/
        ├── main.rs              # Ponto de entrada do executável Windows
        ├── lib.rs               # Gerenciamento das janelas Overlay/Settings e atalhos
        ├── input_hook.rs        # Hook global Win32 (WH_KEYBOARD_LL/WH_MOUSE_LL) + click-through
        ├── obs_server.rs        # Servidor HTTP + WebSocket local embutido (127.0.0.1:3777)
        ├── store.rs             # Persistência local e sanitização de config.json
        └── tray.rs              # Ícone na bandeja do sistema e menu rápido
```

---

## Como Usar (Usuário Final)

1. **Baixar e Executar:** Baixe o executável ou instalador na página de *Releases* e abra normalmente — não exige instalação de runtimes extras no Windows 10/11.
2. **Posicionar e Travar:** Arraste o gato para o canto desejado da tela. Use `Ctrl + Shift + L` (ou o menu na Bandeja do Sistema) para travar a posição e ativar o *click-through* total sobre ele.
3. **Abrir Configurações:** Clique no ícone do **Teglato** perto do relógio do Windows (*System Tray*) ou pressione `Ctrl + Shift + ,` para trocar entre as 13 pelagens, ajustar escala, tempo de sono e áudio.
4. **Usar no OBS Studio (Transparência Perfeita):**
   - No OBS, clique em **+ (Adicionar Fonte)** → **Navegador (*Browser Source*)**.
   - Informe a URL `http://127.0.0.1:3777/?obs=1`.
   - O fundo já entra 100% transparente por canal Alpha, sem precisar configurar *Chroma Key*.

---

## Desenvolvimento, Testes e Build (Contribuidores)

### Pré-requisitos

- **Node.js** (v20+ recomendado) e **npm**.
- **Rust** (`rustup` / `cargo`).
- **Para gerar os instaladores oficiais MSVC no Windows (`.exe` / `.msi` / NSIS):** **Microsoft Visual Studio 2022 C++ Build Tools** (workload *Desenvolvimento para desktop com C++*). Você pode instalá-lo em um PowerShell aberto **como Administrador**:

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" --accept-source-agreements --accept-package-agreements
```

### Pré-visualização Rápida no Navegador

Você pode testar toda a animação do gato, teclado, mouse, pelagens e configurações direto no navegador (sem precisar compilar o Rust):

```bash
npm install
npm run dev
```

- Cena do gato: `http://127.0.0.1:1420/overlay.html`
- Tela de configurações: `http://127.0.0.1:1420/settings.html`

### Testes Automatizados e Verificação

```bash
# Testes unitários do frontend (keyMap, 13 pelagens e máquina de estados)
npm test

# Verificação estrita de tipos TypeScript
npm run typecheck

# Build de produção do frontend (gera dist/)
npm run build

# Testes unitários do backend Rust (mapeamento Win32 VK e persistência)
cd src-tauri && cargo test
```

### Build do Executável Final e Instaladores

```bash
# Gera o binário nativo e instaladores NSIS/MSI (requer MSVC C++ Build Tools no Windows)
npm run tauri build
```

> [!TIP]
> Também há um workflow pronto em [release.yml](file:///d:/teglato/.github/workflows/release.yml) para compilar e publicar os instaladores Windows automaticamente no **GitHub Actions** ao enviar uma tag `v*` (ex.: `git tag v0.1.0 && git push origin v0.1.0`).

### Guia Rápido de Manutenibilidade

Quem quiser customizar ou estender o **Teglato** raramente precisará alterar código Rust:

- **Adicionar novas pelagens:** Edite apenas `src/renderer/rig/coats.ts` (e o tipo `CoatId` em `src/shared/types.ts`).
- **Ajustar proporções, expressões ou animações:** Edite `src/renderer/rig/catRenderer.ts`, `src/renderer/state.ts` e `src/renderer/rig/particles.ts`.
- **Modificar teclado, mouse ou mesa:** Edite `src/renderer/rig/deskRenderer.ts` e `src/shared/keyMap.ts`.
- **Alterar efeitos sonoros:** Edite `src/renderer/audio/soundEngine.ts`.
- **Alterar a tela de configurações:** Edite `src/renderer/settings.html`, `src/renderer/settings.ts` e `src/renderer/styles/settings.css`.

---

## Roadmap

- [x] Definição de escopo, arquitetura (**Tauri v2**) e documentação inicial (`README.md`)
- [x] **Fase 1:** Estrutura base Tauri v2, ícones, CI e janela overlay transparente *always-on-top*
- [x] **Fase 2:** Hook global Win32 em Rust + *click-through* dinâmico + servidor HTTP/WebSocket local para OBS Studio (`127.0.0.1:3777`)
- [x] **Fase 3:** Rig vetorial fiel ao *LittleOne* (mesa, mouse, teclado compacto de 63 teclas, patas com IK suave, 13 pelagens, sono e despertar)
- [x] **Fase 4:** Janela de configurações separada (Tray / Atalho) e motor de áudio sintetizado opcional
- [x] **Fase 5:** Testes unitários (TypeScript + Rust), build de verificação e documentação final (`v0.1.0`)
