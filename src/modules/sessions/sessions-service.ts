import { errAsync, okAsync } from "neverthrow";
import { db } from "../../lib/database";
import { hash } from "../../lib/hash";
import type { CreateSessionDTO } from "./sessions-types";

const EXPIRATION_DAYS = Number(process.env.AUTH_EXPIRATION_DAYS ?? 7);

export function sessionsService() {
  return {
    async create({ email, password }: CreateSessionDTO) {
      try {
        const user = await db.user.findUnique({ where: { email } });

        if (!user || !user.password) {
          return errAsync({ reason: "Credenciais inválidas", statusCode: 401 });
        }

        if (user.status !== "ACTIVE") {
          return errAsync({
            reason: "Usuário não está ativo",
            statusCode: 403,
          });
        }

        const { valid, needsRehash } = await hash().compare(password, user.password);

        if (!valid) {
          return errAsync({ reason: "Credenciais inválidas", statusCode: 401 });
        }

        if (needsRehash) {
          hash()
            .create(password)
            .then((newHash) => db.user.update({ where: { id: user.id }, data: { password: newHash } }))
            .catch((err) => console.error("Error rehashing password:", err));
        }

        const token = crypto.randomUUID();

        const expiresAt = new Date(Date.now() + EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

        const session = await db.session.create({
          data: { token, userId: user.id, expiresAt },
        });

        const { password: _, ...userWithoutPassword } = user;

        return okAsync({
          session: { token: session.token, expiresAt: session.expiresAt },
          user: userWithoutPassword,
        });
      } catch (error) {
        console.error("Error creating session:", error);
        return errAsync({
          reason: "Não foi possível realizar login",
          statusCode: 500,
        });
      }
    },

    async validate(token: string) {
      try {
        const session = await db.session.findFirst({
          where: { token },
        });

        if (!session) {
          return errAsync({ reason: "Sessão não encontrada", statusCode: 404 });
        }

        if (session.expiresAt < new Date()) {
          await db.session.delete({ where: { id: session.id } });
          return errAsync({ reason: "Sessão expirada", statusCode: 401 });
        }

        return okAsync(session);
      } catch (error) {
        console.error("Error validating session:", error);
        return errAsync({
          reason: "Não foi possível validar a sessão",
          statusCode: 500,
        });
      }
    },

    async delete(token: string) {
      try {
        await db.session.delete({ where: { token } });
        return okAsync(null);
      } catch (error) {
        console.error("Error deleting session:", error);
        return errAsync({
          reason: "Não foi possível deletar a sessão",
          statusCode: 500,
        });
      }
    },
  };
}
