// @ts-check
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const employees = [
  { id: 'EMP25-0001', name: 'Adi Lucic',                     factorialName: 'Adi Lucic',                     company: 'MTI',    department: 'Ventas',          monthlySalary: 4402.33, hourlyCost: 32.86, availability: 100 },
  { id: 'EMP25-0002', name: 'Alberto Alvarez',                factorialName: null,                             company: 'INGECO', department: 'Proservices',      monthlySalary: 2530.01, hourlyCost: 18.70, availability: 100 },
  { id: 'EMP25-0003', name: 'Camilo Martínez Casanova',       factorialName: 'Camilo Martínez Casanova',       company: 'INGECO', department: 'Proservices',      monthlySalary: 3126.02, hourlyCost: 21.40, availability: 100 },
  { id: 'EMP25-0004', name: 'Candela Garcia',                 factorialName: 'Candela Garcia',                 company: 'MTI',    department: 'RRHH',            monthlySalary: 3126.02, hourlyCost: 21.40, availability: 100 },
  { id: 'EMP25-0005', name: 'Carlos Pozo Pujol',              factorialName: 'Carlos Pozo Pujol',              company: 'INGECO', department: 'Proservices',      monthlySalary: 3198.25, hourlyCost: 17.29, availability: 100 },
  { id: 'EMP25-0006', name: 'Chloe Tadros',                   factorialName: 'Chloe Tadros',                   company: 'MTI',    department: 'ProjectManager',   monthlySalary: 4952.62, hourlyCost: 33.81, availability: 100 },
  { id: 'EMP25-0007', name: 'Cristina Soler Arenys',          factorialName: 'Cristina Soler Arenys',          company: 'MTI',    department: 'IA',               monthlySalary: 4400.83, hourlyCost: 24.53, availability: 100 },
  { id: 'EMP25-0008', name: 'Daniel Alonso',                  factorialName: 'Daniel Alonso',                  company: 'MTI',    department: 'Ventas',           monthlySalary: 3521.87, hourlyCost: 23.66, availability: 100 },
  { id: 'EMP25-0009', name: 'Eloi Colomeda',                  factorialName: null,                             company: 'MTI',    department: 'TTIO',             monthlySalary: 0,       hourlyCost: 0,     availability: 100 },
  { id: 'EMP25-0010', name: 'Emilia Torres',                  factorialName: 'Emilia Torres',                  company: 'MTI',    department: 'Events',           monthlySalary: 0,       hourlyCost: 0,     availability: 100 },
  { id: 'EMP25-0011', name: 'Emilie Cottier',                 factorialName: 'Emilie Cottier',                 company: 'MTI',    department: 'RRHH',             monthlySalary: 2201.17, hourlyCost: 15.03, availability: 100 },
  { id: 'EMP25-0012', name: 'Eusebi Nieni Franch Lin',        factorialName: 'Eusebi Franch',                  company: 'MTI',    department: 'IA',               monthlySalary: 2971.57, hourlyCost: 19.72, availability: 100 },
  { id: 'EMP25-0013', name: 'Florencio Hidalgo García',       factorialName: 'Florencio Hidalgo García',       company: 'INGECO', department: 'Proservices',      monthlySalary: 3533.70, hourlyCost: 24.60, availability: 100 },
  { id: 'EMP25-0014', name: 'Francesc Fernandez Gimeno',      factorialName: 'Francesc Fernandez Gimeno',      company: 'INGECO', department: 'ProjectManager',   monthlySalary: 6614.51, hourlyCost: 35.68, availability: 100 },
  { id: 'EMP25-0015', name: 'Francisco Javier Suarez',        factorialName: null,                             company: 'INGECO', department: 'Proservices',      monthlySalary: 3086.22, hourlyCost: 21.96, availability: 100 },
  { id: 'EMP25-0016', name: 'Galiana',                        factorialName: null,                             company: 'INGECO', department: 'Proservices',      monthlySalary: 3259.60, hourlyCost: 16.18, availability: 100 },
  { id: 'EMP25-0017', name: 'Godino',                         factorialName: null,                             company: 'INGECO', department: 'Proservices',      monthlySalary: 3292.15, hourlyCost: 22.15, availability: 100 },
  { id: 'EMP25-0018', name: 'Ivan Moreno Sanchez',            factorialName: 'Ivan Moreno Sanchez',            company: 'INGECO', department: 'Proservices',      monthlySalary: 2994.82, hourlyCost: 21.12, availability: 100 },
  { id: 'EMP25-0019', name: 'Javier Cuspinera',               factorialName: 'Javier Cuspinera',               company: 'MTI',    department: 'Ventas',           monthlySalary: 2146.14, hourlyCost: 14.30, availability: 75  },
  { id: 'EMP25-0020', name: 'Jesús D. Vicente',               factorialName: null,                             company: 'INGECO', department: 'Proservices',      monthlySalary: 3206.77, hourlyCost: 21.04, availability: 100 },
  { id: 'EMP25-0021', name: 'Jesus Garcia',                   factorialName: 'Jesus Garcia',                   company: 'MTI',    department: 'IA',               monthlySalary: 5502.92, hourlyCost: 37.03, availability: 100 },
  { id: 'EMP25-0022', name: 'Jordi Piquero',                  factorialName: 'Jordi Piquero',                  company: 'MTI',    department: 'ProjectManager',   monthlySalary: 0,       hourlyCost: 0,     availability: 100 },
  { id: 'EMP25-0023', name: 'Jose Muñoz',                     factorialName: 'Jose Muñoz',                     company: 'INGECO', department: 'Proservices',      monthlySalary: 5000.00, hourlyCost: 59.73, availability: 100 },
  { id: 'EMP25-0024', name: 'Jose Maria Salido',              factorialName: 'Jose Maria Salido',              company: 'MTI',    department: 'Administracion',   monthlySalary: 3521.87, hourlyCost: 23.95, availability: 100 },
  { id: 'EMP25-0025', name: 'Luis del Prado Arévalo',         factorialName: 'Luis del Prado Arévalo',         company: 'INGECO', department: 'Proservices',      monthlySalary: 905.90,  hourlyCost: 10.84, availability: 100 },
  { id: 'EMP25-0026', name: 'Luis Alfredo Silva Villarroel',  factorialName: 'Luis Alfredo Silva Villarroel',  company: 'INGECO', department: 'Proservices',      monthlySalary: 3086.22, hourlyCost: 16.86, availability: 100 },
  { id: 'EMP25-0027', name: 'Maria Duarte',                   factorialName: 'Maria Duarte',                   company: 'MTI',    department: 'Events',           monthlySalary: 4402.33, hourlyCost: 28.55, availability: 100 },
  { id: 'EMP25-0028', name: 'Mariana Rocheta',                factorialName: 'Mariana Rocheta',                company: 'MTI',    department: 'Events',           monthlySalary: 2091.13, hourlyCost: 15.03, availability: 100 },
  { id: 'EMP25-0029', name: 'Matias Bernal Borrego',          factorialName: 'Matias Bernal Borrego',          company: 'INGECO', department: 'Proservices',      monthlySalary: 3176.35, hourlyCost: 21.02, availability: 100 },
  { id: 'EMP25-0030', name: 'Miguel Godino Garcia',           factorialName: 'Miguel Godino Garcia',           company: 'INGECO', department: 'Proservices',      monthlySalary: 3176.35, hourlyCost: 21.02, availability: 100 },
  { id: 'EMP25-0031', name: 'Oscar Martinez Sánchez',         factorialName: 'Oscar Martinez Sánchez',         company: 'INGECO', department: 'Proservices',      monthlySalary: 3286.28, hourlyCost: 21.94, availability: 100 },
  { id: 'EMP25-0032', name: 'Oscar Rodriguez',                factorialName: 'Oscar Rodriguez',                company: 'DIPRO',  department: 'Hardware',         monthlySalary: 2093.45, hourlyCost: 19.22, availability: 50  },
  { id: 'EMP25-0033', name: 'Ramon Marti',                    factorialName: 'Ramon Marti',                    company: 'DIPRO',  department: 'Hardware',         monthlySalary: 2093.45, hourlyCost: 13.95, availability: 100 },
  { id: 'EMP25-0034', name: 'Ritisha Sachin Bhatt',           factorialName: 'Ritisha Sachin Bhatt',           company: 'MTI',    department: 'Events',           monthlySalary: 2201.15, hourlyCost: 11.16, availability: 100 },
  { id: 'EMP25-0035', name: 'Sergio Ruiz Ribodigo',           factorialName: 'Sergio Ruiz Ribodigo',           company: 'INGECO', department: 'Proservices',      monthlySalary: 2803.65, hourlyCost: 19.54, availability: 100 },
  { id: 'EMP25-0036', name: 'Sergio Daniel Muñoz López',      factorialName: 'Sergio Daniel Muñoz López',      company: 'MTI',    department: 'Ventas',           monthlySalary: 0,       hourlyCost: 0,     availability: 100 },
  { id: 'EMP25-0037', name: 'Vanessa Cuenca Vivas',           factorialName: 'Vanessa Cuenca Vivas',           company: 'MTI',    department: 'Administracion',   monthlySalary: 0,       hourlyCost: 0,     availability: 100, observations: 'SMARTMATICS' },
];

async function main() {
  console.log('=== Employee DB Reset ===\n');

  // 1. Delete all salaries
  const deletedSalaries = await prisma.salary.deleteMany({});
  console.log(`Deleted ${deletedSalaries.count} salary records`);

  // 2. Nullify internalEmployeeId in ProjectTimeEntry (no FK constraint, but clean data)
  const updatedEntries = await prisma.projectTimeEntry.updateMany({
    where: { internalEmployeeId: { not: null } },
    data: { internalEmployeeId: null },
  });
  console.log(`Nullified internalEmployeeId in ${updatedEntries.count} time entries`);

  // 3. Delete all employees
  const deletedEmployees = await prisma.employee.deleteMany({});
  console.log(`Deleted ${deletedEmployees.count} employees`);

  // 4. Insert new employees
  const created = await prisma.employee.createMany({
    data: employees.map(e => ({
      id:             e.id,
      name:           e.name,
      factorialName:  e.factorialName ?? null,
      company:        e.company,
      department:     e.department,
      isActive:       true,
      monthlySalary:  e.monthlySalary,
      hourlyCost:     e.hourlyCost,
      availability:   e.availability,
      observations:   e.observations ?? null,
    })),
  });
  console.log(`\nInserted ${created.count} employees`);

  // Summary
  console.log('\n=== Done ===');
  const all = await prisma.employee.findMany({ select: { id: true, name: true, company: true, hourlyCost: true } });
  for (const e of all) {
    console.log(`  ${e.id}  ${e.name.padEnd(35)} ${e.company.padEnd(7)} €${e.hourlyCost}/h`);
  }
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
