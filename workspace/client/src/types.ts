export type Role = 'user' | 'company' | 'admin';

export interface Address {
  id: number;
  label: string;
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  latitude: number | null;
  longitude: number | null;
  is_default: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  city?: string;
}

export interface Company {
  id: number;
  name: string;
  cnpj: string;
  responsible: string;
  email: string;
  phone: string;
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  materials: string[];
  latitude: number | null;
  longitude: number | null;
}

export interface MaterialItem {
  type: string;
  quantity: number;
}

export interface Collection {
  id: number;
  user_id: number;
  company_id: number | null;
  user_name: string;
  user_phone: string;
  company_name: string | null;
  materials: MaterialItem[];
  address: Address & { label?: string };
  latitude: number | null;
  longitude: number | null;
  company_latitude: number | null;
  company_longitude: number | null;
  date: string;
  period: string;
  observations: string;
  status: string;
  status_label: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  collection_id: number | null;
  is_read: number;
  created_at: string;
  date?: string;
  period?: string;
  status?: string;
}

export interface DashboardStats {
  total: number;
  byStatus: Record<string, number>;
  scheduled: number;
  completed: number;
  pending: number;
  collectedWeight: number;
  clientsServed: number;
  byDate?: Record<string, number>;
}

export interface UserDashboardStats {
  total: number;
  byStatus: Record<string, number>;
  pending: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  totalWeight: number;
  upcoming: Collection[];
}
