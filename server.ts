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
// app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
//   console.error(err.stack);
//   res.status(500).send("Something broke!");
// });

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
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: { email, userName, password, role },
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
    res.status(500).json({ error: (error as Error).message });
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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
