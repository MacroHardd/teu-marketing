-- Contato e hashtags não são do Perfil de Marca (decisão do usuário, 2026-10-16):
-- hashtags são por Post (na legenda), e contato é para a Plataforma falar com o Cliente, nunca aparece em Post.
alter table public.perfis_marca drop column contato, drop column hashtags;
