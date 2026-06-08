/**
 * prisma/seed.ts - MTI Business Control Platform
 * Full seed with all real data
 * Run: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de base de datos MTI...');

  await prisma.activityLog.deleteMany();
  await prisma.importHistory.deleteMany();
  await prisma.salary.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.client.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.appConfig.deleteMany();
  console.log('Tablas limpiadas');

  // ── EMPLOYEES ──────────────────────────────────────────────
  const employeesData = [
    { id: 'EMP25-0001', name: 'Daniel Alonso',       factorialName: 'Daniel Alonso',       company: 'MTI',            department: 'Dirección',     isActive: true  },
    { id: 'EMP25-0002', name: 'Sergio Rodríguez',    factorialName: 'Sergio Rodríguez',    company: 'MTI',            department: 'IA',            isActive: true  },
    { id: 'EMP25-0003', name: 'José María López',    factorialName: 'José María López',    company: 'MTI',            department: 'Finanzas',      isActive: true  },
    { id: 'EMP25-0004', name: 'Javier Martínez',     factorialName: 'Javier Martínez',     company: 'MTI',            department: 'Proyectos',     isActive: true  },
    { id: 'EMP25-0005', name: 'Maria García',        factorialName: 'Maria García',        company: 'MTI',            department: 'Eventos',       isActive: true  },
    { id: 'EMP25-0006', name: 'Jesús Fernández',     factorialName: 'Jesús Fernández',     company: 'MTI',            department: 'IA',            isActive: true  },
    { id: 'EMP25-0007', name: 'Chloe Dupont',        factorialName: 'Chloe Dupont',        company: 'MTI',            department: 'Ventas',        isActive: true  },
    { id: 'EMP25-0008', name: 'Thierry Bernard',     factorialName: 'Thierry Bernard',     company: 'MTI',            department: 'Internacional', isActive: true  },
    { id: 'EMP25-0009', name: 'Jordi Puig',          factorialName: 'Jordi Puig',          company: 'MTI',            department: 'Proyectos',     isActive: true  },
    { id: 'EMP25-0010', name: 'Xavi Carner',         factorialName: 'Xavi Carner',         company: 'MTI',            department: 'Ventas',        isActive: true  },
    { id: 'EMP25-0011', name: 'ADI Outsourcing',     factorialName: null,                  company: 'MTI',            department: 'Proyectos',     isActive: true  },
    { id: 'EMP25-0012', name: 'FDB Director',        factorialName: 'FDB',                 company: 'MTI',            department: 'Dirección',     isActive: true  },
    { id: 'EMP25-0013', name: 'Dani A Kenya',        factorialName: null,                  company: 'MTI',            department: 'Internacional', isActive: true  },
    { id: 'EMP25-0014', name: 'Oscar Pérez',         factorialName: 'Oscar Pérez',         company: 'DIPRO',          department: 'Ventas',        isActive: true  },
    { id: 'EMP25-0015', name: 'JML Director',        factorialName: 'JML',                 company: 'INGECO',         department: 'Dirección',     isActive: true  },
    { id: 'EMP25-0016', name: 'Carles Soler',        factorialName: 'Carles Soler',        company: 'MARINA EYE-CAM', department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0017', name: 'Jordi Pol',           factorialName: 'Jordi Pol',           company: 'BCN',            department: 'Internacional', isActive: true  },
    { id: 'EMP25-0018', name: 'Chadi Nasr',          factorialName: 'Chadi Nasr',          company: 'MTI ARABIA',     department: 'Dirección',     isActive: true  },
    { id: 'EMP25-0019', name: 'Ana Martínez',        factorialName: 'Ana Martínez',        company: 'MTI',            department: 'RRHH',          isActive: true  },
    { id: 'EMP25-0020', name: 'Carlos Ruiz',         factorialName: 'Carlos Ruiz',         company: 'MTI',            department: 'Software',      isActive: true  },
    { id: 'EMP25-0021', name: 'Laura Gómez',         factorialName: 'Laura Gómez',         company: 'MTI',            department: 'IA',            isActive: true  },
    { id: 'EMP25-0022', name: 'Miguel Torres',       factorialName: 'Miguel Torres',       company: 'MTI',            department: 'Software',      isActive: true  },
    { id: 'EMP25-0023', name: 'Patricia Sánchez',    factorialName: 'Patricia Sánchez',    company: 'MTI',            department: 'Finanzas',      isActive: true  },
    { id: 'EMP25-0024', name: 'Roberto Díaz',        factorialName: null,                  company: 'INGECO',         department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0025', name: 'Elena Moreno',        factorialName: 'Elena Moreno',        company: 'MTI',            department: 'Proyectos',     isActive: true  },
    { id: 'EMP25-0026', name: 'Francisco Jiménez',   factorialName: 'Francisco Jiménez',   company: 'INGECO',         department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0027', name: 'Isabel Navarro',      factorialName: 'Isabel Navarro',      company: 'MTI',            department: 'RRHH',          isActive: true  },
    { id: 'EMP25-0028', name: 'Alberto Castillo',    factorialName: 'Alberto Castillo',    company: 'DIPRO',          department: 'Ventas',        isActive: true  },
    { id: 'EMP25-0029', name: 'Carmen Vidal',        factorialName: 'Carmen Vidal',        company: 'MTI',            department: 'Administración',isActive: true  },
    { id: 'EMP25-0030', name: 'Álvaro Romero',       factorialName: null,                  company: 'INGECO',         department: 'Ingeniería',    isActive: false },
    { id: 'EMP25-0031', name: 'Natalia Blanco',      factorialName: 'Natalia Blanco',      company: 'MTI',            department: 'Marketing',     isActive: true  },
    { id: 'EMP25-0032', name: 'Pablo Herrera',       factorialName: 'Pablo Herrera',       company: 'MTI',            department: 'Software',      isActive: true  },
    { id: 'EMP25-0033', name: 'Cristina Molina',     factorialName: 'Cristina Molina',     company: 'DIPRO',          department: 'Administración',isActive: true  },
    { id: 'EMP25-0034', name: 'Andrés Guerrero',     factorialName: null,                  company: 'INGECO',         department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0035', name: 'Silvia Peña',         factorialName: 'Silvia Peña',         company: 'MTI',            department: 'Proyectos',     isActive: true  },
    { id: 'EMP25-0036', name: 'Raúl Vargas',         factorialName: 'Raúl Vargas',         company: 'MTI',            department: 'IA',            isActive: true  },
    { id: 'EMP25-0037', name: 'Beatriz Santos',      factorialName: 'Beatriz Santos',      company: 'MTI',            department: 'RRHH',          isActive: true  },
    { id: 'EMP25-0038', name: 'Héctor Ramos',        factorialName: null,                  company: 'MARINA EYE-CAM', department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0039', name: 'Lucía Ortega',        factorialName: 'Lucía Ortega',        company: 'MTI',            department: 'Finanzas',      isActive: true  },
    { id: 'EMP25-0040', name: 'Emilio Flores',       factorialName: 'Emilio Flores',       company: 'INGECO',         department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0041', name: 'Verónica Castro',     factorialName: 'Verónica Castro',     company: 'MTI',            department: 'Ventas',        isActive: true  },
    { id: 'EMP25-0042', name: 'Ignacio Suárez',      factorialName: null,                  company: 'INGECO',         department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0043', name: 'Marta Reyes',         factorialName: 'Marta Reyes',         company: 'MTI',            department: 'Proyectos',     isActive: true  },
    { id: 'EMP25-0044', name: 'Tomás Álvarez',       factorialName: 'Tomás Álvarez',       company: 'MTI',            department: 'Software',      isActive: true  },
    { id: 'EMP25-0045', name: 'Rosa Serrano',        factorialName: 'Rosa Serrano',        company: 'DIPRO',          department: 'Administración',isActive: true  },
    { id: 'EMP25-0046', name: 'Guillermo Ibáñez',    factorialName: null,                  company: 'MTI',            department: 'IA',            isActive: true  },
    { id: 'EMP25-0047', name: 'Amparo León',         factorialName: 'Amparo León',         company: 'MTI',            department: 'RRHH',          isActive: false },
    { id: 'EMP25-0048', name: 'Marcos Delgado',      factorialName: 'Marcos Delgado',      company: 'INGECO',         department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0049', name: 'Nuria Fuentes',       factorialName: 'Nuria Fuentes',       company: 'MTI',            department: 'Marketing',     isActive: true  },
    { id: 'EMP25-0050', name: 'Alejandro Campos',    factorialName: null,                  company: 'MTI',            department: 'Software',      isActive: true  },
    { id: 'EMP25-0051', name: 'Dolores Vega',        factorialName: 'Dolores Vega',        company: 'MTI',            department: 'Administración',isActive: true  },
    { id: 'EMP25-0052', name: 'Enrique Lozano',      factorialName: 'Enrique Lozano',      company: 'MARINA EYE-CAM', department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0053', name: 'Pilar Mendoza',       factorialName: null,                  company: 'MTI',            department: 'Finanzas',      isActive: true  },
    { id: 'EMP25-0054', name: 'Fernando Cabrera',    factorialName: 'Fernando Cabrera',    company: 'INGECO',         department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0055', name: 'Consuelo Pedraza',    factorialName: null,                  company: 'MTI',            department: 'RRHH',          isActive: true  },
    { id: 'EMP25-0056', name: 'Jaime Medina',        factorialName: 'Jaime Medina',        company: 'MTI',            department: 'Proyectos',     isActive: true  },
    { id: 'EMP25-0057', name: 'Teresa Gallego',      factorialName: 'Teresa Gallego',      company: 'DIPRO',          department: 'Ventas',        isActive: true  },
    { id: 'EMP25-0058', name: 'Salvador Ríos',       factorialName: null,                  company: 'INGECO',         department: 'Ingeniería',    isActive: false },
    { id: 'EMP25-0059', name: 'Concepción Mora',     factorialName: 'Concepción Mora',     company: 'MTI',            department: 'Administración',isActive: true  },
    { id: 'EMP25-0060', name: 'Víctor Pascual',      factorialName: 'Víctor Pascual',      company: 'MTI',            department: 'Software',      isActive: true  },
    { id: 'EMP25-0061', name: 'Remedios Aguilar',    factorialName: null,                  company: 'MTI',            department: 'RRHH',          isActive: true  },
    { id: 'EMP25-0062', name: 'Arturo Pereira',      factorialName: 'Arturo Pereira',      company: 'MARINA EYE-CAM', department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0063', name: 'Yolanda Calvo',       factorialName: 'Yolanda Calvo',       company: 'MTI',            department: 'Marketing',     isActive: true  },
    { id: 'EMP25-0064', name: 'Sebastián Moya',      factorialName: null,                  company: 'INGECO',         department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0065', name: 'Inmaculada Bravo',    factorialName: 'Inmaculada Bravo',    company: 'MTI',            department: 'Finanzas',      isActive: true  },
    { id: 'EMP25-0066', name: 'Nicolás Esteban',     factorialName: 'Nicolás Esteban',     company: 'MTI',            department: 'IA',            isActive: true  },
    { id: 'EMP25-0067', name: 'Encarnación Rubio',   factorialName: null,                  company: 'DIPRO',          department: 'Administración',isActive: true  },
    { id: 'EMP25-0068', name: 'Leandro Parra',       factorialName: 'Leandro Parra',       company: 'INGECO',         department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0069', name: 'Florencia Montero',   factorialName: null,                  company: 'MTI',            department: 'Proyectos',     isActive: true  },
    { id: 'EMP25-0070', name: 'Celestino Hidalgo',   factorialName: 'Celestino Hidalgo',   company: 'MTI',            department: 'Software',      isActive: false },
    { id: 'EMP25-0071', name: 'Susana Cano',         factorialName: 'Susana Cano',         company: 'MTI',            department: 'RRHH',          isActive: true  },
    { id: 'EMP25-0072', name: 'Primitivo Cruz',      factorialName: null,                  company: 'MARINA EYE-CAM', department: 'Ingeniería',    isActive: true  },
    { id: 'EMP25-0073', name: 'Magdalena Gil',       factorialName: 'Magdalena Gil',       company: 'MTI',            department: 'Administración',isActive: true  },
  ];

  // Assign hourlyCost and monthlySalary based on department
  const deptCosts: Record<string, { hourly: number; monthly: number }> = {
    'Dirección':      { hourly: 110, monthly: 6500 },
    'IA':             { hourly: 95,  monthly: 5200 },
    'Software':       { hourly: 85,  monthly: 4800 },
    'Ingeniería':     { hourly: 75,  monthly: 4200 },
    'Proyectos':      { hourly: 80,  monthly: 4500 },
    'Ventas':         { hourly: 70,  monthly: 4000 },
    'Internacional':  { hourly: 100, monthly: 5800 },
    'Finanzas':       { hourly: 75,  monthly: 4300 },
    'RRHH':           { hourly: 60,  monthly: 3500 },
    'Marketing':      { hourly: 65,  monthly: 3800 },
    'Administración': { hourly: 55,  monthly: 3200 },
    'Eventos':        { hourly: 85,  monthly: 4900 },
    'General':        { hourly: 60,  monthly: 3500 },
  };

  for (const emp of employeesData) {
    const costs = deptCosts[emp.department] || deptCosts['General'];
    await prisma.employee.create({
      data: {
        id:           emp.id,
        name:         emp.name,
        factorialName: emp.factorialName,
        company:      emp.company,
        department:   emp.department,
        isActive:     emp.isActive,
        hourlyCost:   costs.hourly,
        monthlySalary: costs.monthly,
        availability: emp.isActive ? 100 : 0,
      },
    });
  }
  console.log(`${employeesData.length} empleados creados`);

  // ── SALARY DATA ───────────────────────────────────────────
  // Generate salary records for active employees, months Jan-May 2026
  const activeEmps = employeesData.filter(e => e.isActive);
  const salaryMonths = [
    { year: 2025, month: 10 }, { year: 2025, month: 11 }, { year: 2025, month: 12 },
    { year: 2026, month: 1  }, { year: 2026, month: 2  }, { year: 2026, month: 3  },
    { year: 2026, month: 4  }, { year: 2026, month: 5  },
  ];

  let salaryCount = 0;
  for (const emp of activeEmps) {
    const costs = deptCosts[emp.department] || deptCosts['General'];
    for (const { year, month } of salaryMonths) {
      const forecast = costs.monthly;
      const real = forecast * (0.95 + Math.random() * 0.1); // slight variance
      const hours = 146.5;
      const costHour = forecast / hours;
      await prisma.salary.create({
        data: {
          employeeId:         emp.id,
          year,
          month,
          date:               new Date(year, month - 1, 1),
          salaryForecast:     Math.round(forecast * 100) / 100,
          salaryReal:         Math.round(real * 100) / 100,
          hoursMonthForecast: hours,
          percent:            100,
          costHour:           Math.round(costHour * 100) / 100,
        },
      });
      salaryCount++;
    }
  }
  console.log(`${salaryCount} registros de salario creados`);

  // ── CLIENTS ───────────────────────────────────────────────
  const clientNames = [
    'Worldsensing', 'ECONOCOM', 'ETRA', 'BCN SmartTech', 'Incapto',
    'Various', 'P. Freire', 'Unisystems', 'TEKIA', 'GEOACTIO',
    'GMV', 'DIPUTACIO TARRAGONA', 'H2LATAM', 'ZOUH INFORMATION',
    'TECNICAS DEL MAR-IGAPE', 'GALICIA PINTURAS-IGAPE', 'GALMETEC-IGAPE',
    'UCALSA', 'INETUM', 'SAGALES', 'KINGSWAY DYNAMIC PTE LTD',
    'FC Barcelona', 'AJUNTAMENT CALAFELL', 'BPMS', 'RETECH', 'CETAQUA',
    'OBS', 'INNOVIA', 'ITURRI', 'CIVIS', 'HOSPITAL CUNQUEIRO', 'RCFIL-IGAPE',
    'SMA', 'NAVANTIA', 'UOC', 'PHI CARGO', 'FRANASI', 'SEDAL', 'AZIMUT',
    'MERCHANT UNION', 'ORECO', 'ASTILLERO NODOSA', 'SARAWAK STATE',
    'RC CELTA DE VIGO', 'IBERPOMPE', 'DARLIM', 'INDUSTRIAS FERRI', 'FINSA',
    'FERROCARRILS METROPOLITANS BCN', 'TRANSPORTS METROPOLITANS BCN',
    'FCC INDUSTRIAL', 'EET EUROPARTS', 'WAVECOM', 'Telbina', 'DBKU',
    'KSA', 'QATAR', 'LAVAJET', 'ETISALAT', 'CRCC', 'FUJITSU', 'ATM',
    'HILLSA', 'TUS', 'EASTLINK INVESTMENTS', 'MONBUS', 'AUTOCORB',
    'National Security Intelligence Service', 'Khazna', 'ELLU', 'ENGIDI',
    'TMB', 'CONDUENT', 'BTravel', 'Ecoforest', 'New Balance',
    'Sisubvenciones', 'Montajes Cancelas', 'Regensasa', 'Construyelo',
    'Pazo de los Escudos', 'Como Darwin', 'Porlan', 'XAC Constructora',
    'Ardora', 'CITIC-Censa', 'ASPOL', 'FRIOTEIS', 'GRUAS DONIZ',
    'PROMEGA GALICIA', 'FUNDACIO MONTILIVI', 'CARDIOLOGY CENTER - QARSHI',
    'AEI', 'GARABITO', 'CITISEND', 'SAGALES',
  ];

  const uniqueClients = Array.from(new Set(clientNames));
  const clientOwners: Record<string, string> = {
    'Worldsensing': 'XAVI CARNER', 'ECONOCOM': 'OSCAR', 'ETRA': 'JORDI',
    'BCN SmartTech': 'DANI', 'FC Barcelona': 'SERGIO', 'GMV': 'JML',
    'INETUM': 'JML', 'SAGALES': 'JML', 'KINGSWAY DYNAMIC PTE LTD': 'FDB',
    'UOC': 'OSCAR', 'FERROCARRILS METROPOLITANS BCN': 'CARLES',
    'TRANSPORTS METROPOLITANS BCN': 'CARLES', 'SMA': 'MARIA',
    'NAVANTIA': 'JML', 'RETECH': 'SERGIO', 'Telbina': 'JORDI POL',
    'KSA': 'CHADI', 'QATAR': 'CHADI', 'CRCC': 'CHADI',
  };
  const clientCountries: Record<string, string> = {
    'KINGSWAY DYNAMIC PTE LTD': 'Singapore', 'SMA': 'Malaysia',
    'Telbina': 'Malaysia', 'DBKU': 'Malaysia', 'SARAWAK STATE': 'Malaysia',
    'KSA': 'Saudi Arabia', 'QATAR': 'Saudi Arabia', 'LAVAJET': 'Saudi Arabia',
    'ETISALAT': 'Saudi Arabia', 'CRCC': 'Saudi Arabia', 'OBS': 'Saudi Arabia',
    'National Security Intelligence Service': 'Kenya', 'Khazna': 'UAE',
    'ZOUH INFORMATION': 'Spain', 'BPMS': 'Angola', 'PHI CARGO': 'Mexico',
    'CARDIOLOGY CENTER - QARSHI': 'Uzbekistan',
  };

  for (const name of uniqueClients) {
    await prisma.client.create({
      data: {
        name,
        country:      clientCountries[name] || 'Spain',
        primaryOwner: clientOwners[name] || '',
      },
    });
  }
  console.log(`${uniqueClients.length} clientes creados`);

  // ── OPPORTUNITIES ─────────────────────────────────────────
  const opps = [
    {
      id: '25-002', client: 'Worldsensing', opportunity: 'Worldsensing thread x3',
      amount: 19388, statusCode: 7, company: 'DIPRO', owner: 'XAVI CARNER', country: 'Spain',
      blTtioOm: 8388, blProservices: 11000, totalInvoiced: 1398, wipStatus: 7, costs: 458,
      probability: 100, date: new Date('2025-01-15'),
    },
    {
      id: '25-007', client: 'ECONOCOM', opportunity: 'USBC altabox',
      amount: 1443.78, statusCode: 8, company: 'DIPRO', owner: 'OSCAR', country: 'Spain',
      blProservices: 1443.78, totalInvoiced: 1443.78, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2025-01-20'),
    },
    {
      id: '25-008', client: 'Worldsensing', opportunity: 'Worldsensing outsourcing HR ADI',
      amount: 65880, statusCode: 7, company: 'MTI', owner: 'ADI Outsourcing', country: 'Spain',
      blProservices: 65880, totalInvoiced: 27000, wipStatus: 41, costs: 0, margin: 100,
      probability: 100, date: new Date('2025-01-25'),
    },
    {
      id: '25-009', client: 'ETRA', opportunity: 'ETRA pielh',
      amount: 22000, statusCode: 7, company: 'MTI', owner: 'Jordi Puig', country: 'Spain',
      blProservices: 22000, totalInvoiced: 0, wipStatus: 0, costs: 800,
      probability: 100, date: new Date('2025-01-28'),
    },
    {
      id: '25-010', client: 'BCN SmartTech', opportunity: 'GTI smart city proof of concept',
      amount: 62580, statusCode: 7, company: 'MTI', owner: 'Daniel Alonso', country: 'Spain',
      blProservices: 62580, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2025-02-01'),
    },
    {
      id: '25-012', client: 'Incapto', opportunity: 'Incapto placas orange 300u',
      amount: 9964, statusCode: 8, company: 'DIPRO', owner: '', country: 'Spain',
      blProservices: 9964, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2025-02-10'),
    },
    {
      id: '25-016', client: 'Various', opportunity: 'TTiO SaaS',
      amount: 87000, statusCode: 7, company: 'DIPRO', owner: 'Javier Martínez', country: 'Spain',
      blTtioOm: 87000, totalInvoiced: 23872, wipStatus: 27, costs: 20919.21, margin: 12.37,
      probability: 100, date: new Date('2025-02-15'),
    },
    {
      id: '25-017', client: 'P. Freire', opportunity: 'MTi construcciones navales p. freire',
      amount: 120962.52, statusCode: 7, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blProservices: 120962.52, totalInvoiced: 84481.76, wipStatus: 70, costs: 113282.36, margin: 100,
      probability: 100, date: new Date('2025-02-20'), endDate: new Date('2026-06-30'),
    },
    {
      id: '25-041', client: 'Unisystems', opportunity: 'SMART SOLAR WATERS HEATERS',
      amount: 53660, statusCode: 7, company: 'MTI', owner: 'Jordi Puig', country: 'Spain',
      blTtioOm: 26830, blProservices: 26830, totalInvoiced: 25483, wipStatus: 47, costs: 0, margin: 100,
      probability: 100, date: new Date('2025-03-01'), acceptanceDate: new Date('2025-11-07'),
    },
    {
      id: '25-068', client: 'Worldsensing', opportunity: 'WORLDSENSING WHITE LABEL',
      amount: 50000, statusCode: 6, company: 'MTI', owner: 'XAVI CARNER', country: 'Spain',
      blTtioOm: 45000, blProservices: 5000, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2025-03-05'),
    },
    {
      id: '25-088', client: 'TEKIA', opportunity: 'Instalacion Equipos TMB/ALSA',
      amount: 7596, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 7596, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2025-12-17'),
    },
    {
      id: '25-089', client: 'GEOACTIO', opportunity: 'Reparación de 10 Validadoras en Flota TUS Sabadell',
      amount: 1350, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 1350, totalInvoiced: 0, wipStatus: 0, costs: 60.71,
      probability: 100, date: new Date('2024-05-13'),
    },
    {
      id: '25-093', client: 'GMV', opportunity: 'Ampliaciones SAEATMBCN',
      amount: 60000, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 60000, totalInvoiced: 22071, wipStatus: 37, costs: 0, margin: 100,
      probability: 100, date: new Date('2024-09-20'),
    },
    {
      id: '25-095', client: 'GMV', opportunity: 'Ampliaciones CCTVATMBCN',
      amount: 60000, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 60000, totalInvoiced: 22440, wipStatus: 37, costs: 73.82, margin: 99.67,
      probability: 100, date: new Date('2024-10-03'),
    },
    {
      id: '25-108', client: 'GMV', opportunity: 'Instalacion de SAE en Autobuses de Castilla y León',
      amount: 150000, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 150000, totalInvoiced: 81493.92, wipStatus: 54, costs: 3184.88, margin: 96.09,
      probability: 100, date: new Date('2025-01-15'),
    },
    {
      id: '25-121', client: 'DIPUTACIO TARRAGONA', opportunity: 'Contadores Agua Municipios-Plataforma Diputación',
      amount: 1680000, statusCode: 5, company: 'MTI', owner: 'Daniel Alonso', country: 'Spain',
      blHardware: 1680000, probability: 60, date: new Date('2025-03-16'),
    },
    {
      id: '25-122', client: 'H2LATAM', opportunity: 'Pulseras Personas Mayores',
      amount: 14500, statusCode: 2, company: 'MTI', owner: 'Daniel Alonso', country: 'Spain',
      blProservices: 14500, probability: 5, date: new Date('2025-03-13'),
    },
    {
      id: '25-129', client: 'ZOUH INFORMATION', opportunity: 'Asesoramiento Smart City Turquia',
      amount: 27734, statusCode: 7, company: 'MTI', owner: 'FDB Director', country: 'Spain',
      blProservices: 27734, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2025-03-28'),
    },
    {
      id: '25-134', client: 'TECNICAS DEL MAR-IGAPE', opportunity: 'Prediccion de la demanda',
      amount: 0, statusCode: 8, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      observations: 'IGAPE 2025', probability: 100, date: new Date('2025-04-09'),
    },
    {
      id: '25-135', client: 'GALICIA PINTURAS-IGAPE', opportunity: 'Predicción de la demanda',
      amount: 0, statusCode: 8, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      observations: 'IGAPE 2025', costs: 14100, probability: 100, date: new Date('2025-04-09'),
    },
    {
      id: '25-137', client: 'GALMETEC-IGAPE', opportunity: 'Plataforma Integración ERP',
      amount: 0, statusCode: 8, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      observations: 'IGAPE 2025', costs: 15300, probability: 100, date: new Date('2025-04-09'),
    },
    {
      id: '25-138', client: 'UCALSA', opportunity: 'Plataforma Integración ERP UCALSA',
      amount: 32600, statusCode: 4, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 32600, probability: 40, observations: 'IGAPE 2025', date: new Date('2025-04-09'),
    },
    {
      id: '25-139', client: 'TECNICAS DEL MAR-IGAPE', opportunity: 'Plataforma Integración ERP',
      amount: 0, statusCode: 8, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      observations: 'IGAPE 2025', costs: 32400, probability: 100, date: new Date('2025-04-09'),
    },
    {
      id: '25-143', client: 'INETUM', opportunity: 'Renovación de 90 máquinas autoventa Red Metro TMB',
      amount: 152100, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 152100, probability: 60, date: new Date('2025-04-09'),
    },
    {
      id: '25-151', client: 'SAGALES', opportunity: 'Instalar T Mobilitat + SAE en Autobuses Nuevos',
      amount: 24160, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 24160, totalInvoiced: 11248, wipStatus: 47, costs: 125.45, margin: 98.88,
      probability: 100, date: new Date('2025-04-23'),
    },
    {
      id: '25-155', client: 'SAGALES', opportunity: 'Desplazar Monitor Conductor en 190 Autobuses',
      amount: 18260, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 18260, totalInvoiced: 16500, wipStatus: 90, costs: 0, margin: 100,
      probability: 100, date: new Date('2025-05-08'),
    },
    {
      id: '25-156', client: 'KINGSWAY DYNAMIC PTE LTD', opportunity: 'Fusion Center Singapore',
      amount: 245762.71, statusCode: 8, company: 'MTI', owner: 'FDB Director', country: 'Singapore',
      blProservices: 245762.71, totalInvoiced: 243309, wipStatus: 99, costs: 237965.95, margin: 2.2,
      probability: 100, date: new Date('2025-05-08'), acceptanceDate: new Date('2025-06-02'),
    },
    {
      id: '25-157', client: 'FC Barcelona', opportunity: 'Servicios Profesionales Implantacion Digital Twin',
      amount: 720000, statusCode: 5, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 720000, probability: 60, date: new Date('2025-05-16'),
    },
    {
      id: '25-162', client: 'AJUNTAMENT CALAFELL', opportunity: 'Licitacion Calafell Xarxa de Càmeres CCTV',
      amount: 14900, statusCode: 5, company: 'MTI', owner: 'Daniel Alonso', country: 'Spain',
      blHardware: 14900, probability: 60, date: new Date('2025-05-26'),
    },
    {
      id: '25-165', client: 'INETUM', opportunity: 'Instalación Datafono Autobuses Castilla y Leon',
      amount: 181820, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 181820, probability: 60, date: new Date('2025-05-26'),
    },
    {
      id: '25-170', client: 'BPMS', opportunity: 'Desarrollo Sistema Mantenimiento para Proyectos',
      amount: 22020, statusCode: 7, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Angola',
      blIa: 22020, totalInvoiced: 18000, wipStatus: 82, costs: 0, margin: 100,
      observations: 'IGAPE 2025', probability: 100, date: new Date('2025-06-12'),
    },
    {
      id: '25-171', client: 'RETECH', opportunity: 'Desarrollo IA Agentiva para MICE',
      amount: 187661.25, statusCode: 7, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 187661.25, totalInvoiced: 0, wipStatus: 0, costs: 31558.66,
      probability: 100, date: new Date('2025-06-12'),
    },
    {
      id: '25-173', client: 'CETAQUA', opportunity: 'Geofono y Soundwater',
      amount: 16640, statusCode: 5, company: 'MTI', owner: 'Daniel Alonso', country: 'Spain',
      blProservices: 16640, probability: 60, date: new Date('2025-06-19'),
    },
    {
      id: '25-175', client: 'OBS', opportunity: 'KAFD Change Request Contract CR2',
      amount: 630000, statusCode: 9, company: 'MTI', owner: 'Thierry Bernard', country: 'Saudi Arabia',
      blHardware: 630000, probability: 0, date: new Date('2025-06-19'),
    },
    {
      id: '25-176', client: 'INETUM', opportunity: 'Instalación WIFI en Bus Turistic TMB',
      amount: 16733.78, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 16733.78, probability: 60, date: new Date('2025-06-10'),
    },
    {
      id: '25-181', client: 'INNOVIA', opportunity: 'Reparación Placas Paneles Autopistas',
      amount: 12000, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 12000, probability: 60, date: new Date('2025-07-07'),
    },
    {
      id: '25-183', client: 'ITURRI', opportunity: 'Piloto SmartBus',
      amount: 30000, statusCode: 3, company: 'MTI', owner: 'JML Director', country: 'Spain',
      blProservices: 30000, probability: 20, date: new Date('2025-07-10'),
    },
    {
      id: '25-184', client: 'H2LATAM', opportunity: 'Instalar 2 Cargadores Electricos Semirapidos',
      amount: 30000, statusCode: 3, company: 'MTI', owner: 'JML Director', country: 'Spain',
      blHardware: 30000, probability: 20, date: new Date('2025-07-10'),
    },
    {
      id: '25-185', client: 'H2LATAM', opportunity: 'Instalación Cable Guiado en Parking Castellon',
      amount: 8700, statusCode: 3, company: 'MTI', owner: 'JML Director', country: 'Spain',
      blProservices: 8700, probability: 20, date: new Date('2025-07-10'),
    },
    {
      id: '25-188', client: 'CIVIS', opportunity: 'Configurador de Ofertas',
      amount: 15000, statusCode: 5, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 15000, probability: 60, observations: 'IGAPE 2025', date: new Date('2025-05-28'),
    },
    {
      id: '25-192', client: 'HOSPITAL CUNQUEIRO', opportunity: 'LLM SIGI Hospital Cunqueiro',
      amount: 10500, statusCode: 7, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 10500, totalInvoiced: 0, wipStatus: 0, costs: 10500,
      observations: 'IGAPE 2025', probability: 100,
      date: new Date('2025-07-14'), acceptanceDate: new Date('2025-08-10'),
    },
    {
      id: '25-195', client: 'GALICIA PINTURAS-IGAPE', opportunity: 'Plataforma Integracion ERP GALPI',
      amount: 0, statusCode: 8, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      observations: 'IGAPE 2025', costs: 18450, probability: 100, date: new Date('2025-04-09'),
    },
    {
      id: '25-196', client: 'INETUM', opportunity: 'Pintado Validadoras EMV TMB BUS',
      amount: 11340, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 11340, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2025-08-08'),
    },
    {
      id: '25-199', client: 'RCFIL-IGAPE', opportunity: 'Prediccion de la demanda',
      amount: 0, statusCode: 8, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      observations: 'IGAPE 2025', costs: 17600, probability: 100, date: new Date('2025-08-01'),
    },
    {
      id: '25-205', client: 'INNOVIA', opportunity: 'Suministro EOTEC 2000 2A06 Tunel 0 Sur',
      amount: 648, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 648, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2025-10-06'),
    },
    {
      id: '25-206', client: 'INNOVIA', opportunity: 'Suministro Recambios Panel PV32S89.6',
      amount: 979.38, statusCode: 4, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 979.38, probability: 40, date: new Date('2025-10-07'),
    },
    {
      id: '25-208', client: 'FC Barcelona', opportunity: 'BIM 2 GMAO (Fase II)',
      amount: 99900, statusCode: 7, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blBim: 99900, totalInvoiced: 99900, wipStatus: 92, costs: 0, margin: 91.67,
      probability: 100, date: new Date('2025-10-09'), acceptanceDate: new Date('2025-10-09'),
    },
    {
      id: '25-209', client: 'INNOVIA', opportunity: 'Reparar Cargador Circutor',
      amount: 264, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 264, totalInvoiced: 0, wipStatus: 0, costs: 120,
      probability: 100, date: new Date('2025-10-10'),
    },
    {
      id: '25-210', client: 'TUSGSAL', opportunity: 'Instalacion T Mobilitat + Azimut Autobuses Nueva Flota',
      amount: 11704, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 11704, totalInvoiced: 11704, wipStatus: 100, costs: 35.88, margin: 99.69,
      probability: 100, date: new Date('2025-10-14'),
    },
    {
      id: '25-211', client: 'COPLEGAL-IGAPE', opportunity: 'Plataforma IGAPE Arquitectura Integracion Coplegal',
      amount: 0, statusCode: 8, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      observations: 'IGAPE 2025', costs: 32900, probability: 100,
      date: new Date('2025-10-22'), acceptanceDate: new Date('2025-10-22'),
    },
    {
      id: '25-213', client: 'SMA', opportunity: 'MWC26 booth design + management',
      amount: 415125, statusCode: 7, company: 'MTI', owner: 'Maria García', country: 'Malaysia',
      blEvents: 415125, totalInvoiced: 415125, wipStatus: 100, costs: 183226.48, margin: 55.86,
      probability: 100, date: new Date('2025-10-09'), acceptanceDate: new Date('2025-11-19'),
    },
    {
      id: '25-214', client: 'NAVANTIA', opportunity: 'NAVANTIA GRUAS FASE 2',
      amount: 66780, statusCode: 7, company: 'DIPRO', owner: 'JML Director', country: 'Spain',
      blProservices: 66780, totalInvoiced: 0, wipStatus: 0, costs: 792.85,
      probability: 100, date: new Date('2025-10-22'), acceptanceDate: new Date('2025-12-05'),
    },
    {
      id: '25-215', client: 'UOC', opportunity: 'UOC Oct25 Multimetre i Components 85 uds',
      amount: 6800, statusCode: 8, company: 'DIPRO', owner: 'Oscar Pérez', country: 'Spain',
      blHardware: 6800, totalInvoiced: 6800, wipStatus: 100, costs: 0, margin: 100,
      probability: 100, date: new Date('2025-10-22'), acceptanceDate: new Date('2025-12-31'),
    },
    {
      id: '25-216', client: 'UOC', opportunity: 'UOC Oct25 KitArduino 30 uds',
      amount: 2925, statusCode: 8, company: 'DIPRO', owner: 'Oscar Pérez', country: 'Spain',
      blHardware: 2925, totalInvoiced: 2925, wipStatus: 100, costs: 2416.50, margin: 17.38,
      probability: 100, date: new Date('2025-10-22'),
    },
    {
      id: '25-217', client: 'UOC', opportunity: 'UOC Oct25 LabHome 95 uds',
      amount: 12302.50, statusCode: 8, company: 'DIPRO', owner: 'Oscar Pérez', country: 'Spain',
      blHardware: 12302.50, totalInvoiced: 12302.50, wipStatus: 100, costs: 10.39, margin: 99.92,
      probability: 100, date: new Date('2025-10-22'),
    },
    {
      id: '25-219', client: 'INETUM', opportunity: 'Instalar y Mantener Sistema Ticketing Terrassa',
      amount: 99852, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 99852, probability: 60, date: new Date('2025-10-22'),
    },
    {
      id: '25-220', client: 'INETUM', opportunity: 'Instalación Bag Drop en Aeropuerto AENA BARAJAS',
      amount: 7920, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 7920, probability: 60, date: new Date('2025-10-23'),
    },
    {
      id: '25-221', client: 'UOC', opportunity: 'UOC IRIDIUM Bolsa de horas (Marc)',
      amount: 5380, statusCode: 7, company: 'DIPRO', owner: 'Oscar Pérez', country: 'Spain',
      blProservices: 5380, totalInvoiced: 0, wipStatus: 0, costs: 0,
      observations: 'Facturar antes de 25/11', probability: 100, date: new Date('2025-10-24'),
    },
    {
      id: '25-222', client: 'VITRADOC', opportunity: 'VITRADOC Fase 2',
      amount: 22280, statusCode: 7, company: 'MTI', owner: 'Javier Martínez', country: 'Spain',
      blProservices: 22280, totalInvoiced: 11440, wipStatus: 51, costs: 0, margin: 100,
      probability: 100, date: new Date('2025-10-26'),
    },
    {
      id: '25-223', client: 'INDUSTRIAS FERRI', opportunity: 'LLMs Ferri Configurador Ofertas',
      amount: 14550, statusCode: 7, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 14550, totalInvoiced: 14550, wipStatus: 100, costs: 4365, margin: 70,
      observations: 'IGAPE 2025', probability: 100,
      date: new Date('2025-11-07'), acceptanceDate: new Date('2026-01-01'),
    },
    {
      id: '25-224', client: 'FINSA', opportunity: 'Piloto IA-BIM FINSA',
      amount: 15000, statusCode: 5, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 7500, blBim: 7500, probability: 60, date: new Date('2025-05-10'),
    },
    {
      id: '25-225', client: 'ECONOCOM', opportunity: 'USBC Altabox Nov25',
      amount: 3202.79, statusCode: 8, company: 'DIPRO', owner: 'Oscar Pérez', country: 'Spain',
      blHardware: 3202.79, totalInvoiced: 481.26, wipStatus: 15, costs: 41.74, margin: 91.33,
      probability: 100, date: new Date('2025-11-13'),
    },
    {
      id: '25-226', client: 'PHI CARGO', opportunity: 'Tailers Mexico Phi Cargo',
      amount: 15000, statusCode: 4, company: 'MTI', owner: 'Javier Martínez', country: 'Mexico',
      blProservices: 15000, probability: 40, date: new Date('2025-10-10'),
    },
    {
      id: '25-227', client: 'INNOVIA', opportunity: 'Suministro Material Túnel 4 Sur',
      amount: 5050.30, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 5050.30, totalInvoiced: 0, wipStatus: 0, costs: 170.25,
      probability: 100, date: new Date('2025-10-31'),
    },
    {
      id: '25-229', client: 'INETUM', opportunity: 'Instalacion Pupitre, Validadora y Sistema Central Bilbobus',
      amount: 770154, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blHardware: 770154, probability: 60, date: new Date('2025-11-19'),
    },
    {
      id: '25-230', client: 'FRANASI', opportunity: 'Prosica Motiba Digital Delivery Proposal',
      amount: 22340, statusCode: 7, company: 'MTI', owner: 'Chloe Dupont', country: 'Spain',
      blProservices: 22340, totalInvoiced: 0, wipStatus: 0, costs: 1089.90,
      probability: 100, date: new Date('2025-11-19'),
    },
    {
      id: '25-231', client: 'Worldsensing', opportunity: 'World Sensing - Nueva Era (proyecto trabajo interno)',
      amount: 0, statusCode: 7, company: 'MTI', owner: 'Jesús Fernández', country: 'Spain',
      probability: 100, date: new Date('2025-12-04'),
    },
    {
      id: '25-232', client: 'SEDAL', opportunity: 'SEDAL-Nuevo acuerdo Plataforma TTIO',
      amount: 8300, statusCode: 7, company: 'MTI', owner: 'Javier Martínez', country: 'Spain',
      blTtioOm: 8300, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2025-12-05'), acceptanceDate: new Date('2025-12-31'),
    },
    {
      id: '25-233', client: 'AZIMUT', opportunity: 'Instalación ADAS Flota 36 Vehiculos',
      amount: 16200, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 16200, totalInvoiced: 14850, wipStatus: 92, costs: 0, margin: 100,
      probability: 100, date: new Date('2025-12-23'), acceptanceDate: new Date('2026-01-30'),
    },
    {
      id: '25-234', client: 'MERCHANT UNION', opportunity: 'CPM MaruXIA',
      amount: 3000000, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 3000000, probability: 20, date: new Date('2025-03-31'),
    },
    {
      id: '25-235', client: 'ORECO', opportunity: 'Generador de Ofertas Oreco',
      amount: 33900, statusCode: 4, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 33900, probability: 40, date: new Date('2025-07-31'),
    },
    {
      id: '25-236', client: 'ASTILLERO NODOSA', opportunity: 'Configurador de Ofertas IA Agentiva',
      amount: 15000, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 15000, probability: 20, date: new Date('2025-09-30'),
    },
    {
      id: '25-237', client: 'SARAWAK STATE', opportunity: 'Estudio Viabilidad Fondos FIEM Sarawak',
      amount: 565000, statusCode: 5, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Malaysia',
      blProservices: 565000, probability: 60, date: new Date('2025-09-30'),
    },
    {
      id: '25-238', client: 'RC CELTA DE VIGO', opportunity: 'Negocio: Mary en RC Celta de Vigo',
      amount: 65000, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 65000, probability: 20, date: new Date('2025-09-30'),
    },
    {
      id: '25-239', client: 'IBERPOMPE', opportunity: 'IA Agentiva Control de Stocks TR Iberpompe',
      amount: 23000, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 23000, probability: 20, date: new Date('2025-10-31'),
    },
    {
      id: '25-240', client: 'DARLIM', opportunity: 'Automatización pedidos por rutas logísticas Darlim',
      amount: 28500, statusCode: 4, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 28500, probability: 40, date: new Date('2025-11-30'),
    },
    {
      id: '25-241', client: 'INDUSTRIAS FERRI', opportunity: 'Herramienta Auditoria IA Ferri',
      amount: 14700, statusCode: 5, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 14700, probability: 60, date: new Date('2025-12-31'),
    },
    {
      id: '26-000', client: 'FERROCARRILS METROPOLITANS BCN', opportunity: 'Manteniment Preventiu/Correctiu Tram Nord L9/L10',
      amount: 69303, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blProservices: 69303, totalInvoiced: 12859.97, wipStatus: 19, costs: 207909, margin: 100,
      probability: 100, date: new Date('2026-01-01'), acceptanceDate: new Date('2026-01-01'),
    },
    {
      id: '26-001', client: 'FERROCARRILS METROPOLITANS BCN', opportunity: 'Manteniment Preventiu/Correctiu Tram Sud L9/L10',
      amount: 91866.61, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blProservices: 91866.61, totalInvoiced: 0, wipStatus: 0, costs: 275599.82,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-002', client: 'FERROCARRILS METROPOLITANS BCN', opportunity: 'Manteniment càmeres sistema Tram IV L9/L10 Nord',
      amount: 24276, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blProservices: 24276, totalInvoiced: 4541.67, wipStatus: 19, costs: 72828, margin: 100,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-003', client: 'FERROCARRILS METROPOLITANS BCN', opportunity: 'Manteniment càmeres sistema Tram IV L9/L10 Sud',
      amount: 36414, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blProservices: 36414, totalInvoiced: 0, wipStatus: 0, costs: 109242,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-004', client: 'TRANSPORTS METROPOLITANS BCN', opportunity: 'Manteniment Sistema Video IP Cons Horta',
      amount: 17537.98, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blProservices: 17537.98, totalInvoiced: 4384.49, wipStatus: 25, costs: 52613.93, margin: 100,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-005', client: 'TRANSPORTS METROPOLITANS BCN', opportunity: 'Manteniment Sistema Video IP Cons ZFI',
      amount: 16827.78, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blProservices: 16827.78, totalInvoiced: 4206.95, wipStatus: 25, costs: 50483.34, margin: 100,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-006', client: 'TRANSPORTS METROPOLITANS BCN', opportunity: 'Manteniment Sistema Video IP Cons Triangle',
      amount: 15032.55, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blProservices: 15032.55, totalInvoiced: 3758.14, wipStatus: 25, costs: 45097.66, margin: 100,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-007', client: 'TRANSPORTS METROPOLITANS BCN', opportunity: 'Manteniment Sistema Video IP Cons Ponent',
      amount: 10376.80, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blProservices: 10376.80, totalInvoiced: 2594.20, wipStatus: 25, costs: 31130.41, margin: 100,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-008', client: 'TRANSPORTS METROPOLITANS BCN', opportunity: 'Mant. Sistema Seguretat Detecció Intrusió FMB',
      amount: 30166.47, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blProservices: 30166.47, totalInvoiced: 0, wipStatus: 0, costs: 60332.94,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-009', client: 'FERROCARRILS METROPOLITANS BCN', opportunity: 'Manteniment Control d\'Accesos L9',
      amount: 98310, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blProservices: 98310, totalInvoiced: 7692.40, wipStatus: 8, costs: 393240, margin: 100,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-010', client: 'FCC INDUSTRIAL', opportunity: 'Ampliación CON Zona Franca BUS',
      amount: 25875.66, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blHardware: 25875.66, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-011', client: 'FCC INDUSTRIAL', opportunity: 'Nuevas estaciones de L9 TRAMO III / mano de obra',
      amount: 185964.72, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blHardware: 185964.72, totalInvoiced: 0, wipStatus: 0, costs: 743858.88,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-012', client: 'EET EUROPARTS', opportunity: 'Nuevas estaciones de L9 TRAMO III / mano de obra',
      amount: 429132.60, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blHardware: 429132.60, totalInvoiced: 0, wipStatus: 0, costs: 1716530.40,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-013', client: 'WAVECOM', opportunity: 'Renovación Obsolescencia L9 Fase 2 / mano de obra',
      amount: 121500, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blHardware: 121500, totalInvoiced: 0, wipStatus: 0, costs: 121500,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-014', client: 'EET EUROPARTS', opportunity: 'Renovación Obsolescencia L9 Fase 2 / Materiales',
      amount: 436780.50, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blHardware: 436780.50, totalInvoiced: 0, wipStatus: 0, costs: 436780.50,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-015', client: 'TRANSPORTS METROPOLITANS BCN', opportunity: 'Implantació Sistema commutació i control temps real CSPC',
      amount: 398000, statusCode: 7, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blHardware: 318400, blProservices: 79600, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2026-01-22'), acceptanceDate: new Date('2026-01-23'),
    },
    {
      id: '26-016', client: 'FERROCARRILS METROPOLITANS BCN', opportunity: 'Desplegament de video IP Fase 7 a Metro',
      amount: 175000, statusCode: 5, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blHardware: 175000, probability: 60, date: new Date('2026-01-22'),
    },
    {
      id: '26-017', client: 'FERROCARRILS METROPOLITANS BCN', opportunity: 'Suministrament Material (Cámares)',
      amount: 1301.80, statusCode: 8, company: 'MARINA EYE-CAM', owner: 'Carles Soler', country: 'Spain',
      blHardware: 1301.80, totalInvoiced: 1301.80, wipStatus: 100, costs: 0, margin: 100,
      probability: 100, date: new Date('2026-01-22'), acceptanceDate: new Date('2026-01-23'),
    },
    {
      id: '26-100', client: 'Telbina', opportunity: 'Smart Villages platform & Use Cases',
      amount: 800000, statusCode: 4, company: 'BCN', owner: 'Jordi Pol', country: 'Malaysia',
      blHardware: 600000, blProservices: 200000, probability: 40, date: new Date('2026-01-22'),
    },
    {
      id: '26-101-a', client: 'DBKU', opportunity: 'Smart City Platform Kuching',
      amount: 50000, statusCode: 4, company: 'BCN', owner: 'Jordi Pol', country: 'Malaysia',
      blHardware: 50000, probability: 40, date: new Date('2026-01-22'),
    },
    {
      id: '26-101-b', client: 'Telbina', opportunity: 'Smart City Bintulu',
      amount: 1000000, statusCode: 4, company: 'BCN', owner: 'Jordi Pol', country: 'Malaysia',
      blHardware: 500000, blProservices: 500000, probability: 40, date: new Date('2026-04-25'),
    },
    {
      id: '26-201', client: 'KSA', opportunity: 'KSA - Madina Development Authority - Smart Lighting',
      amount: 200000, statusCode: 5, company: 'MTI ARABIA', owner: 'Chadi Nasr', country: 'Saudi Arabia',
      blHardware: 200000, probability: 60, currency: 'USD', date: new Date('2026-01-01'),
    },
    {
      id: '26-202', client: 'KSA', opportunity: 'KSA - Various Projects',
      amount: 300000, statusCode: 5, company: 'MTI ARABIA', owner: 'Chadi Nasr', country: 'Saudi Arabia',
      blProservices: 300000, probability: 60, currency: 'USD', date: new Date('2026-01-01'),
    },
    {
      id: '26-203', client: 'QATAR', opportunity: 'Qatar - Lavajet Smart Waste Management',
      amount: 412000, statusCode: 7, company: 'MTI ARABIA', owner: 'Chadi Nasr', country: 'Saudi Arabia',
      blProservices: 412000, totalInvoiced: 0, wipStatus: 0, costs: 0,
      currency: 'USD', probability: 100, date: new Date('2026-01-01'), acceptanceDate: new Date('2026-01-01'),
    },
    {
      id: '26-204', client: 'QATAR', opportunity: 'Qatar - Lavajet Smart Waste Management - VO',
      amount: 328767, statusCode: 5, company: 'MTI ARABIA', owner: 'Chadi Nasr', country: 'Saudi Arabia',
      blProservices: 328767, probability: 60, currency: 'USD', date: new Date('2026-01-01'),
    },
    {
      id: '26-205', client: 'QATAR', opportunity: 'Qatar - STEE',
      amount: 150000, statusCode: 5, company: 'MTI ARABIA', owner: 'Chadi Nasr', country: 'Saudi Arabia',
      blProservices: 150000, probability: 60, currency: 'USD', date: new Date('2026-01-01'),
    },
    {
      id: '26-206', client: 'LAVAJET', opportunity: 'Lavajet - Saudi/Lebanon/UAE',
      amount: 200000, statusCode: 5, company: 'MTI ARABIA', owner: 'Chadi Nasr', country: 'Saudi Arabia',
      blProservices: 200000, probability: 60, currency: 'USD', date: new Date('2026-01-01'),
    },
    {
      id: '26-207', client: 'ETISALAT', opportunity: 'Egypt - Etisalat',
      amount: 100000, statusCode: 5, company: 'MTI ARABIA', owner: 'Chadi Nasr', country: 'Saudi Arabia',
      blProservices: 100000, probability: 60, currency: 'USD', date: new Date('2026-01-01'),
    },
    {
      id: '26-208', client: 'CRCC', opportunity: 'Jeddah - Smart Digital Twin',
      amount: 870000, statusCode: 4, company: 'MTI ARABIA', owner: 'Chadi Nasr', country: 'Saudi Arabia',
      blIa: 270000, blProservices: 600000, probability: 40, currency: 'USD', costs: 460.80, date: new Date('2025-11-02'),
    },
    {
      id: '26-209', client: 'CRCC', opportunity: 'Corporate Academy Dhahran Digital Twin',
      amount: 750000, statusCode: 4, company: 'MTI ARABIA', owner: 'Chadi Nasr', country: 'Saudi Arabia',
      blIa: 250000, blProservices: 500000, probability: 40, currency: 'USD', date: new Date('2025-11-02'),
    },
    {
      id: '26-400', client: 'FUJITSU', opportunity: 'Reparar Equipos Proveedor Externo',
      amount: 15000, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 15000, totalInvoiced: 6600.21, wipStatus: 44, costs: 2516.68, margin: 61.87,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-401', client: 'FUJITSU', opportunity: 'Reparar Equipos Personal Interno',
      amount: 20000, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 20000, totalInvoiced: 5280, wipStatus: 26, costs: 236.36, margin: 95.52,
      probability: 100, date: new Date('2026-01-01'),
    },
    {
      id: '26-402', client: 'KINGSWAY DYNAMIC PTE LTD', opportunity: 'Suministro, Licencia y Soporte de Software Insight Data Analysis Software',
      amount: 2852194.92, statusCode: 7, company: 'MTI', owner: 'FDB Director', country: 'Singapore',
      blProservices: 2852194.92, totalInvoiced: 640274.04, wipStatus: 22, costs: 0, margin: 100,
      probability: 100, date: new Date('2025-12-23'), acceptanceDate: new Date('2026-01-01'),
    },
    {
      id: '26-403', client: 'INNOVIA', opportunity: 'Reparar Armarios PV32N104.5',
      amount: 6636.82, statusCode: 4, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 6636.82, probability: 40, date: new Date('2026-01-07'),
    },
    {
      id: '26-404', client: 'ATM', opportunity: 'Mantenimiento Primer Nivel CCTV',
      amount: 12351, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 12351, probability: 60, date: new Date('2026-01-07'),
    },
    {
      id: '26-405', client: 'SAGALES', opportunity: 'Diseño y Fabricación Totem Marquesinas (200 Ud)',
      amount: 960000, statusCode: 4, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blHardware: 960000, probability: 40, date: new Date('2026-01-12'),
    },
    {
      id: '26-406', client: 'INNOVIA', opportunity: 'Suministro Material Panel PV32N104.5N',
      amount: 594, statusCode: 8, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blHardware: 594, totalInvoiced: 594, wipStatus: 100, costs: 387.05, margin: 34.84,
      probability: 100, date: new Date('2026-01-12'), acceptanceDate: new Date('2026-01-13'),
    },
    {
      id: '26-407', client: 'INNOVIA', opportunity: 'Suministro Catalyst 2930 Plus POE + Configuración',
      amount: 1650, statusCode: 8, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blHardware: 1650, totalInvoiced: 1650, wipStatus: 100, costs: 737.32, margin: 55.31,
      probability: 100, date: new Date('2026-01-12'), acceptanceDate: new Date('2026-01-13'),
    },
    {
      id: '26-408', client: 'HILLSA', opportunity: 'Instalacion Tmobilitat + SAE Autobuses Nueva Flota',
      amount: 4832, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 4832, totalInvoiced: 4832, wipStatus: 100, costs: 0, margin: 100,
      probability: 100, date: new Date('2026-01-12'), acceptanceDate: new Date('2026-01-12'),
    },
    {
      id: '26-409', client: 'BTravel', opportunity: 'Formación reducida IA BTravel',
      amount: 700, statusCode: 7, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 700, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2025-12-22'), acceptanceDate: new Date('2026-01-16'),
    },
    {
      id: '26-410', client: 'TUS', opportunity: 'Instalación Sistema GEOACTIO en 1 Bus',
      amount: 580, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 580, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2026-01-20'), acceptanceDate: new Date('2026-01-20'),
    },
    {
      id: '26-411', client: 'GEOACTIO', opportunity: 'Instalación de 160 Validadoras en Flota TUS Sabadell',
      amount: 45760, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blHardware: 9760, blProservices: 36000, probability: 60, date: new Date('2026-01-22'),
    },
    {
      id: '26-412', client: 'EASTLINK INVESTMENTS', opportunity: 'Validacion, Testeo y Certificación ComBox70',
      amount: 10000, statusCode: 7, company: 'MTI', owner: 'JML Director', country: 'Spain',
      blProservices: 10000, totalInvoiced: 7000, wipStatus: 70, costs: 6000, margin: 14.29,
      probability: 100, date: new Date('2026-01-22'), acceptanceDate: new Date('2026-01-23'),
    },
    {
      id: '26-413', client: 'GMV', opportunity: 'Cambiar SIMs Moventia',
      amount: 1540, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 1540, probability: 60, date: new Date('2026-01-22'),
    },
    {
      id: '26-414', client: 'AVANZA', opportunity: 'Instalacion T Mobilitat en Autobuses Nueva Flota',
      amount: 7534.80, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 7534.80, totalInvoiced: 7534.80, wipStatus: 100, costs: 524.72, margin: 93.04,
      probability: 100, date: new Date('2026-01-09'), acceptanceDate: new Date('2026-01-09'),
    },
    {
      id: '26-415', client: 'INETUM', opportunity: 'Mantenimiento N3 Validadoras TMB',
      amount: 42000, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 42000, totalInvoiced: 14000, wipStatus: 33, costs: 0, margin: 100,
      probability: 100, date: new Date('2026-01-28'), acceptanceDate: new Date('2026-02-03'),
    },
    {
      id: '26-416', client: 'INNOVIA', opportunity: 'Reparar Incidencias Informe Baja Tension',
      amount: 0, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      probability: 60, date: new Date('2026-01-26'),
    },
    {
      id: '26-417', client: 'CITISEND', opportunity: 'Sustituir Dispositivos Basuras',
      amount: 6000, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 6000, totalInvoiced: 9330, wipStatus: 156, costs: 52.73, margin: 99.43,
      probability: 100, date: new Date('2026-01-30'), acceptanceDate: new Date('2026-01-30'),
    },
    {
      id: '26-418', client: 'UOC', opportunity: 'Sistemes Encastats 2026',
      amount: 0, statusCode: 9, company: 'DIPRO', owner: 'Oscar Pérez', country: 'Spain',
      probability: 0, date: new Date('2026-01-30'),
    },
    {
      id: '26-419', client: 'Ecoforest', opportunity: 'MVP Fase 2 Asistente Postventa Ecoforest',
      amount: 34500, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 34500, probability: 20, observations: 'IGAPE 2026', date: new Date('2026-02-06'),
    },
    {
      id: '26-420', client: 'Ecoforest', opportunity: 'MVP Fase 1 Asistente Postventa Ecoforest',
      amount: 35500, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 35500, probability: 20, observations: 'IGAPE 2026', date: new Date('2026-02-06'),
    },
    {
      id: '26-421', client: 'New Balance', opportunity: 'Motor Recomendador New Balance',
      amount: 62500, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 62500, probability: 20, date: new Date('2026-02-06'),
    },
    {
      id: '26-422', client: 'Sisubvenciones', opportunity: 'Plataforma Subvenciones Sisubvenciones',
      amount: 74750, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 74750, probability: 20, observations: 'IGAPE 2026', date: new Date('2026-02-06'),
    },
    {
      id: '26-423', client: 'Montajes Cancelas', opportunity: 'Configurador de Ofertas Montajes Cancelas',
      amount: 34750, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 34750, probability: 20, observations: 'IGAPE 2026', date: new Date('2026-02-06'),
    },
    {
      id: '26-424', client: 'Regensasa', opportunity: 'Configurador de Ofertas Regenasa',
      amount: 45045, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 45045, probability: 20, observations: 'IGAPE 2026', date: new Date('2026-02-06'),
    },
    {
      id: '26-425', client: 'Construyelo', opportunity: 'Agente Logistica Construyelo',
      amount: 37000, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 37000, probability: 20, observations: 'IGAPE 2026', date: new Date('2026-02-06'),
    },
    {
      id: '26-426', client: 'Construyelo', opportunity: 'Recomendador Construyelo',
      amount: 35250, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 35250, probability: 20, observations: 'IGAPE 2026', date: new Date('2026-02-06'),
    },
    {
      id: '26-427', client: 'Pazo de los Escudos', opportunity: 'Agente Hoteles Pazo de los Escudos',
      amount: 54500, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 54500, probability: 20, observations: 'IGAPE 2026', date: new Date('2026-02-06'),
    },
    {
      id: '26-428', client: 'Como Darwin', opportunity: 'Configurador Ofertas 2 clientes metal Como Darwin',
      amount: 36750, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 36750, probability: 20, observations: 'IGAPE 2026', date: new Date('2026-02-06'),
    },
    {
      id: '26-429', client: 'Porlan', opportunity: 'Configurador Ofertas Porlan',
      amount: 55000, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 55000, probability: 20, observations: 'IGAPE 2026', date: new Date('2026-02-06'),
    },
    {
      id: '26-430', client: 'XAC Constructora', opportunity: 'Configurador Ofertas XAC',
      amount: 59600, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 59600, probability: 20, observations: 'IGAPE 2026', date: new Date('2026-02-06'),
    },
    {
      id: '26-431', client: 'Ardora', opportunity: 'Configurador de ofertas Ardora',
      amount: 34000, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 34000, probability: 20, observations: 'IGAPE 2026', date: new Date('2026-02-06'),
    },
    {
      id: '26-432', client: 'UCALSA', opportunity: 'Agente Planificador Ucalsa',
      amount: 42350, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 42350, probability: 20, observations: 'IGAPE 2026', date: new Date('2026-02-06'),
    },
    {
      id: '26-433', client: 'CITIC-Censa', opportunity: 'Automatización LLM CITIC-Censa',
      amount: 0, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      observations: 'IGAPE 2026', probability: 20, date: new Date('2026-02-06'),
    },
    {
      id: '26-434', client: 'INNOVIA', opportunity: 'Sustituir 2 Camaras',
      amount: 6825, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 6825, totalInvoiced: 0, wipStatus: 0, costs: 280.58,
      probability: 100, date: new Date('2026-02-06'),
    },
    {
      id: '26-435', client: 'INETUM', opportunity: 'Mantenimiento N3 Validadoras ATM',
      amount: 83667.26, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 83667.26, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2026-02-09'), acceptanceDate: new Date('2026-02-11'),
    },
    {
      id: '26-436', client: 'INETUM', opportunity: 'Mantenimiento N3 Validadoras TMOBCAT',
      amount: 24500, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 24500, totalInvoiced: 14000, wipStatus: 57, costs: 0, margin: 100,
      probability: 100, date: new Date('2026-02-09'), acceptanceDate: new Date('2026-02-11'),
    },
    {
      id: '26-437', client: 'FUJITSU', opportunity: 'Actualizar Camaras FLIR',
      amount: 929.50, statusCode: 8, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 929.50, totalInvoiced: 929.50, wipStatus: 100, costs: 0, margin: 100,
      probability: 100, date: new Date('2026-02-10'), acceptanceDate: new Date('2026-02-10'),
    },
    {
      id: '26-438', client: 'CONDUENT', opportunity: 'Mantenimiento Preventivo Balizas Cocheras TMB',
      amount: 9509.42, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 9509.42, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2026-02-16'), acceptanceDate: new Date('2026-02-16'),
    },
    {
      id: '26-439', client: 'National Security Intelligence Service', opportunity: 'NIS - Servers Quote',
      amount: 10112, statusCode: 7, company: 'MTI', owner: 'Dani A Kenya', country: 'Kenya',
      blHardware: 10112, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2026-02-16'), acceptanceDate: new Date('2026-04-30'),
    },
    {
      id: '26-440', client: 'National Security Intelligence Service', opportunity: 'NIS - Assorted Items',
      amount: 167429, statusCode: 5, company: 'MTI', owner: 'Dani A Kenya', country: 'Kenya',
      blHardware: 167429, probability: 60, date: new Date('2026-02-16'),
    },
    {
      id: '26-441', client: 'Khazna', opportunity: 'Gemelo Digital CPD Khazna',
      amount: 0, statusCode: 5, company: 'MTI', owner: 'Sergio Rodríguez', country: 'UAE',
      probability: 60, date: new Date('2026-02-18'),
    },
    {
      id: '26-442', client: 'ELLU', opportunity: 'Smart Band Ellu',
      amount: 0, statusCode: 5, company: 'MTI', owner: 'Javier Martínez', country: 'Spain',
      probability: 60, date: new Date('2026-02-26'),
    },
    {
      id: '26-443', client: 'ENGIDI', opportunity: 'Engidi TTiO',
      amount: 24000, statusCode: 5, company: 'MTI', owner: 'Javier Martínez', country: 'Spain',
      blTtioOm: 24000, probability: 60, date: new Date('2026-02-26'),
    },
    {
      id: '26-444', client: 'TMB', opportunity: 'Reubicación Validadoras TMOB en S61XX',
      amount: 11340, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 11340, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2026-03-02'), acceptanceDate: new Date('2026-03-11'),
    },
    {
      id: '26-445', client: 'INNOVIA', opportunity: 'Reparar Material Vario',
      amount: 5000, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 5000, totalInvoiced: 0, wipStatus: 0, costs: 152,
      probability: 100, date: new Date('2026-03-02'), acceptanceDate: new Date('2026-03-02'),
    },
    {
      id: '26-446', client: 'FCC INDUSTRIAL', opportunity: 'Suministro Material e Instalación Camaras Talleres Zona Franca',
      amount: 31570, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blHardware: 31570, probability: 60, date: new Date('2026-03-03'),
    },
    {
      id: '26-447', client: 'Worldsensing', opportunity: 'Servicios de Apoyo para Desarrollo de Negocio en 2026',
      amount: 164300, statusCode: 8, company: 'MTI', owner: 'JML Director', country: 'Spain',
      blProservices: 164300, totalInvoiced: 164300, wipStatus: 100, costs: 160000, margin: 2.62,
      probability: 100, date: new Date('2026-03-03'), acceptanceDate: new Date('2026-03-03'),
    },
    {
      id: '26-448', client: 'MONBUS', opportunity: 'Instalacion T Mobilitat en Autobuses Nueva Flota',
      amount: 2832, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 2832, totalInvoiced: 2832, wipStatus: 100, costs: 0, margin: 100,
      probability: 100, date: new Date('2026-03-03'), acceptanceDate: new Date('2026-03-03'),
    },
    {
      id: '26-449', client: 'AUTOCORB', opportunity: 'Instalacion Sistema Ayuda Conduccion Nueva Flota',
      amount: 498, statusCode: 7, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 498, totalInvoiced: 498, wipStatus: 100, costs: 0, margin: 100,
      probability: 100, date: new Date('2026-03-03'), acceptanceDate: new Date('2026-03-03'),
    },
    {
      id: '26-450', client: 'UOC', opportunity: 'UOC marzo 2026 - SISTEMES ENCASTATS',
      amount: 9200, statusCode: 7, company: 'DIPRO', owner: 'Oscar Pérez', country: 'Spain',
      blHardware: 9200, totalInvoiced: 0, wipStatus: 0, costs: 422.15,
      probability: 100, date: new Date('2026-03-13'),
    },
    {
      id: '26-451', client: 'UOC', opportunity: 'UOC marzo 2026 - MULTIMETRE I COMPONENTS',
      amount: 6640, statusCode: 7, company: 'DIPRO', owner: 'Oscar Pérez', country: 'Spain',
      blHardware: 6640, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2026-03-13'),
    },
    {
      id: '26-452', client: 'UOC', opportunity: 'UOC marzo 2026 - PLACA',
      amount: 12561, statusCode: 7, company: 'DIPRO', owner: 'Oscar Pérez', country: 'Spain',
      blHardware: 12561, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2026-03-13'),
    },
    {
      id: '26-453', client: 'UOC', opportunity: 'UOC marzo 2026 - ARDUINO',
      amount: 3000, statusCode: 5, company: 'DIPRO', owner: 'Oscar Pérez', country: 'Spain',
      blHardware: 3000, probability: 60, date: new Date('2026-03-13'),
    },
    {
      id: '26-454', client: 'GMV', opportunity: 'Instalaciones en Rubi',
      amount: 8000, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 8000, probability: 60, date: new Date('2026-03-19'),
    },
    {
      id: '26-455', client: 'ASPOL', opportunity: 'Aspol Igape 2026',
      amount: 26590, statusCode: 5, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 26590, probability: 60, date: new Date('2026-03-24'),
    },
    {
      id: '26-456', client: 'FRIOTEIS', opportunity: 'Frioteis Igape 2026',
      amount: 97961, statusCode: 5, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 97961, probability: 60, date: new Date('2026-03-24'),
    },
    {
      id: '26-457', client: 'GRUAS DONIZ', opportunity: 'Gruas Doniz Igape 2026',
      amount: 35286, statusCode: 5, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 35286, probability: 60, date: new Date('2026-03-24'),
    },
    {
      id: '26-458', client: 'MERCHANT UNION', opportunity: 'MU Igape 2026',
      amount: 102100, statusCode: 5, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 102100, probability: 60, date: new Date('2026-03-24'),
    },
    {
      id: '26-459', client: 'PROMEGA GALICIA', opportunity: 'Promega Igape 2026',
      amount: 29750, statusCode: 5, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blIa: 29750, probability: 60, date: new Date('2026-03-24'),
    },
    {
      id: '26-460', client: 'FUNDACIO MONTILIVI', opportunity: 'Digitalización Residencias',
      amount: 34354.32, statusCode: 5, company: 'MTI', owner: 'Daniel Alonso', country: 'Spain',
      blHardware: 20669.22, blProservices: 13685.10, probability: 60, date: new Date('2026-04-09'),
    },
    {
      id: '26-461', client: 'CARDIOLOGY CENTER - QARSHI', opportunity: 'Cambio de Tubo Rayos X',
      amount: 225000, statusCode: 5, company: 'MTI', owner: 'Daniel Alonso', country: 'Uzbekistan',
      blProservices: 225000, probability: 60, date: new Date('2026-04-16'),
    },
    {
      id: '26-462', client: 'AEI', opportunity: 'AEI 2026 CPD',
      amount: 0, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      probability: 20, date: new Date('2026-04-17'),
    },
    {
      id: '26-463', client: 'AEI', opportunity: 'AEI 2026 - Next Stage Digital Twin',
      amount: 0, statusCode: 3, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      probability: 20, date: new Date('2026-04-18'),
    },
    {
      id: '26-464', client: 'P. Freire', opportunity: 'ILS Rodman Patrulleras',
      amount: 103360, statusCode: 7, company: 'MTI', owner: 'Sergio Rodríguez', country: 'Spain',
      blProservices: 103360, totalInvoiced: 0, wipStatus: 0, costs: 0,
      probability: 100, date: new Date('2026-04-18'), acceptanceDate: new Date('2026-04-18'),
    },
    {
      id: '26-465', client: 'GMV', opportunity: 'Instalacion Telemetria y Letreros Exteriores',
      amount: 190080, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      blProservices: 190080, probability: 60, date: new Date('2026-04-28'),
    },
    {
      id: '26-466', client: 'INETUM', opportunity: 'Instalacion 119 Pantallas Bilbao Bus',
      amount: 0, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      probability: 60, date: new Date('2026-04-28'),
    },
    {
      id: '26-467', client: 'INETUM', opportunity: 'Instalacion Cable Microfono Vallado Puerto de Barcelona',
      amount: 0, statusCode: 5, company: 'INGECO', owner: 'JML Director', country: 'Spain',
      probability: 60, date: new Date('2026-04-28'),
    },
    {
      id: '26-468', client: 'GARABITO', opportunity: 'Smart City Garabito',
      amount: 1000000, statusCode: 3, company: 'MTI', owner: 'Daniel Alonso', country: 'Spain',
      blHardware: 300000, blProservices: 700000, probability: 20, date: new Date('2026-05-06'),
    },
  ];

  let oppCount = 0;
  for (const opp of opps) {
    const weighted = (opp.amount || 0) * ((opp.probability || 0) / 100);
    const invoiced = opp.totalInvoiced || 0;
    const pending = Math.max(0, (opp.amount || 0) - invoiced);
    await prisma.opportunity.create({
      data: {
        id:               opp.id,
        client:           opp.client,
        date:             opp.date,
        opportunity:      opp.opportunity,
        amount:           opp.amount || 0,
        currency:         (opp as any).currency || 'EUR',
        statusCode:       opp.statusCode,
        company:          opp.company,
        probability:      opp.probability || 0,
        weightedPipeline: weighted,
        owner:            opp.owner,
        country:          opp.country,
        blHardware:       opp.blHardware || 0,
        blIa:             opp.blIa || 0,
        blBim:            opp.blBim || 0,
        blTtioOm:         opp.blTtioOm || 0,
        blEvents:         opp.blEvents || 0,
        blProservices:    opp.blProservices || 0,
        costs:            opp.costs || 0,
        margin:           opp.margin || 0,
        totalInvoiced:    invoiced,
        pendingToInvoice: pending,
        wipStatus:        opp.wipStatus || 0,
        observations:     opp.observations || null,
        acceptanceDate:   (opp as any).acceptanceDate || null,
        endDate:          (opp as any).endDate || null,
        isInternal:       false,
      },
    });
    oppCount++;
  }
  console.log(`${oppCount} oportunidades/proyectos creados`);

  // ── APP CONFIG ─────────────────────────────────────────────
  await prisma.appConfig.createMany({
    data: [
      { key: 'app.version',        value: '1.0.0',       description: 'Versión de la aplicación' },
      { key: 'billing.target',     value: '250000',      description: 'Objetivo mensual de facturación (EUR)' },
      { key: 'pipeline.target',    value: '5000000',     description: 'Objetivo de pipeline (EUR)' },
      { key: 'factorial.enabled',  value: 'false',       description: 'Integración Factorial activa' },
      { key: 'seed.date',          value: new Date().toISOString(), description: 'Fecha del último seed' },
    ],
  });

  console.log('Seed completado exitosamente!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
