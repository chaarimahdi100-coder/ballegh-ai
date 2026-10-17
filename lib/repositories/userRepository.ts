import { prisma, getIsDatabaseConfigured } from "@/lib/db";
import bcrypt from "bcryptjs";
import { DEMO_USERS } from "@/lib/demo/users";
import type { User, UserRole } from "@/lib/types";

// In-memory shadow store for development/demo when Prisma DB is not yet connected
const inMemoryUsers: (User & { passwordHash: string })[] = [
  {
    id: "usr_citizen_01",
    name: "Yassine Ben Amor",
    email: "citoyen@tunis.tn",
    phone: "+216 98 421 890",
    role: "citizen",
    district: "Bab Souika",
    organization: "Citoyen de Tunis",
    passwordHash: bcrypt.hashSync("Ballegh2026!", 10),
  },
  {
    id: "usr_agent_01",
    name: "Ing. Samira Trabelsi",
    email: "agent@commune-tunis.gov.tn",
    phone: "+216 71 345 678",
    role: "municipal_agent",
    district: "Direction de la Voirie et Travaux",
    organization: "Commune de Tunis",
    passwordHash: bcrypt.hashSync("Ballegh2026!", 10),
  },
  {
    id: "usr_admin_01",
    name: "Karim Mansour",
    email: "admin@commune-tunis.gov.tn",
    phone: "+216 71 890 123",
    role: "admin",
    district: "Arrondissement Central",
    organization: "Direction des Systèmes d'Information — Ville de Tunis",
    passwordHash: bcrypt.hashSync("Ballegh2026!", 10),
  },
  {
    id: "usr_admin_02",
    name: "Karim Mansour (Alias)",
    email: "admin@ballegh.tn",
    phone: "+216 71 890 123",
    role: "admin",
    district: "Arrondissement Central",
    organization: "Direction des Systèmes d'Information — Ville de Tunis",
    passwordHash: bcrypt.hashSync("Ballegh2026!", 10),
  },
];

export async function findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  const normalized = email.trim().toLowerCase();

  // If database is configured, strictly query PostgreSQL
  if (getIsDatabaseConfigured()) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: normalized },
      });
      if (user) {
        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role.toLowerCase() as UserRole,
          district: user.district || undefined,
          organization: user.organization || undefined,
          avatarUrl: user.avatarUrl || undefined,
          passwordHash: user.passwordHash,
        };
      }
      return null;
    } catch (err: any) {
      console.error("[userRepository] Database error in findUserByEmail:", err.message);
      throw new Error(`Database error while retrieving user: ${err.message}`);
    }
  }

  // Fallback to in-memory store ONLY when database is not configured
  const found = inMemoryUsers.find((u) => u.email.toLowerCase() === normalized);
  return found || null;
}

export async function createUser(data: {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  district?: string;
  role?: UserRole;
}): Promise<User> {
  const normalized = data.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(data.password, 12);
  const role = data.role || "citizen";

  if (getIsDatabaseConfigured()) {
    try {
      const created = await prisma.user.create({
        data: {
          fullName: data.fullName,
          email: normalized,
          passwordHash,
          phone: data.phone,
          district: data.district,
          role: role.toUpperCase() as "CITIZEN" | "MUNICIPAL_AGENT" | "ADMIN",
        },
      });

      return {
        id: created.id,
        name: created.fullName,
        email: created.email,
        phone: created.phone,
        role: created.role.toLowerCase() as UserRole,
        district: created.district || undefined,
        organization: created.organization || undefined,
      };
    } catch (err: any) {
      console.error("[userRepository] Database error in createUser:", err.message);
      throw new Error(`Database error while creating user: ${err.message}`);
    }
  }

  // In-memory fallback ONLY when database is not configured
  const newUser: User & { passwordHash: string } = {
    id: `usr_${Date.now()}`,
    name: data.fullName,
    email: normalized,
    phone: data.phone,
    role,
    district: data.district,
    passwordHash,
  };
  inMemoryUsers.push(newUser);
  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    phone: newUser.phone,
    role: newUser.role,
    district: newUser.district,
  };
}

export async function listAllUsers(): Promise<User[]> {
  if (getIsDatabaseConfigured()) {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      });
      return users.map((u) => ({
        id: u.id,
        name: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role.toLowerCase() as UserRole,
        district: u.district || undefined,
        organization: u.organization || undefined,
        avatarUrl: u.avatarUrl || undefined,
      }));
    } catch (err: any) {
      console.error("[userRepository] Database error in listAllUsers:", err.message);
      throw new Error(`Database error while listing users: ${err.message}`);
    }
  }

  return inMemoryUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    district: u.district,
    organization: u.organization,
  }));
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    district: user.district,
    organization: user.organization,
    avatarUrl: user.avatarUrl,
  };
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  phone: string;
  district?: string;
}): Promise<User> {
  const existing = await findUserByEmail(data.email);
  if (existing) {
    throw new Error("Cet e-mail existe déjà.");
  }
  return createUser({
    fullName: data.name,
    email: data.email,
    password: data.password,
    phone: data.phone,
    district: data.district,
    role: "citizen",
  });
}

