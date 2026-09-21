import * as userRepository from "../repositories/user.repository";

export const getUsers = async () => {
  return userRepository.getAll();
};

export const getUserById = async (id: string) => {
  const user = await userRepository.getById(id);

  if (!user) {
    const error = new Error("User not found") as Error & {
      statusCode?: number;
    };

    error.statusCode = 404;
    throw error;
  }

  return user;
};