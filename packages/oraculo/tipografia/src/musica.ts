// Da skill (musica.ts): só a função que os estáticos usam.
export const bare = (w: string) => w.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}']/gu, "");
