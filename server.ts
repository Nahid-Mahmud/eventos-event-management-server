import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import express from "express";
const app = express();
const port = 3000;
// use body parser
app.use(express.json());

app.get("/", async (req: Request, res: Response) => {
  res.send("Eventos Server is running!!");
});

app.post("/user", async (req: Request, res: Response) => {
  console.log(req.body);
  const result = await prisma.user.create({
    data: req.body,
  });
  res.status(201).json(result);
});

app.get("/user", async (req: Request, res: Response) => {
  const result = await prisma.user.findMany({
    include: {
      attendee: true,
    },
  });
  res.status(200).json(result);
});

app.get("/user/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await prisma.user.findUnique({
    where: {
      id: id,
    },
  });
  res.status(200).json(result);
});

// create origanizer

app.post("/attendee", async (req: Request, res: Response) => {
  const result = await prisma.attendee.create({
    data: req.body,
  });
  res.status(201).json(result);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
