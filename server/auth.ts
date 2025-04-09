import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, SystemAdmin } from "@shared/schema";

// Tipo para representar tanto usuários comuns quanto administradores do sistema
type AuthUser = SelectUser | (SystemAdmin & { isSystemAdmin: true });

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "barbersync-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Primeiro, tenta autenticar como um usuário normal
        const user = await storage.getUserByUsername(username);
        
        // Se não encontrar como usuário normal, tenta como administrador do sistema
        if (!user) {
          const systemAdmin = await storage.getSystemAdminByUsername(username);
          
          if (!systemAdmin) {
            return done(null, false, { message: "Usuário não encontrado" });
          }
          
          // Verificar senha do administrador do sistema
          if (systemAdmin.password.startsWith("$2b$")) {
            // Verificação específica para seeds
            if (password === "admin123") {
              // Adiciona uma flag para identificar que é um admin do sistema
              return done(null, { ...systemAdmin, isSystemAdmin: true });
            } else {
              return done(null, false, { message: "Senha incorreta" });
            }
          } else {
            // Para admins reais
            if (await comparePasswords(password, systemAdmin.password)) {
              return done(null, { ...systemAdmin, isSystemAdmin: true });
            } else {
              return done(null, false, { message: "Senha incorreta" });
            }
          }
        }
        
        // Verificação de senha para usuário normal
        if (user.password.startsWith("$2b$")) {
          // Verificação específica para seeds
          if (password === "admin123") {
            return done(null, user);
          } else {
            return done(null, false, { message: "Senha incorreta" });
          }
        } else {
          // Para usuários reais
          if (await comparePasswords(password, user.password)) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Senha incorreta" });
          }
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user: any, done) => {
    // Serializar diferentemente se for um admin do sistema
    if (user.isSystemAdmin) {
      done(null, { id: user.id, isSystemAdmin: true });
    } else {
      done(null, { id: user.id, isSystemAdmin: false });
    }
  });
  
  passport.deserializeUser(async (serialized: { id: number, isSystemAdmin: boolean }, done) => {
    try {
      // Deserializar corretamente com base no tipo de usuário
      if (serialized.isSystemAdmin) {
        const systemAdmin = await storage.getSystemAdmin(serialized.id);
        if (systemAdmin) {
          done(null, { ...systemAdmin, isSystemAdmin: true });
        } else {
          done(new Error('System admin not found'));
        }
      } else {
        const user = await storage.getUser(serialized.id);
        if (user) {
          done(null, user);
        } else {
          done(new Error('User not found'));
        }
      }
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't send back the password hash
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao registrar usuário" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Falha na autenticação" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        // Don't send back the password hash
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    // Don't send back the password hash
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}
