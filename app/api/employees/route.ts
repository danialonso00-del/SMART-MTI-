import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const company    = searchParams.get('company');
  const department = searchParams.get('department');
  const activeOnly = searchParams.get('isActive');
  const search     = searchParams.get('search');

  try {
    const where: Record<string, unknown> = {};
    if (company)             where.company    = company;
    if (department)          where.department = department;
    if (activeOnly === 'true')  where.isActive = true;
    if (activeOnly === 'false') where.isActive = false;
    if (search) {
      where.OR = [
        { name:           { contains: search, mode: 'insensitive' } },
        { factorialName:  { contains: search, mode: 'insensitive' } },
        { department:     { contains: search, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        salaries: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 12,
        },
      },
      orderBy: [{ company: 'asc' }, { department: 'asc' }, { name: 'asc' }],
    });

    // Enrich each employee with latest salary data
    const enriched = employees.map(emp => {
      const latestSalary = emp.salaries[0] ?? null;
      const totalSalaryForecast = emp.salaries.reduce((s, sal) => s + sal.salaryForecast, 0);
      const totalSalaryReal     = emp.salaries.reduce((s, sal) => s + sal.salaryReal, 0);
      return {
        ...emp,
        latestSalary,
        totalSalaryForecast,
        totalSalaryReal,
        salaryHistory: emp.salaries.slice().reverse(), // chronological order
      };
    });

    // Aggregate stats
    const totalEmployees  = employees.length;
    const activeEmployees = employees.filter(e => e.isActive).length;

    const latestSalaries = employees
      .filter(e => e.isActive && e.salaries.length > 0)
      .map(e => e.salaries[0]);

    const totalMonthlyCost = latestSalaries.reduce((s, sal) => s + sal.salaryReal, 0);
    const avgCostHour      = latestSalaries.length > 0
      ? latestSalaries.reduce((s, sal) => s + sal.costHour, 0) / latestSalaries.length
      : 0;

    // Distinct companies and departments for filters
    const companies   = Array.from(new Set(employees.map(e => e.company))).sort();
    const departments = Array.from(new Set(employees.map(e => e.department))).sort();

    return NextResponse.json({
      employees: enriched,
      stats: {
        totalEmployees,
        activeEmployees,
        totalMonthlyCost,
        avgCostHour,
      },
      filters: { companies, departments },
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Error al obtener empleados' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const employee = await prisma.employee.create({ data: body });
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al crear empleado' }, { status: 500 });
  }
}
