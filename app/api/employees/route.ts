import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  badRequest,
  limitedSearchParam,
  optionalBoolean,
  optionalNumber,
  optionalText,
  readJsonObject,
  requiredText,
} from '@/lib/api-security';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const company    = limitedSearchParam(searchParams.get('company'));
  const department = limitedSearchParam(searchParams.get('department'));
  const activeOnly = searchParams.get('isActive');
  const search     = limitedSearchParam(searchParams.get('search'));

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
    const body = await readJsonObject(req);
    const employee = await prisma.employee.create({
      data: {
        id:            requiredText(body, 'id', 80),
        name:          requiredText(body, 'name', 255),
        factorialName: optionalText(body, 'factorialName', 255),
        company:       optionalText(body, 'company', 80) || 'MTI',
        department:    optionalText(body, 'department', 120) || 'General',
        isActive:      optionalBoolean(body, 'isActive') ?? true,
        observations:  optionalText(body, 'observations', 5000),
        email:         optionalText(body, 'email', 320),
        hourlyCost:    optionalNumber(body, 'hourlyCost', 0) ?? 0,
        monthlySalary: optionalNumber(body, 'monthlySalary', 0) ?? 0,
        availability:  optionalNumber(body, 'availability', 100) ?? 100,
        factorialId:   optionalText(body, 'factorialId', 80),
      },
    });
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && /obligatorio|numérico|JSON/.test(error.message)) {
      return badRequest(error.message);
    }
    return NextResponse.json({ error: 'Error al crear empleado' }, { status: 500 });
  }
}
