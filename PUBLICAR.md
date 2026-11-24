# Publicar o SEU CARTAZ AGORA na Netlify

Você precisa de um projeto no Supabase e de um repositório Git que possa conectar à Netlify. O ZIP contém o código-fonte completo. Extraia e coloque o **conteúdo da pasta do projeto** na raiz do repositório, onde estão `package.json` e `netlify.toml`.

## 1. Preparar o Supabase

1. No painel do Supabase, crie um projeto. Deixe a Data API habilitada.
2. Em **SQL Editor**, crie uma consulta, cole [a migração](supabase/migrations/20261124000100_workspace.sql) e execute uma vez. Ela cria as tabelas do estúdio, as políticas RLS e o bucket privado `sca-assets`.
3. Em **Authentication → Users**, adicione um usuário com e-mail e senha. Use uma senha de pelo menos 12 caracteres e confirme o e-mail na criação para que a conta possa entrar imediatamente. Para um estúdio por convite, desabilite novos cadastros públicos no projeto.
4. Abra [o SQL de criação da empresa](supabase/criar-empresa.sql). Substitua `SEU_EMAIL` pelo e-mail cadastrado e `NOME_DA_EMPRESA` pelo nome desejado. Execute no **SQL Editor**. Para provisionar outra empresa, crie outro usuário e repita esta etapa com o novo e-mail.
5. Copie a **Project URL** e a **Publishable key**. O painel **Connect** contém esses valores. Uma chave `anon` legada também é aceita.

[Acesso e chaves no Supabase](https://supabase.com/docs/guides/getting-started/api-keys) · [Gerenciar usuários](https://supabase.com/docs/guides/auth/users)

## 2. Configurar a Netlify

1. Em **Add new project → Import an existing project**, escolha o repositório. Use **Next.js**, com base na raiz, comando `npm run build` e diretório `.next`. O `netlify.toml` já configura o build e o Node 22. O adaptador OpenNext é detectado pela Netlify.
2. Em **Project configuration → Environment variables**, cadastre as variáveis abaixo. Se a interface oferecer seleção de escopo, inclua **Functions**. Adicione os valores em **Production**.

| Nome | Valor |
| --- | --- |
| `CARTAZ_STORAGE` | `supabase` |
| `SUPABASE_URL` | `https://SEU-PROJETO.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Sua chave publishable, prefixo `sb_publishable_`, ou a chave anon legada |
| `CARTAZ_ORIGIN` | Endereço HTTPS final do site, como `https://SEU-SITE.netlify.app`, sem barra no fim |

3. Inicie um novo deploy após salvar as variáveis. Se usar um domínio próprio, coloque esse endereço final em `CARTAZ_ORIGIN` e republique.
4. Abra o site, clique em **Entrar** e use a conta criada no Supabase. Cadastre um produto, reabra a página e confira a persistência. Teste o envio de uma foto, a criação de um cartaz e o PDF.

O projeto usa a chave publishable com o token do usuário em todas as operações. Guarde chaves `service_role`, `sb_secret_` e a senha do banco fora do repositório e da configuração da aplicação.

[Next.js na Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/) · [Variáveis de ambiente na Netlify](https://docs.netlify.com/build/frameworks/use-environment-variables-with-frameworks/)

## Executar localmente usando o Supabase

Copie `.env.example` para `.env.local`, preencha as três primeiras variáveis de nuvem e use `CARTAZ_ORIGIN=http://127.0.0.1:3000`. Em seguida:

```powershell
npm.cmd ci
npm.cmd run dev
```

O tutorial do [README](README.md) também descreve o modo local SQLite. O banco de nuvem começa vazio. Dados da instalação SQLite anterior e senhas locais precisam de uma migração à parte. Para começar com o catálogo existente, importe sua planilha novamente.

## Operação

- A conta administradora tem acesso ao espaço da empresa provisionada. Para trocar a senha em nuvem, use a administração do Supabase Auth. O comando `npm run admin` atende ao SQLite.
- O banco usa um snapshot JSONB por empresa com revisão otimista. O limite atual de uma solicitação de salvamento na nuvem é 3 MB. Imagens PNG, JPEG e WebP de até 2 MB vão para um bucket privado e são referenciadas nos lotes.
- A exportação é executada no navegador. Para backup completo em nuvem, preserve o PostgreSQL e os arquivos do bucket. Excluir a referência de uma imagem da biblioteca mantém o objeto no bucket, pois lotes antigos podem usá-lo.
- Se o acesso retornar **empresa ainda não provisionada**, verifique se o SQL de criação da empresa foi executado com o mesmo e-mail. Se a origem for recusada, confira se `CARTAZ_ORIGIN` corresponde à URL aberta no navegador.

[Limites de Functions](https://docs.netlify.com/build/functions/configuration/) · [Arquivos privados no Supabase Storage](https://supabase.com/docs/guides/storage/serving/downloads)

