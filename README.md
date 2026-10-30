# BWD2Editor

Editor de personagens **offline** para o servidor **BlackWolf** (Diablo II: Lord of Destruction 1.14 com o mod BlackWolf). Ele roda inteiro no navegador: o save é lido e gravado no seu computador e nunca é enviado para lugar nenhum.

Feito para testar builds sem precisar upar vários personagens a cada ladder.

> ⚠️ **Faça backup do seu `.d2s` antes de sobrescrevê-lo.** O editor funciona apenas com personagens **offline** (pasta `Save/` do jogo). Personagens do realm não são editáveis.

## O que dá para editar

- Atributos, pontos livres, ouro e nível (tabela de experiência do mod, até o nível 100)
- Skills de todas as classes, incluindo as skills do BlackWolf
- Itens: raridade, prefixo/sufixo, nomes de rare, únicos e sets do mod, base, defesa, sockets, ethereal e stats
- Criar itens a partir das bases do mod (inclusive anéis, amuletos, charms e joias)
- Inventário, baú e cubo com os tamanhos do BlackWolf
- Equipamento completo do mercenário (incluindo anéis, amuleto, cinto, botas e luvas), com arrastar e soltar
- Runewords, incluindo as corrompidas
- Quests e waypoints

## Como usar

1. Abra o site do editor (GitHub Pages deste repositório).
2. Clique em **Browse** e escolha o seu `.d2s`, que fica na pasta `Save/` do jogo.
3. Edite e clique em **Save D2**. Depois substitua o arquivo na pasta `Save/`, sempre com backup.

### Sobre as imagens dos itens
O site **não contém arte da Blizzard**. Os itens próprios do BlackWolf aparecem com a imagem do mod. Os demais itens aparecem como blocos com o nome e a cor da raridade, mas funcionam normalmente (arrastar, editar, tooltip).

## Desenvolvimento

Estrutura (monorepo):

| Pasta | O que é |
|---|---|
| `packages/d2s` | Leitor/gravador de saves (fork de [dschu012/d2s](https://github.com/dschu012/d2s)) |
| `packages/d2s-editor` | Interface web em Vue 3 (fork de [dschu012/d2s-editor](https://github.com/dschu012/d2s-editor)) |
| `packages/bw-data` | Gera os dados do editor a partir dos arquivos do mod |
| `tools/` | Scripts de extração, build e testes (`tools/e2e`) |

### Rodar localmente
Requer Node 22+ e npm.

```bash
# compila o d2s e copia o bundle para o editor
cd packages/d2s && npm ci --ignore-scripts && npx tsc
NODE_OPTIONS=--openssl-legacy-provider npx webpack --config webpack.bw.config.js
cp dist/d2s.bundle.min.js ../d2s-editor/public/d2/

# sobe o editor
cd ../d2s-editor && npm ci --ignore-scripts
npx vue-cli-service serve --skip-plugins @vue/cli-plugin-eslint
```

### Atualizar os dados do mod (novo ladder ou patch)
Requer uma instalação do jogo com o mod e um extrator de MPQ baseado no StormLib (os scripts usam o `mpq_extractor`, em Python).

1. Extraia as tabelas e as imagens: `tools/extract_mpq.py` e `tools/extract_gfx.py`.
2. Rode `tools/build_editor_data.sh <versão>`.
3. Faça commit de `packages/d2s-editor/public/d2/constants_bw.bundle.js` e `packages/d2s-editor/public/items/`.

Com os arquivos do jogo extraídos localmente, o editor local também mostra a arte original dos itens. Esses arquivos ficam no `.gitignore` e **nunca** são publicados. Para ver localmente como fica o site publicado, abra com `?gfx=published`.

### Deploy
A cada push na `main`, o GitHub Actions (`.github/workflows/pages.yml`) compila o d2s, roda os testes, compila o editor, verifica que nenhum arquivo do jogo entrou no build e publica no GitHub Pages.

## Créditos e licenças

- [dschu012/d2s](https://github.com/dschu012/d2s) (ISC) e [dschu012/d2s-editor](https://github.com/dschu012/d2s-editor) (MIT), base deste projeto. As licenças originais estão nas respectivas pastas em `packages/`.
- Estruturas de dados de referência: [D2MOO](https://github.com/ThePhrozenKeep/D2MOO).
- Publicado com autorização da administração do BlackWolf.

Diablo® é marca registrada da Blizzard Entertainment. Este projeto não tem afiliação com a Blizzard e não distribui arquivos ou arte do jogo.
