export type StatusCode = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const STATUS_MAP: Record<StatusCode, { label: string; color: string; category: string }> = {
  2: { label: 'Oportunidad', color: 'blue', category: 'presales' },
  3: { label: 'Req. Gathering', color: 'indigo', category: 'presales' },
  4: { label: 'Solution Def.', color: 'violet', category: 'presales' },
  5: { label: 'Neg. Contrato', color: 'orange', category: 'presales' },
  6: { label: 'Ganado', color: 'emerald', category: 'won' },
  7: { label: 'Delivering', color: 'teal', category: 'project' },
  8: { label: 'Finalizado', color: 'slate', category: 'finished' },
  9: { label: 'Perdido', color: 'red', category: 'lost' },
};

export type CompanyName = 'MTI' | 'MTi' | 'MTI ARABIA' | 'BCN' | 'DIPRO' | 'INGECO' | 'MARINA EYE-CAM';

export type BusinessLines = {
  hardware: number;
  ia: number;
  bim: number;
  ttioOm: number;
  events: number;
  proservices: number;
};

export interface ProjectOpportunity {
  id: string;
  client: string;
  date: string;
  opportunity: string;
  description: string;
  amount: number;
  currency: 'EUR' | 'USD';
  statusCode: StatusCode;
  company: CompanyName;
  probability: number;
  weightedPipeline: number;
  owner: string;
  country: string;
  expectedClosingDate: string;
  businessLines: BusinessLines;
  acceptanceDate?: string;
  week?: number;
  nextYears?: number;
  costs: number;
  materialCost: number;
  peopleCost: number;
  margin: number;
  totalInvoiced: number;
  pendingToInvoice: number;
  wipStatus: number;
  observations?: string;
  endDate?: string;
  totalPercentage: number;
  isInternal?: boolean;
}

export interface Client {
  id: string;
  name: string;
  country: string;
  totalAmount: number;
  totalInvoiced: number;
  pendingToInvoice: number;
  opportunitiesCount: number;
  projectsCount: number;
  primaryOwner: string;
  lastActivity: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  hourlyCost: number;
  activeProjects: number;
  availability: number;
}

export interface KpiData {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
  color?: string;
  prefix?: string;
  suffix?: string;
}

export interface MonthlyBilling {
  month: string;
  invoiced: number;
  target: number;
  collected: number;
}

export interface PipelineByStatus {
  status: string;
  count: number;
  amount: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export type FilterState = {
  search: string;
  status: StatusCode | 'all';
  company: CompanyName | 'all';
  owner: string;
  country: string;
  businessLine: keyof BusinessLines | 'all';
};
