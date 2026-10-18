import { z } from 'zod';

// Permissif : autorise lettres unicode, chiffres, espaces et la plupart des
// caractères ; bloque seulement ce qui pourrait briser le HTML/JS.
const pseudoSchema = z.string().trim().min(1).max(20)
  .regex(/^[^<>&"'`\\]+$/, 'Pseudo invalide (caractères spéciaux interdits)');
const avatarSchema = z.string().min(1).max(80).optional();
// Photo de profil (data URL déjà réduite côté client, ~10-30 Ko)
const photoSchema = z.string().max(140_000).optional();

export const schemas = {
  roomCreate:    z.object({ pseudo: pseudoSchema, avatar: avatarSchema, photo: photoSchema }),
  roomJoin:      z.object({ code: z.string().length(6), pseudo: pseudoSchema, avatar: avatarSchema, photo: photoSchema }),
  roomRejoin:    z.object({
    code: z.string().length(6), playerId: z.string().min(8),
    pseudo: pseudoSchema.optional(), avatar: avatarSchema, photo: photoSchema,
  }),
  setAvatar:     z.object({ avatar: avatarSchema, photo: photoSchema }),
  chatSend:   z.object({ text: z.string().trim().min(1).max(300) }),
  gameSelect: z.object({ gameId: z.string().min(1).max(40) }),
  setGame:    z.object({ gameId: z.string().min(1).max(40) }),
  setOptions: z.object({
    gameId:  z.string().min(1).max(40),
    options: z.record(z.any()),
  }),
  gameStart:  z.object({
    gameId:  z.string().min(1).max(40).optional(),
    options: z.record(z.any()).optional(),
  }),
  gameAction: z.object({
    type: z.string().min(1).max(40),
    payload: z.any().optional(),
  }),
};

export function validate(socket, schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    socket.emit('error', {
      code: 'BAD_PAYLOAD',
      message: result.error.issues[0]?.message || 'Payload invalide',
    });
    return null;
  }
  return result.data;
}
