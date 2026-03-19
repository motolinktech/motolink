import { errAsync, okAsync } from "neverthrow";
import { historyTraceActionConst, historyTraceEntityConst } from "@/constants/history-trace";
import { statusConst } from "@/constants/status";
import { whatsappMessageTypeConst } from "@/constants/whatsapp";
import { db } from "@/lib/database";
import { hash } from "@/lib/hash";
import { generateSecureToken } from "@/utils/generate-secure-token";
import { historyTracesService } from "../history-traces/history-traces-service";
import { whatsappService } from "../whatsapp/whatsapp-service";
import type { UserListQueryDTO, UserMutateDTO } from "./users-types";

export function usersService() {
  return {
    async create(body: UserMutateDTO, loggedUserId: string) {
      try {
        const data = { ...body, status: statusConst.PENDING as string };

        if (data.password) {
          data.password = await hash().create(data.password);
          data.status = statusConst.ACTIVE as string;
        }

        const user = await db.user.create({
          data: {
            ...data,
          },
          omit: {
            password: true,
          },
        });

        if (data.status === statusConst.PENDING && !data.password) {
          const token = await generateSecureToken();

          await db.verificationToken.create({
            data: {
              userId: user.id,
              token,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });

          // if (user.phone) {
          //   await whatsapp().usersInvite(user.phone, {
          //     token,
          //     name: user.name,
          //   });
          // }
        }

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.CREATED,
            entityType: historyTraceEntityConst.USER,
            entityId: user.id,
            newObject: user,
          })
          .catch(() => {});

        return okAsync(user);
      } catch (error) {
        console.error("Error creating user:", error);
        return errAsync({
          reason: "Não foi possível criar usuário",
          statusCode: 500,
        });
      }
    },

    async getById(id: string) {
      try {
        const user = await db.user.findUnique({
          where: { id },
          omit: { password: true },
        });

        return okAsync(user);
      } catch (error) {
        console.error("Error getting user by id:", error);
        return errAsync({
          reason: "Não foi possível buscar usuário",
          statusCode: 500,
        });
      }
    },

    async listAll(query: UserListQueryDTO) {
      try {
        const { page, pageSize, search, branchId, status } = query;
        const skip = (page - 1) * pageSize;

        const where = {
          isDeleted: false,
          ...(search && {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }),
          ...(branchId && {
            branches: { has: branchId },
          }),
          ...(status && { status }),
        };

        const [total, data] = await Promise.all([
          db.user.count({ where }),
          db.user.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
            omit: { password: true },
          }),
        ]);

        return okAsync({
          data,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        });
      } catch (error) {
        console.error("Error listing users:", error);
        return errAsync({
          reason: "Não foi possível listar usuários",
          statusCode: 500,
        });
      }
    },

    async update(id: string, body: UserMutateDTO, loggedUserId: string) {
      try {
        const existingUser = await db.user.findUnique({
          where: { id },
          omit: { password: true },
        });

        if (!existingUser) {
          return errAsync({
            reason: "Usuário não encontrado",
            statusCode: 404,
          });
        }

        if (existingUser.isDeleted) {
          return errAsync({
            reason: "Usuário já foi excluído",
            statusCode: 400,
          });
        }

        const updateData = { ...body };

        if (updateData.password) {
          updateData.password = await hash().create(updateData.password);
        }

        if (updateData.email) {
          const emailExists = await db.user.findFirst({
            where: {
              email: updateData.email,
              id: { not: id },
              isDeleted: false,
            },
          });

          if (emailExists) {
            return errAsync({
              reason: "E-mail já está em uso por outro usuário",
              statusCode: 400,
            });
          }
        }

        const updatedUser = await db.user.update({
          where: { id },
          data: updateData,
          omit: { password: true },
        });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.UPDATED,
            entityType: historyTraceEntityConst.USER,
            entityId: id,
            newObject: updatedUser,
            oldObject: existingUser,
          })
          .catch(() => {});

        return okAsync(updatedUser);
      } catch (error) {
        console.error("Error updating user:", error);
        return errAsync({
          reason: "Não foi possível atualizar usuário",
          statusCode: 500,
        });
      }
    },

    async setPassword(token: string, userId: string, password: string) {
      try {
        const verificationToken = await db.verificationToken.findFirst({
          where: {
            token,
            userId,
            expiresAt: { gt: new Date() },
          },
        });

        if (!verificationToken) {
          return errAsync({
            reason: "Token inválido ou expirado",
            statusCode: 400,
          });
        }

        const hashedPassword = await hash().create(password);

        await db.user.update({
          where: { id: userId },
          data: {
            password: hashedPassword,
            status: statusConst.ACTIVE,
          },
        });

        await db.verificationToken.delete({
          where: { id: verificationToken.id },
        });

        return okAsync({ success: true });
      } catch (error) {
        console.error("Error setting user password:", error);
        return errAsync({
          reason: "Não foi possível definir a senha",
          statusCode: 500,
        });
      }
    },

    async changePassword(userId: string, oldPassword: string, newPassword: string) {
      try {
        const user = await db.user.findUnique({
          where: { id: userId },
        });

        if (!user || !user.password) {
          return errAsync({
            reason: "Usuário não encontrado",
            statusCode: 404,
          });
        }

        const { valid } = await hash().compare(oldPassword, user.password);

        if (!valid) {
          return errAsync({
            reason: "Senha atual incorreta",
            statusCode: 400,
          });
        }

        const hashedPassword = await hash().create(newPassword);

        await db.user.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });

        return okAsync({ success: true });
      } catch (error) {
        console.error("Error changing user password:", error);
        return errAsync({
          reason: "Não foi possível alterar a senha",
          statusCode: 500,
        });
      }
    },

    async toggleBlock(id: string, loggedUserId: string) {
      try {
        const existing = await db.user.findUnique({ where: { id, isDeleted: false }, omit: { password: true } });

        if (!existing) {
          return errAsync({ reason: "Usuário não encontrado", statusCode: 404 });
        }

        const newStatus = existing.status === statusConst.BLOCKED ? statusConst.ACTIVE : statusConst.BLOCKED;

        const updated = await db.user.update({
          where: { id },
          data: { status: newStatus },
          omit: { password: true },
        });

        if (newStatus === statusConst.BLOCKED) {
          await db.session.deleteMany({ where: { userId: id } });
        }

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.UPDATED,
            entityType: historyTraceEntityConst.USER,
            entityId: id,
            oldObject: existing,
            newObject: updated,
          })
          .catch(() => {});

        return okAsync(updated);
      } catch (error) {
        console.error("Error toggling user block status:", error);
        return errAsync({ reason: "Não foi possível alterar o bloqueio do usuário", statusCode: 500 });
      }
    },

    async delete(id: string, loggedUserId: string) {
      try {
        const existingUser = await db.user.findUnique({
          where: { id },
          omit: { password: true },
        });

        if (!existingUser) {
          return errAsync({
            reason: "Usuário não encontrado",
            statusCode: 404,
          });
        }

        if (existingUser.isDeleted) {
          return errAsync({
            reason: "Usuário já foi excluído",
            statusCode: 400,
          });
        }

        const deletedUser = await db.user.update({
          where: { id },
          data: { isDeleted: true },
          omit: { password: true },
        });

        await db.session.deleteMany({
          where: { userId: id },
        });

        historyTracesService()
          .create({
            userId: loggedUserId,
            action: historyTraceActionConst.DELETED,
            entityType: historyTraceEntityConst.USER,
            entityId: id,
            newObject: deletedUser,
            oldObject: existingUser,
          })
          .catch(() => {});

        return okAsync({ success: true });
      } catch (error) {
        console.error("Error deleting user:", error);
        return errAsync({
          reason: "Não foi possível excluir usuário",
          statusCode: 500,
        });
      }
    },

    async forgotPassword(email: string) {
      try {
        const user = await db.user.findFirst({
          where: { email, isDeleted: false },
        });

        if (!user || user.status === statusConst.BLOCKED) {
          return okAsync({ success: true });
        }

        const cooldownLimit = new Date(Date.now() - 5 * 60 * 1000);
        const recentToken = await db.verificationToken.findFirst({
          where: { userId: user.id, createdAt: { gt: cooldownLimit } },
        });

        if (recentToken) {
          return errAsync({
            reason: "Aguarde alguns minutos antes de solicitar novamente",
            statusCode: 429,
          });
        }

        await db.user.update({
          where: { id: user.id },
          data: { password: null, status: statusConst.PENDING },
        });

        await db.session.deleteMany({ where: { userId: user.id } });
        await db.verificationToken.deleteMany({ where: { userId: user.id } });

        const token = await generateSecureToken();

        await db.verificationToken.create({
          data: {
            userId: user.id,
            token,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        if (user.phone && user.branches.length > 0) {
          whatsappService()
            .sendInvite({
              phone: user.phone,
              branchId: user.branches[0],
              type: whatsappMessageTypeConst.FORGOT_PASSWORD,
              content: { token, userId: user.id, name: user.name },
            })
            .catch(() => {});
        }

        return okAsync({ success: true });
      } catch (error) {
        console.error("Error processing forgot password:", error);
        return errAsync({
          reason: "Não foi possível processar a solicitação",
          statusCode: 500,
        });
      }
    },
  };
}
