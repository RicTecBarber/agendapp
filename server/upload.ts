import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

// Garante que os diretórios de upload existam
const ensureDirectoryExists = (directory: string) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// Configuração do armazenamento para produtos
const productStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("Configurando destino do upload para:", file.originalname);
    const uploadDir = path.join("uploads", "products");
    ensureDirectoryExists(uploadDir);
    console.log("Diretório de upload:", uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req: Request, file, cb) {
    // Adicionar tenant_id ao nome do arquivo para evitar conflitos entre tenants
    const tenantId = req.tenantId || "default";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `tenant_${tenantId}-${uniqueSuffix}${path.extname(file.originalname)}`;
    console.log(`Gerando nome de arquivo: ${filename} para ${file.originalname}`);
    cb(null, filename);
  }
});

// Configuração do armazenamento para profissionais
const professionalStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join("uploads", "professionals");
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req: Request, file, cb) {
    const tenantId = req.tenantId || "default";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `tenant_${tenantId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Configuração do armazenamento para serviços
const serviceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join("uploads", "services");
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req: Request, file, cb) {
    const tenantId = req.tenantId || "default";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `tenant_${tenantId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Verifica o tipo de arquivo
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de arquivo não suportado. Apenas JPEG, PNG, GIF e WebP são permitidos."));
  }
};

export const uploadProduct = multer({ 
  storage: productStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

export const uploadProfessional = multer({ 
  storage: professionalStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

export const uploadService = multer({ 
  storage: serviceStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});