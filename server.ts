import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { body, validationResult } from "express-validator";
import morgan from "morgan";
import { userValidator } from "./validator/validators";

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(morgan("dev")); // Logs in 'dev' format (color-coded, concise)

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Routes
app.get("/", (req: Request, res: Response) => {
  res.send("Eventos Server is running!!");
});

app.post("/user", userValidator, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // 2nd level checker

  const { email, userName } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        {
          email: email,
        },
        {
          userName: userName,
        },
      ],
    },
  });

  if (user) {
    return res.status(400).json({ error: "User already exists with the same Email or username" });
  }

  try {
    const result = await prisma.user.create({
      data: req.body,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error });
  }
});

app.get("/user", async (req: Request, res: Response) => {
  try {
    const result = await prisma.user.findMany();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/user/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });

    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.post(
  "/attendee",
  body("name").isString().notEmpty(),
  body("email").isEmail(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const result = await prisma.attendee.create({
        data: req.body,
      });
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to create attendee" });
    }
  }
);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
