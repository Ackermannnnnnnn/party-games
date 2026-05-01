import { z } from 'zod';

// Permissif : autorise lettres unicode, chiffres, espaces et la plupart des
// caractères ; bloque seulement ce qui pourrait briser le HTML/JS.
const pseudoSchema = z.string().trim().min(1).max(20)
  .regex(/^[^<>&"'`\\]+$/, 'Pseudo invalide (caractères spéciaux interdits)');

export const schemas = {
  roomCreate: z.object({ pseudo: pseudoSchema }),
  roomJoin:   z.object({ code: z.string().length(6), pseudo: pseudoSchema }),
  roomRejoin: z.object({ code: z.string().length(6), playerId: z.string().min(8) }),
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
