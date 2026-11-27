# Changelog

Todas as alterações relevantes do **Teglato** são documentadas neste arquivo.

## [0.3.1] - 2026-11-27

### Corrigido
- **Tela branca ao abrir Configurações por duplo clique:** Tornado o comando `open_settings` assíncrono para evitar deadlock de inicialização do WebView2 no Windows ao criar a janela de Configurações a partir do overlay, além de definir cor de fundo escura inicial na janela.

## [0.3.0] - 2026-11-27

### Adicionado
- **Duplo clique no gato** para abrir a janela de Configurações diretamente.
- **Bolinha de lã vermelha** no canto inferior direito do mousepad para fechar o aplicativo, com destaque visual e legenda **Fechar** ao passar o mouse.

### Corrigido e Melhorado
- **Digitação com foco no app:** Teclado agora responde normalmente mesmo quando o gato ou a janela de Configurações estiverem selecionados.
- **Menu da Bandeja simplificado:** Removidos *Pelagem* e *Efeitos Sonoros* do menu oculto da bandeja (mantidos dentro da janela de Configurações).
- **Cauda lisa nos rajados e escaminha:** Cor sólida contrastante nas caudas de *Laranja listrado*, *Rajado marrom*, *Prateado rajado* e *Escaminha* (sem bolinhas clipando na ponta).
- **Escala ancorada:** Ao ajustar o tamanho nas Configurações, a janela cresce do canto inferior direito para o canto superior esquerdo.

## [0.2.1] - 2026-11-27

### Corrigido
- **Ronronar ao acordar:** Corrigido o grafo Web Audio do ronronar (tremolo separado do ganho mestre + parada e desconexão completa dos osciladores ao despertar ou silenciar).
- **Teclas flutuantes mais visíveis:** Aumentados altura de subida, tamanho da mini keycap, contraste e compatibilidade do desenho arredondado em `CanvasRenderingContext2D`.
- **Reset completo:** Substituído "Resetar Posição" por **Reset** (na janela de Configurações e na Bandeja), restaurando todas as configurações padrão (pelagem Tuxedo, escala 100%, áudio desligado, destravado, teclas flutuantes ativadas e posição no canto inferior direito).

## [0.2.0] - 2026-11-27

### Adicionado
- Animação de **teclas flutuantes**: cada tecla pressionada sobe suavemente a partir do mini teclado e desaparece com *fade-out*, com opção de ligar/desligar em **Configurações → Comportamento → Teclas flutuantes** (retrocompatível com `config.json` anteriores).

### Alterado
- Distribuição oficial simplificada para arquivo único portátil **`Teglato.exe`** (sem `.zip`) com publicação automática na Release e botão de download direto de 1 clique no `README.md`.

## [0.1.0] - 2026-11-27

### Adicionado
- Renderização vetorial procedural em HTML5 Canvas 2D (`480x360` lógico) inspirada no **LittleOne (小只)**.
- Todas as **13 pelagens**: *Tuxedo, Orange tabby, Brown tabby, Calico, Siamese, Black, White, Blue gray, Gray & white, Orange & white, Tortoiseshell, Cream* e *Silver*.
- Mini teclado compacto de 63 teclas e mini mouse orientados na perspectiva do gato (180°), com suporte a layouts **ABNT2 / PT-BR**, *numpad* e teclas `F1–F12`.
- Braços fundidos continuamente ao tronco sem recorte nos ombros, piscadas naturais, cauda animada, modo sono (`Zzz`) e despertar chacoalhando a cabeça.
- Uso simultâneo de mouse + teclado mantendo a pata direita no mouse mesmo ao pressionar teclas do lado direito.
- Janela overlay transparente, sem bordas, *always-on-top*, *click-through* dinâmico nas áreas vazias e modo travado total (`Ctrl + Shift + L`).
- Abertura padrão no canto inferior direito acima da barra de tarefas e salvamento automático da posição ao mover e ao fechar.
- Janela separada de configurações (`Ctrl + Shift + ,` ou ícone na Bandeja do Windows) e áudio opcional sintetizado via Web Audio API.
- Servidor local embutido (`http://127.0.0.1:3777/?obs=1`) para **OBS Studio Browser Source** com transparência Alpha nativa e opção Chroma Key.
- Workflows do GitHub Actions para CI e geração de executável portátil único (`Teglato.exe` + `SHA256SUMS.txt`).
