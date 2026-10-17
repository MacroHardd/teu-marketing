# Escopo

*Atualizado em 2026-10-16. Os termos seguem o glossário em [`CONTEXT.md`](../CONTEXT.md).*

## Visão

A Plataforma permite que o **Cliente** cuide sozinho do próprio marketing no Instagram, usando o conhecimento de design e de conteúdo que embutimos no produto. Ela é vendida B2B a **Parceiros** (escritórios, mentores, agências), que a distribuem aos seus Clientes como um extra do serviço que já prestam.

## Princípios que valem para tudo

1. **Fácil antes de poderoso.** Um Post leva de 5 a 10 minutos. Os Ajustes são poucos e essenciais (regra 80/20). Nunca vamos virar um editor de design livre como o Canva.
2. **O Cliente manda.** O texto do Cliente nunca é alterado, e o CTA é sempre escrito por ele.
3. **Código antes de IA.** O que funciona sem IA é feito em código. Quando a IA entrar, será sempre opcional, sob demanda e marcada como IA na interface.
4. **O Estilo garante a qualidade.** As Travas impedem que um Post quebrado chegue ao Cliente.
5. **Zero atrito para o Parceiro.** Ele só manda os emails. A Plataforma envia os Convites e mostra o Uso.

## Fases

| Fase | Conteúdo | Gatilho para começar |
|---|---|---|
| **1. Post estático sem IA** | este documento e o [PRD](prd-fase1-post-estatico.md) | agora |
| 2. IA opcional | Sugestões de IA para Pauta, texto da arte e legenda. Limite de uso, pricing e arquitetura de integração | critérios de passa da Fase 1 ([medição operacional](medicao/operacional.md)) |
| 3+ | carrossel, stories 9:16, publicação e agendamento direto no Instagram, vídeo, blog/SEO | a definir |

## Fase 1: dentro do escopo

**Cliente**
- Entrar pelo Convite, com link mágico por email.
- Perfil de Marca com todos os campos opcionais: nome exibido, @, cor, logo e foto.
- Criar Post: escrever o texto da arte (com a Pauta opcional) e subir uma foto, também opcional.
- Ver o Estilo sugerido pelo motor, trocar por qualquer um dos 13 e trocar de Variação com um clique.
- Ajustes: texto, tamanho P/M/G, zona do texto, enquadramento e zoom da foto, cor da paleta, Elementos opcionais e CTA.
- Ver os avisos das Travas ao vivo, enquanto edita.
- Escrever a legenda, com as hashtags daquele Post.
- Exportar o PNG 1080×1350 e copiar a legenda.
- Usar "Meus Posts": abrir, duplicar e excluir. O salvamento é automático e o Post fica como Rascunho ou Exportado.

**Parceiro**
- Convidar Clientes digitando os emails ou subindo uma planilha CSV/XLSX.
- Acompanhar os Convites (pendente, aceito, expirado) e pedir o reenvio.
- Ver o painel de Uso: Assentos, status de cada Cliente, se o Perfil de Marca está completo, Posts exportados no mês, último acesso, alerta de Cliente parado, resumo do mês e CSV.
- Desativar um Cliente, liberando o Assento.

**Admin**
- Cadastrar um Parceiro e definir quantos Assentos ele tem.

**Transversal**
- Telemetria de eventos de produto ([medição técnica](medicao/tecnico.md)).
- Layout pensado para desktop web, que também funciona bem em telas pequenas.
- Termo de uso e política de privacidade (LGPD) antes do piloto.

## Fase 1: fora do escopo (explicitamente)

| Fora | Motivo / quando |
|---|---|
| Qualquer IA | Fase 2 |
| Carrossel e stories | depois. O motor já suporta stories, mas fica para o futuro |
| Publicar ou agendar no Instagram, e qualquer coisa ligada à Meta | o Cliente exporta e posta por conta própria |
| White-label (domínio, marca ou email do Parceiro) | a marca é a da Plataforma, no máximo com "oferecido por <Parceiro>" |
| Parceiro vendo, editando, aprovando ou comentando Posts | o Parceiro vê só o Uso |
| Workflow de aprovação | o Cliente opera sozinho |
| Pré-preenchimento do Perfil de Marca pelo Parceiro | zero atrito para o Parceiro |
| Fonte livre, cor livre (color picker), camadas, mover elementos livremente | princípio 1 |
| Banco de imagens (Pexels/Unsplash) | só upload. Avaliar depois |
| Calendário editorial | a Pauta é uma lista simples |
| Cliente se cadastrando sozinho | entrada só por Convite |
| Login com Google ou senha | só link mágico |
| Billing automático e gateway de pagamento | contrato e cobrança manuais, com Assentos definidos pelo Admin |
| App nativo e PWA | web para desktop |
| Lixeira | excluir é definitivo, com confirmação |
| Estilos criados por Parceiro ou Cliente | o catálogo é curado por nós |

## Restrições

- Infra no plano grátis da Vercel e do Supabase até o primeiro cliente pagante ([infra](infra.md)).
- Ver os ADRs [0001](adr/0001-motor-ts-no-navegador-publi-como-oraculo.md) (motor TS no browser) e [0002](adr/0002-supabase-rls-como-fronteira-de-tenant.md) (RLS + link mágico).
- Nome e domínio: **Teu Marketing**, `teumarketing` (a configuração do domínio fica para depois).
- Fontes do publi: usar como estão. A licença não é bloqueante agora.
- brandsdecoded (terceiro): observar só a estrutura. Nenhum conteúdo pode ser copiado.
