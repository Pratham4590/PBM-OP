'use client';

import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  XAxis,
  YAxis,
  Bar,
  Legend,
} from 'recharts';
import { stockSummary, productionSummary, recentRulings } from '@/lib/data';
import { Program, ItemType } from '@/lib/types';
import { useMemo } from 'react';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

const initialItemTypes: ItemType[] = [
  { id: '1', name: 'Single Line', shortCode: 'SL' },
  { id: '2', name: 'Double Line', shortCode: 'DL' },
];

const initialPrograms: Program[] = [
    { id: 'p1', brand: 'Classmate', paperTypeId: '1', gsm: 58, length: 91.5, itemTypeId: '1', cutoff: 30, piecesPerBundle: 10, totalSheetsRequired: 100000, notebookPages: 120, bundlesRequired: 1, coverIndex: 2, date: new Date(), reamWeight: 8.4, ups: 2},
    { id: 'p2', brand: 'Navneet', paperTypeId: '2', gsm: 60, length: 88, itemTypeId: '2', cutoff: 35, piecesPerBundle: 8, totalSheetsRequired: 80000, notebookPages: 96, bundlesRequired: 1, coverIndex: 2, date: new Date(), reamWeight: 9.2, ups: 2 },
    { id: 'p3', brand: 'Local Brand', paperTypeId: '1', gsm: 58, length: 91.5, itemTypeId: '1', cutoff: 30, piecesPerBundle: 12, totalSheetsRequired: 120000, notebookPages: 200, bundlesRequired: 1, coverIndex: 2, date: new Date(), reamWeight: 8.4, ups: 3 },
];

// Mock sheets ruled per program
const programProgress = {
    'p1': 75000,
    'p2': 40000,
    'p3': 30000,
}


export default function ProductionOverviewPage() {

   const stockDistribution = useMemo(() => {
    return stockSummary.paperTypes.map(pt => ({
        name: pt.name,
        value: pt.reels,
    }))
   }, []);
   
   const rulingSummary = useMemo(() => {
     const summary: { [key: string]: { ruled: number, theoretical: number } } = {};
     recentRulings.forEach(ruling => {
       if (!summary[ruling.itemRuled]) {
         summary[ruling.itemRuled] = { ruled: 0, theoretical: 0 };
       }
       summary[ruling.itemRuled].ruled += ruling.sheetsRuled;
       summary[ruling.itemRuled].theoretical += ruling.theoreticalSheets;
     });

     return Object.entries(summary).map(([name, data]) => ({
       name,
       Ruled: data.ruled,
       Theoretical: data.theoretical,
     }));
   }, []);

  return (
    <>
      <PageHeader
        title="Production Overview"
        description="A real-time summary of all production activities."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockSummary.totalWeight.toLocaleString()} kg</div>
            <p className="text-xs text-muted-foreground">Across {stockSummary.paperTypes.length} paper types</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sheets Ruled (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productionSummary.sheetsRuledToday.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across {productionSummary.rulingsToday} rulings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{initialPrograms.length}</div>
            <p className="text-xs text-muted-foreground">Currently in production</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productionSummary.efficiency}%</div>
            <p className="text-xs text-muted-foreground">Based on recent production data</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Stock Distribution by Reels</CardTitle>
            <CardDescription>A breakdown of paper types in stock.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stockDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {stockDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Ruling Summary</CardTitle>
            <CardDescription>A comparison of sheets ruled vs. theoretical for each item type.</CardDescription>
          </CardHeader>
          <CardContent>
             <ResponsiveContainer width="100%" height={250}>
              <BarChart data={rulingSummary}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="Theoretical" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ruled" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
            <CardHeader>
                <CardTitle>Active Program Status</CardTitle>
                <CardDescription>A real-time overview of the progress for each production program.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Brand</TableHead>
                            <TableHead>Item Type</TableHead>
                            <TableHead>Total Sheets Required</TableHead>
                            <TableHead>Sheets Completed</TableHead>
                            <TableHead className="w-[250px]">Progress</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialPrograms.map(program => {
                            const sheetsCompleted = programProgress[program.id as keyof typeof programProgress] || 0;
                            const progress = (sheetsCompleted / program.totalSheetsRequired) * 100;
                            const itemType = initialItemTypes.find(it => it.id === program.itemTypeId);
                            return (
                                <TableRow key={program.id}>
                                    <TableCell className="font-medium">{program.brand}</TableCell>
                                    <TableCell>{itemType?.name || 'N/A'}</TableCell>
                                    <TableCell>{program.totalSheetsRequired.toLocaleString()}</TableCell>
                                    <TableCell>{sheetsCompleted.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={progress} className="h-2" />
                                            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
