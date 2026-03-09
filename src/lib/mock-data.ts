export const ETAPAS = [
  'Preliminares',
  'Fundaciones',
  'Grueso',
  'Instalaciones',
  'Terminaciones',
  'Otros',
] as const;

export type Etapa = (typeof ETAPAS)[number];

export interface ProjectItem {
  id: string;
  name: string;
  stage: Etapa;
  budgetedAmount: number;
  accumulatedCost: number;
  physicalProgress: number; // 0-100
  plannedProgress: number; // 0-100
  budgetedUnitPrice?: number;
}

export interface Project {
  id: string;
  name: string;
  analyst: string;
  startDate: string;
  originalDeliveryDate: string;
  estimatedDeliveryDate: string;
  items: ProjectItem[];
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Edificio Altos del Mar',
    analyst: 'Juan Manuel Correa',
    startDate: '2024-01-15',
    originalDeliveryDate: '2026-11-01',
    estimatedDeliveryDate: '2026-11-14',
    items: [
      {
        id: 'it-1',
        name: 'Estructura de Hormigón Armado',
        stage: 'Grueso',
        budgetedAmount: 5000000,
        accumulatedCost: 1200000,
        physicalProgress: 24.5,
        plannedProgress: 26.0,
        budgetedUnitPrice: 150000,
      },
      {
        id: 'it-2',
        name: 'Mampostería de ladrillo hueco 12',
        stage: 'Grueso',
        budgetedAmount: 500000,
        accumulatedCost: 80000,
        physicalProgress: 10,
        plannedProgress: 15,
        budgetedUnitPrice: 8000,
      },
      {
        id: 'it-3',
        name: 'Instalación Eléctrica - Cañerías',
        stage: 'Instalaciones',
        budgetedAmount: 800000,
        accumulatedCost: 150000,
        physicalProgress: 18,
        plannedProgress: 18,
        budgetedUnitPrice: 1200,
      }
    ],
  },
];