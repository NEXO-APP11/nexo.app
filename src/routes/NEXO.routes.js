import express from "express";
import ferramentasServices from "../services/ferramentas.Services.js";

const ferramentasRouters = express.Router();

ferramentasRouters.get("/", async (req, res) => {
  const ferramentas = await ferramentasServices.getAll();
  res.json(ferramentas);
});
ferramentasRouters.post("/", async (req, res) => {
  const ferramentas = await ferramentasServices.create(req.body);
  return res.status(201).json(ferramentas);
});

export default ferramentasRouters;
