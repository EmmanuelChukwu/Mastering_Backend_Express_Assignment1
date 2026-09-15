const userRepository = require("../repositories/user.repository");

const getUsers = () => {
  return userRepository.getAll();
};

const getUserById = (id) => {
  const user = userRepository.getById(id);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

module.exports = {
  getUsers,
  getUserById,
};