-- Crie o usuário no painel Authentication > Users antes de executar.
-- Altere o e-mail e o nome abaixo. Use aspas simples duplas para apóstrofos.
do $$
declare
  v_email text := 'SEU_EMAIL';
  v_empresa text := 'NOME_DA_EMPRESA';
  v_owner uuid;
begin
  if v_email = 'SEU_EMAIL' or v_empresa = 'NOME_DA_EMPRESA' then
    raise exception 'Preencha o e-mail do administrador e o nome da empresa.';
  end if;

  select id into v_owner
    from auth.users
    where lower(email) = lower(trim(v_email));

  if v_owner is null then
    raise exception 'Crie primeiro a conta em Authentication > Users.';
  end if;

  insert into public.sca_workspaces (owner_id, data)
  values (v_owner, jsonb_build_object(
    'company',jsonb_build_object('name',trim(v_empresa),'cnpj','','phone','','address',''),
    'stores','[]'::jsonb,'products','[]'::jsonb,'offers','[]'::jsonb,
    'imports','[]'::jsonb,'batches','[]'::jsonb,'templates','[]'::jsonb,
    'campaigns','[]'::jsonb,'media','[]'::jsonb,'events','[]'::jsonb,
    'profiles','[]'::jsonb,'favorites','[]'::jsonb
  )) on conflict (owner_id) do nothing;
end;
$$;

