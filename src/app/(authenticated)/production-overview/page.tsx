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
import { Program, ItemType, Stock, PaperType, Ruling } from '@/lib/types';
import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function ProductionOverviewPage() {
  const firestore = useFirestore();
  const programsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'programs') : null, [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'item_types') : null, [firestore]);
  const stockQuery = useMemoFirebase(() => firestore ? collection(firestore, 'stock') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paper_types') : null, [firestore]);
  const rulingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reels') : null, [firestore]);

  const { data: programs } = useCollection<Program>(programsQuery);
  const { data: itemTypes } = useCollection<ItemType>(itemTypesQuery);
  const { data: stock } = useCollection<Stock>(stockQuery);
  const { data: paperTypes } = useCollection<PaperType>(paperTypesQuery);
  const { data: rulings } = useCollection<Ruling>(rulingsQuery);

   const stockDistribution = useMemo(() => {
    if (!stock || !paperTypes) return [];
    
    const stockByPaperType: { [key: string]: number } = {};
    stock.forEach(s => {
        if (!stockByPaperType[s.paperTypeId]) {
            stockByPaperType[s.paperTypeId] = 0;
        }
        stockByPaperType[s.paperTypeId] += s.numberOfReels;
    });

    return Object.entries(stockByPaperType).map(([paperTypeId, reelCount]) => ({
        name: paperTypes.find(pt => pt.id === paperTypeId)?.name || 'Unknown',
        value: reelCount,
    }));
   }, [stock, paperTypes]);
   
   const rulingSummary = useMemo(() => {
    if (!rulings || !itemTypes) return [];
    
    const summary: { [key: string]: { ruled: number, theoretical: number } } = {};
    rulings.forEach(ruling => {
      ruling.entries.forEach(entry => {
        const itemTypeName = itemTypes.find(it => it.id === entry.itemTypeId)?.name || 'Unknown';
        if (!summary[itemTypeName]) {
          summary[itemTypeName] = { ruled: 0, theoretical: 0 };
        }
        summary[itemTypeName].ruled += entry.sheetsRuled;
        summary[itemTypeName].theoretical += entry.theoreticalSheets;
      });
    });

    return Object.entries(summary).map(([name, data]) => ({
      name,
      Ruled: data.ruled,
      Theoretical: data.theoretical,
    }));
  }, [rulings, itemTypes]);

  const stockSummary = useMemo(() => {
    if (!stock) return { totalWeight: 0, paperTypes: [] };
    const totalWeight = stock.reduce((acc, s) => acc + s.totalWeight, 0);
    return { totalWeight, paperTypes: paperTypes || [] };
  }, [stock, paperTypes]);

  const productionSummary = useMemo(() => {
    if (!rulings) return { sheetsRuledToday: 0, rulingsToday: 0, efficiency: 0 };
    const today = new Date().toDateString();
    const todayRulings = rulings.filter(r => (r.date as Date).toDateString() === today);
    const sheetsRuledToday = todayRulings.flatMap(r => r.entries).reduce((acc, entry) => acc + entry.sheetsRuled, 0);

    const totalSheetsRuled = rulings.flatMap(r => r.entries).reduce((acc, entry) => acc + entry.sheetsRuled, 0);
    const totalTheoreticalSheets = rulings.flatMap(r => r.entries).reduce((acc, entry) => acc + entry.theoreticalSheets, 0);
    const efficiency = totalTheoreticalSheets > 0 ? (totalSheetsRuled / totalTheoreticalSheets) * 100 : 0;
    
    return { sheetsRuledToday, rulingsToday: todayRulings.length, efficiency: efficiency.toFixed(1) };
  }, [rulings]);
  
  const programProgress = useMemo(() => {
    if (!programs || !rulings) return {};
    const progress: { [key: string]: number } = {};
    programs.forEach(p => {
        const sheetsCompleted = rulings.flatMap(r => r.entries)
            .filter(e => e.programId === p.id)
            .reduce((sum, e) => sum + e.sheetsRuled, 0);
        progress[p.id] = sheetsCompleted;
    });
    return progress;
  }, [programs, rulings]);

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
            <div className="text-2xl font-bold">{programs?.length || 0}</div>
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
                        {programs?.map(program => {
                            const sheetsCompleted = programProgress[program.id as keyof typeof programProgress] || 0;
                            const progress = (sheetsCompleted / program.totalSheetsRequired) * 100;
                            const itemType = itemTypes?.find(it => it.id === program.itemTypeId);
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

    