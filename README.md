# As Aventuras de Tuiu & Nany

Jogo 2D em pixel art (co-op local) no qual Tuiu e Nany enfrentam zumbis.

## Por que este jogo existe

Este jogo foi desenvolvido para **comemorar os 5 anos de união de mim e minha esposa** — celebramos o dia em que começamos a namorar. Tuiu e Nany são nós dois, sobrevivendo juntos (e comemorando com muita aventura).

## Controles

| Jogador | Mover | Pular       | Confirmar |
| ------- | ----- | ----------- | --------- |
| J1      | ← / → | ↑ ou ESPAÇO | ENTER     |
| J2      | A / D | W           | W         |

- **ESC**: pausa o jogo (menu com continuar/reiniciar/título).
- Na seleção: J1 confirma com ENTER e inicia; J2 confirma com W.
- Em uma partida já iniciada, J2 pode entrar pela tecla **W** ou pelo botão na tela.

## Mecânica

- Pise em cima do zumbi para derrotá-lo; contato lateral tira vida.
- Cada jogador tem 3 corações; ao cair, o jogador reviverá quando **escolher** (pulo do próprio personagem) se ainda houver companheiro em pé.
- Todos os jogadores caídos ao mesmo tempo = fim de jogo.
- A dificuldade aumenta ao longo de cada partida (os zumbis spawnam mais rápido) e a vitória da fase fecha em 20 abates.

## Fases

O jogo é dirigido por um registro de fases (`src/game/levels.ts`), cada uma com sua arte de fundo, visual do chão, meta de abates e curva de dificuldade.

- Na seleção de personagem, após confirmar, o jogo abre a **seleção de cenário** (cards com a miniatura da fase).
- Na vitória, o jogo oferece **PRÓXIMA FASE** (ENTER): a próxima fase é **sorteada** entre os cenários disponíveis, sem repetir a atual. Quando só existe um cenário, não há próxima fase.

Para adicionar uma nova fase:

1. Coloque a arte em `assets/scenes/` (vídeo opcional + imagem de fallback).
2. Adicione um novo `LevelConfig` ao array `LEVELS` em `src/game/levels.ts` (use a fase "Casa" como modelo), informando `id`, `name`, `art`, cores do chão/névoa, `victoryKills` e `difficulty`.
3. Nada mais muda: a `PreloadScene` carrega os assets pelas chaves `bg-<id>`/`bg-<id>-img`, a `LevelSelectScene` lista o cenário automaticamente e a `MainScene` usa a fase da sessão.

## Distribuir

Empacota o app em instaladores/executáveis prontos (os artefatos saem em `dist/`):

```sh
npm run dist:linux   # AppImage + .deb (Linux)
npm run dist:win     # portable .exe (Windows)
```

O Windows pode ser gerado no Linux (o electron-builder cuida do resto); os comandos exigem as ferramentas baixadas na primeira execução.

## Autor

[![João M J Braga](https://github.com/joaomjbraga.png?size=100)](https://github.com/joaomjbraga)

Se você gostou, considere deixar uma ⭐ no repositório!
