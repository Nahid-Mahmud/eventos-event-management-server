import { body } from "express-validator";

const userValidator = [
  body("email").isEmail().withMessage("Must be a valid email"),
  body("userName").isString().notEmpty().withMessage("Username is required"),
  body("password")
    .isString()
    .notEmpty()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("role").isIn(["attendee", "organizer"]).withMessage("Role must be either organizer or attendee"),
  body("name").isString().notEmpty().withMessage("Name is required"),
];

export { userValidator };
