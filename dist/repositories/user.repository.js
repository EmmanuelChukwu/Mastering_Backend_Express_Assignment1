"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getById = exports.getAll = void 0;
const prisma_1 = require("../lib/prisma");
const getAll = async () => {
    return prisma_1.prisma.user.findMany();
};
exports.getAll = getAll;
const getById = async (id) => {
    return prisma_1.prisma.user.findUnique({
        where: { id },
    });
};
exports.getById = getById;
