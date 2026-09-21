import { prisma } from "../lib/prisma";

export const getAll = async () => {
  return prisma.user.findMany();
};

export const getById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
  });
};