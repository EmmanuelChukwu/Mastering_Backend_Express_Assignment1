const express = require("express");
const userController = require("../controllers/user.controller");

const router = express.Router();

router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);

module.exports = router;