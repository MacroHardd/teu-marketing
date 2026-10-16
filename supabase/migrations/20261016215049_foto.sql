-- Foto do Post (M3). A foto fica num bucket privado, numa pasta por Cliente: <cliente_id>/<post_id>/<arquivo>.jpg.
-- O Parceiro nunca lê fotos (ADR 0002). O browser baixa pelo Cliente logado (download autenticado).

alter table public.posts
  add column foto_path text,
  -- metadado da análise feita no upload (grade de luminância): o Motor usa isto, nunca o pixel
  add column foto_meta jsonb;

-- a foto já chega reduzida (até 2160 px) e em JPEG: 5 MB sobra
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "cliente ativo lê as próprias fotos" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select privado.meu_cliente_id())::text);

create policy "cliente ativo envia foto na própria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select privado.meu_cliente_id())::text);

create policy "cliente ativo troca as próprias fotos" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select privado.meu_cliente_id())::text)
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select privado.meu_cliente_id())::text);

create policy "cliente ativo apaga as próprias fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select privado.meu_cliente_id())::text);
