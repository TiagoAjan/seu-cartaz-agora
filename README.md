# SEU CARTAZ AGORA

**Crie. Personalize. Imprima.**

Para implantar na Netlify com Supabase Auth, PostgreSQL e Storage, siga [PUBLICAR.md](PUBLICAR.md). As instruções de instalação abaixo usam SQLite no Windows.

Estúdio de ofertas em português para importar produtos, criar cartazes em lote, ajustar cada arte e exportar para impressão ou mídias digitais. O painel começa com o catálogo vazio. Os cartazes exibidos na biblioteca são amostras dos modelos.

## Instalação no Windows

Requisitos: Node.js 22.16 ou mais recente com `node:sqlite`, npm e um navegador atual. Use PowerShell na pasta deste projeto. Se a política do PowerShell bloquear o atalho `npm`, use `npm.cmd`.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run admin
npm.cmd run dev
```

Abra [o estúdio local](http://127.0.0.1:3000) e escolha **Entrar**. Digite o e-mail do administrador e a senha informada no terminal. O cadastro exige pelo menos 12 caracteres. Cada execução do comando de cadastro com um e-mail novo cria outra empresa isolada. Cadastre filiais em **Empresas e lojas**.

Para recuperar o acesso, um operador com acesso ao terminal pode redefinir a senha e revogar as sessões da conta.

```powershell
npm.cmd run admin -- --reset
```

## Fluxo de cartazes

1. Cadastre produtos ou envie uma planilha XLS, XLSX ou CSV. Confira a associação de colunas e a prévia. Para preservar zeros à esquerda no Excel, grave a coluna de EAN como texto ou aplique uma máscara numérica com os zeros desejados.
2. Escolha a loja, os produtos, o modelo, a dinâmica e o formato em **Criar cartazes**. Você também pode iniciar pelo botão de uma importação, que já seleciona seus produtos.
3. Gere as prévias. Use **A−** e **A+** ou digite o tamanho para ajustar um campo. A galeria oferece seleção, estilos em lote, opções de splash e edição ampliada por cartaz. O ícone de alerta indica estouro de texto.
4. Clique em **Salvar ajustes** para persistir as mudanças no banco. A galeria guarda um rascunho por aba para facilitar a recuperação da edição antes do salvamento.
5. Exporte um arquivo individual ou o lote. Um PDF reúne as páginas nas dimensões físicas do formato. PNG e JPEG com várias páginas são empacotados em ZIP. Use **PDFs em ZIP** para obter arquivos PDF separados. Nos PDFs de cartazes as fontes locais são incorporadas quando compatíveis. Selecione 300 DPI para dimensões em milímetros ou centímetros quando necessário. Nos formatos digitais, são preservadas as dimensões em pixels.
6. **Imprimir** abre a prévia em PDF. Escolha a folha, o número de artes por folha, as cópias, as margens e as marcas de corte. Use a opção de impressão no visualizador e escolha tamanho real quando a arte exigir as medidas exatas. A solicitação aparece no histórico.

**Encartes** distribui as ofertas escolhidas em páginas e permite exportar o conjunto ou páginas individuais. Em **Histórico de lotes**, reabra ou duplique um lote com seu conteúdo e estilo registrados.

## Dependências e dados

- Next.js App Router, React e Lucide para a interface.
- SQLite e migração `db/001-initial.sql` para empresas, sessões e coleções do estúdio. O banco é inicializado na primeira conexão. O servidor determina a empresa pela sessão, aplica a chave do locatário em todas as operações e usa versões para evitar perda de dados por edições concorrentes.
- Senhas usam scrypt com salt individual. Os tokens de sessão expiram, são gravados como hashes no banco e enviados em cookies HttpOnly.
- Preços são armazenados em centavos inteiros. Produtos, ofertas e lotes têm registros separados. Os lotes guardam o preço e a arte usados na geração.
- O SheetJS 0.20.3 é servido localmente para leitura de planilhas. Sua licença está em `public/vendor`. jsPDF e JSZip geram arquivos no navegador a partir do mesmo modelo gráfico usado na prévia. As licenças das fontes abertas acompanham os TTF em `public/fonts`.
- A tela usa BRL, português brasileiro e America/Fortaleza.

| Variável | Uso |
| --- | --- |
| `CARTAZ_DB` | Caminho do arquivo SQLite. Padrão `./data/cartazes.sqlite`. |
| `CARTAZ_SECURE_COOKIE` | Use `true` quando a origem pública usar HTTPS. |
| `CARTAZ_ORIGIN` | Origem HTTPS completa quando houver proxy reverso. Inclua esquema e host, sem barra final. |

## Publicação e backup

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run start
```

Para uma implantação remota de instância única, execute em um host Node com volume persistente para o SQLite. Sirva por HTTPS e defina a origem pública. O script `start` usa loopback para um proxy na mesma máquina. Quando o host exigir outra interface, use `npx next start --hostname 0.0.0.0` no ambiente desse host. Inclua `db`, `public` e as dependências no deploy. O armazenamento atual pressupõe uma instância com acesso exclusivo de administração ao arquivo SQLite.

Para um backup consistente, encerre o processo, use o comando abaixo e guarde a cópia fora do volume da aplicação. O arquivo inclui contas, histórico e imagens. Em um teste de restauração isolado, aponte `CARTAZ_DB` para a cópia antes de iniciar.

```powershell
npm.cmd run backup -- ./backups/cartazes.sqlite
```

Rode `npm.cmd test` após alterações no modelo, no banco ou na importação. Atualize dependências após revisar suas notas de versão. Consulte [PLANEJAMENTO.md](PLANEJAMENTO.md) para a lista de capacidades existentes e pendências.

