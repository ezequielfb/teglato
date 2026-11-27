# Contribuindo com o Teglato

Obrigado pelo interesse em melhorar ou personalizar o **Teglato**! A arquitetura foi organizada para que quase qualquer ajuste visual, de animação ou de áudio possa ser feito diretamente em **TypeScript**, sem precisar mexer em Rust.

---

## 1. Pré-visualização Rápida no Navegador (Sem Rust)

Se você quer apenas ajustar o desenho do gato, pelagens, teclado, sons ou a tela de configurações:

```bash
npm install
npm run dev
```

Depois abra no navegador:
- Cena do gato: `http://127.0.0.1:1420/overlay.html`
- Tela de configurações: `http://127.0.0.1:1420/settings.html`

No modo navegador, o Canvas já responde diretamente ao seu teclado e mouse para iterar com *hot-reload* instantâneo.

---

## 2. Onde Fica Cada Coisa

| O que você quer alterar | Arquivo(s) |
| :--- | :--- |
| **Adicionar ou editar pelagens** | `src/renderer/rig/coats.ts`, `src/shared/types.ts`, `src-tauri/src/store.rs`, `src-tauri/src/tray.rs` |
| **Proporções do gato, olhos, cauda ou patas** | `src/renderer/rig/catRenderer.ts` |
| **Mesa, mouse ou mini teclado em perspectiva** | `src/renderer/rig/deskRenderer.ts` e `src/shared/keyMap.ts` |
| **Lógica de digitação, mouse, piscada e sono** | `src/renderer/state.ts` |
| **Partículas "Zzz" do modo sono** | `src/renderer/rig/particles.ts` |
| **Efeitos sonoros sintetizados** | `src/renderer/audio/soundEngine.ts` |
| **Janela de configurações** | `src/renderer/settings.html`, `src/renderer/settings.ts`, `src/renderer/styles/settings.css` |
| **Hook global, bandeja, atalhos e servidor OBS** | `src-tauri/src/` |

---

## 3. Como Adicionar uma Nova Pelagem em 5 Minutos

1. Adicione o novo ID em `CoatId` no arquivo [src/shared/types.ts](src/shared/types.ts).
2. Adicione a paleta e padrão em `COATS` no arquivo [src/renderer/rig/coats.ts](src/renderer/rig/coats.ts).
3. Registre o mesmo ID em `VALID_COATS` em [src-tauri/src/store.rs](src-tauri/src/store.rs).
4. Atualize a contagem esperada em [tests/coats.test.ts](tests/coats.test.ts) e rode `npm test`.

---

## 4. Verificação Antes de Abrir Pull Request

Antes de enviar suas alterações, garanta que toda a suíte passe sem erros:

```bash
npm test
npm run typecheck
npm run build
cd src-tauri && cargo test --features custom-protocol
```

Para build completo no Windows (`npm run build:portable`), é necessário ter o **Rust** e o **Visual Studio 2022 C++ Build Tools** (workload *Desktop development with C++*) instalados.

---

## 5. Padrão de Commits

Utilizamos prefixos semânticos curtos em português:
- `feat:` nova funcionalidade
- `fix:` correção de bug ou ajuste visual
- `docs:` documentação
- `build:` scripts de empacotamento, Cargo ou CI
- `test:` criação ou atualização de testes
