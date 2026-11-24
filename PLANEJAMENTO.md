# Planejamento do SEU CARTAZ AGORA

## Atualização 1.1

- Um controle proporcional para todos os componentes do preço principal.
- Duas novas fontes clássicas e sete modelos temáticos.
- Importação de artes em PNG/JPG/JPEG com prévia, orientação, guia de impressão em A4 e preservação das proporções.
- A publicação atualiza os arquivos do projeto. A configuração do Supabase e as variáveis da Netlify são reutilizadas.

- Verificação da versão 1.1: 17 testes automatizados, compilação de produção, sete temas no Chrome, importação PNG/JPG/JPEG, preço proporcional, reabertura e exportação A4. A integração de nuvem foi verificada com PostgreSQL local e endpoints simulados.

## Fase 1 — Núcleo local

Implementada e validada no Windows.

| Frente | Entrega |
| --- | --- |
| Acesso | Login, sessão, criação de administrador e recuperação de senha pelo terminal. |
| Empresas e lojas | Uma empresa por conta administradora, filiais, sessão e banco particionados por empresa. |
| Catálogo | Cadastro, busca, paginação, edição, duplicação, exclusão e seleção em lote. Oferta e catálogo separados, com preços exatos em centavos. |
| Importações | XLS, XLSX e CSV. Prévia, mapeamento, padrões salvos, confirmação de mudança nos preços, erros e reversão condicionada à ausência de edições posteriores. |
| Produção | Oito modelos iniciais e sete sazonais, formatos físicos e digitais, tamanho personalizado, sete dinâmicas e processamento em blocos. |
| Galeria | Grade e lista, zoom, edição por cartaz, tamanhos A− e A+ com repetição, entrada numérica, restauração, cópia de estilo, splashes e aplicação em lote. |
| Fontes e splash | Nove fontes abertas locais, seletor com amostras e favoritos, seis formas vetoriais originais. |
| Arquivos | PDF único, PDFs em ZIP, PNG e JPEG, DPI configurável para formatos físicos e fontes incorporadas aos cartazes em PDF quando compatíveis. |
| Histórico | Snapshots de produtos e preços, reabertura, duplicação, exportações, solicitações de impressão e rascunhos de edição. |

## Fase 2 — Edição e impressão avançadas

- Já disponível: editor de cores, título, fontes e foto, com prévia e versão do modelo. A edição de cartazes também ajusta posição, escala, rotação, cor e opacidade do splash.
- Já disponível: impressão via PDF com escolha da folha, orientação, quantidade de artes por folha, cópias, margem, espaçamento e marcas de corte.
- Pendente: editor livre com campos dinâmicos, drag and drop, camadas, guias, histórico de versões, presets hierárquicos, fontes próprias, importação sanitizada de SVG, biblioteca completa de splashes e sangria.

## Fase 3 — Encartes, imagens e campanhas

- Já disponível: encartes paginados com 1 a 30 ofertas por página, configuração visual por cartão, prévias e exportação. Campanhas com produtos, loja, modelo, datas, status e duplicação. Banco de imagens com upload em lote, busca e associação por EAN ou código.
- Pendente: rearranjo de cartões, destaques e edição gráfica por página, assets de imagem fora do JSON, importação ZIP de imagens e campanhas automatizadas.

## Fase 4 — Comercialização

- Já disponível: isolamento por empresa, contagem de uso por espaço, modo de hospedagem Netlify com Supabase Auth, PostgreSQL com RLS e bucket privado para fotos. O modo SQLite continua disponível para uso local.
- Pendente: perfis e permissões granulares, vários usuários por empresa, superadministrador global, assinatura, teste gratuito, quotas, migração automática de SQLite e recuperação de senha por e-mail na interface do estúdio.

## Fase 5 — Integrações opcionais

- Pendente: OCR, sugestão de layouts e preços, organização assistida e integrações com serviços de imagem autorizados.

## Validação

- Compilação de produção e testes automatizados de moeda, importação, reversão, versão da oferta, efeitos individuais, formatos físicos e isolamento.
- Teste no Chrome com 100 produtos, EAN com zeros à esquerda, acentos, descrição longa e preços de diferentes magnitudes.
- Verificados aplicação de splash a todo o lote, remoção em um cartaz, splash exclusivo da descrição, ajuste de tamanho sem impacto nos outros cartazes e troca de fonte somente nos selecionados.
- Verificados reabertura após salvamento, preservação dos preços, leitura de XLS/CSV, separação dos dados entre empresas e navegação móvel.
- PDF conferido com 100 páginas A4 de 595,276 × 841,890 pontos e inspeção visual. ZIP conferido com 100 PNGs íntegros. As sete fontes locais foram verificadas para letras acentuadas e caracteres comerciais comuns.

- Verificados PNG A4 a 300 DPI (2480 × 3508), duas artes em uma folha A4 paisagem, encarte de nove páginas e backup SQLite.

O material de referência entregue continha apenas o briefing em texto. O splash foi desenhado para o projeto e a biblioteca usa fontes reais com licenças incluídas.

