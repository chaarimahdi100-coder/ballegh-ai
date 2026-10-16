import type { User } from "@/lib/types";

export const DEMO_USERS: User[] = [
  {
    id: "usr_citizen_01",
    name: "Yassine Ben Amor",
    email: "yassine.benamor@gmail.tn",
    phone: "98 421 890",
    role: "citizen",
    district: "Bab Souika, Tunis",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
  },
  {
    id: "usr_agent_01",
    name: "Ing. Samira Trabelsi",
    email: "samira.trabelsi@commune-tunis.gov.tn",
    phone: "71 345 678",
    role: "municipal_agent",
    district: "Direction de la Voirie et Travaux",
    organization: "Commune de Tunis",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
  },
  {
    id: "usr_admin_01",
    name: "Karim Mansour",
    email: "admin.it@ballegh.tn",
    phone: "71 890 123",
    role: "admin",
    organization: "Direction des Systèmes d'Information — Ville de Tunis",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
  },
];
