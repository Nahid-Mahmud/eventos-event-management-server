import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { body, validationResult } from "express-validator";
import morgan from "morgan";
import { loginValidator, userValidator } from "./validator/validators";
import formatError from "./formatError";
// use bcrypt to hash passwords
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
dotenv.config();

// const accessTokenSecret = "youraccesstokenefjegcjlegcjlopfecjpofcekoegcsecret";
// const refreshTokenSecret = "yourrefreshtokeadfadsfnsecret";

// Load environment variables
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET!;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET!;

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
  // Handle validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, userName, password, role, ...rest } = req.body;

  try {
    // Check if email or username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { userName }],
      },
    });

    if (existingUser) {
      console.log(existingUser?.email);
      return res.status(400).json({
        error:
          existingUser.email === email
            ? `User already exists with the '${existingUser?.email}' Email.`
            : `User already exists with the '${existingUser?.userName}' username.`,
      });
    }

    // Use a transaction to create the user and role-specific entity

    const saltRounds = 10;

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: { email, userName, password: hashedPassword, role },
      });

      // Create role-specific entity
      if (role === "attendee") {
        return await tx.attendee.create({
          data: { userId: user.id, ...rest },
        });
      } else if (role === "organizer") {
        return await tx.organizer.create({
          data: { userId: user.id, ...rest },
        });
      } else {
        throw new Error(`Invalid role: ${role}`);
      }
    });

    res.status(201).json(result);
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    res.status(500).json(formatError(error));
  }
});

// Get all users along with their roles (attendee/organizer)

app.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        attendee: true,
        organizer: true,
      },
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error });
  }
});

// get all attendees with user details

app.get("/attendees", async (req: Request, res: Response) => {
  try {
    const attendees = await prisma.attendee.findMany({
      include: {
        user: true,
      },
    });
    res.status(200).json(attendees);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch attendees" });
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

// login user with email or username and password

app.post("/login", loginValidator, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, userName, password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { userName }],
      },
      include: {
        attendee: true,
        organizer: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const accessToken = jwt.sign({ email: user.email, userName: user.userName, role: user.role }, accessTokenSecret, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign({ email: user.email, userName: user.userName, role: user.role }, refreshTokenSecret, {
      expiresIn: "7d",
    });

    const { password: _, ...rest } = user;
    // create access token and refresh token

    res.status(200).json({ data: rest, tokens: { accessToken, refreshToken } });
  } catch (error) {
    res.status(500).json(formatError(error));
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
