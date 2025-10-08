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
import { Program, ItemType, Stock, PaperType, Ruling as RulingType, User as AppUser } from '@/lib/types';
import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, Timestamp, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function ProductionOverviewPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useDoc<AppUser>(currentUserDocRef);
  
  const programsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'programs') : null, [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'itemTypes') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);
  const rulingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reels') : null, [firestore]);

  const stockQuery = useMemoFirebase(() => {
    if (!firestore || isLoadingCurrentUser || !currentUser || !['Admin', 'Member'].includes(currentUser.role)) {
      return null;
    }
    return collection(firestore, 'stock');
  }, [firestore, currentUser, isLoadingCurrentUser]);


  const { data: programs, isLoading: loadingPrograms } = useCollection<Program>(programsQuery);
  const { data: itemTypes, isLoading: loadingItemTypes } = useCollection<ItemType>(itemTypesQuery);
  const { data: stock, isLoading: loadingStock } = useCollection<Stock>(stockQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);
  const { data: rulings, isLoading: loadingRulings } = useCollection<RulingType>(rulingsQuery);

   const stockDistribution = useMemo(() => {
    if (!stock || !paperTypes) return [];
    
    const stockByPaperType: { [key: string]: number } = {};
    stock.forEach(s => {
        if (!stockByPaperType[s.paperTypeId as string]) {
            stockByPaperType[s.paperTypeId as string] = 0;
        }
        stockByPaperType[s.paperTypeId as string] += s.numberOfReels ?? 0;
    });

    return Object.entries(stockByPaperType).map(([paperTypeId, reelCount]) => ({
        name: paperTypes.find(pt => pt.id === paperTypeId)?.paperName || 'Unknown',
        value: reelCount,
    }));
   }, [stock, paperTypes]);
   
   const rulingSummary = useMemo(() => {
    if (!rulings || !itemTypes) return [];
    
    const summary: { [key: string]: { ruled: number, theoretical: number } } = {};
    rulings.forEach(ruling => {
      ruling.entries.forEach(entry => {
        const itemTypeName = itemTypes.find(it => it.id === entry.itemTypeId)?.itemName || 'Unknown';
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
    if (!stock || !paperTypes) return { totalWeight: 0, paperTypesCount: 0 };
    const totalWeight = stock.reduce((acc, s) => acc + (s.totalWeight ?? 0), 0);
    return { totalWeight, paperTypesCount: paperTypes?.length || 0 };
  }, [stock, paperTypes]);

  const productionSummary = useMemo(() => {
    if (!rulings) return { sheetsRuledToday: 0, rulingsToday: 0, efficiency: '0.0' };
    const today = new Date().toDateString();
    
    const todayRulings = rulings.filter(r => {
      const rulingDate = r.date instanceof Timestamp ? r.date.toDate() : new Date(r.date as string);
      return rulingDate.toDateString() === today;
    });
    
    const sheetsRuledToday = (todayRulings.flatMap(r => r.entries) || []).reduce((acc, entry) => acc + entry.sheetsRuled, 0);

    const totalSheetsRuled = (rulings.flatMap(r => r.entries) || []).reduce((acc, entry) => acc + entry.sheetsRuled, 0);
    const totalTheoreticalSheets = (rulings.flatMap(r => r.entries) || []).reduce((acc, entry) => acc + entry.theoreticalSheets, 0);
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
  
  if (isLoadingCurrentUser) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="text-lg text-muted-foreground">Loading Production Data...</div>
        </div>
    )
  }

  const isOperator = currentUser?.role === 'Operator';
  const isLoadingData = loadingPrograms || loadingItemTypes || loadingRulings || loadingPaperTypes || (loadingStock && !isOperator);

  return (
    <>
      <PageHeader
        title="Production Overview"
        description="A real-time summary of all production activities."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {!isOperator && (
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stock Weight</CardTitle>
            </CardHeader>
            <CardContent>
                {loadingStock || isLoadingCurrentUser ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{`${stockSummary.totalWeight.toLocaleString()} kg`}</div>}
                {loadingStock || loadingPaperTypes || isLoadingCurrentUser ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">Across {stockSummary.paperTypesCount} paper types</p>}
            </CardContent>
            </Card>
        )}
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sheets Ruled (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRulings ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{productionSummary.sheetsRuledToday.toLocaleString()}</div>}
            {loadingRulings ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">Across {productionSummary.rulingsToday} rulings</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPrograms ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{programs?.length || 0}</div>}
            <p className="text-xs text-muted-foreground">Currently in production</p>
          </CardContent>
        </Card>
        {!isOperator && (
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
                {loadingRulings ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{productionSummary.efficiency}%</div>}
                <p className="text-xs text-muted-foreground">Based on recent production data</p>
            </CardContent>
            </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {!isOperator && (
            <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Stock Distribution by Reels</CardTitle>
                <CardDescription>A breakdown of paper types in stock.</CardDescription>
            </CardHeader>
            <CardContent>
                 {loadingStock || loadingPaperTypes || isLoadingCurrentUser ? (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">Loading chart...</div>
                ) : (
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie data={stockDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {stockDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} />
                        <Legend wrapperStyle={{fontSize: "0.875rem"}}/>
                    </PieChart>
                </ResponsiveContainer>
                )}
            </CardContent>
            </Card>
        )}
        <Card className={isOperator ? 'col-span-full lg:col-span-5' : 'lg:col-span-3'}>
          <CardHeader>
            <CardTitle>Ruling Summary</CardTitle>
            <CardDescription>A comparison of sheets ruled vs. theoretical for each item type.</CardDescription>
          </CardHeader>
          <CardContent>
             {loadingRulings || loadingItemTypes ? (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">Loading chart...</div>
             ) : (
             <ResponsiveContainer width="100%" height={250}>
              <BarChart data={rulingSummary}>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} />
                <Legend wrapperStyle={{fontSize: "0.875rem"}}/>
                <Bar dataKey="Theoretical" fill="hsl(var(--secondary-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ruled" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
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
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Brand</TableHead>
                                <TableHead>Item Type</TableHead>
                                <TableHead>Total Sheets</TableHead>
                                <TableHead>Completed</TableHead>
                                <TableHead className="w-[150px] md:w-[250px]">Progress</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingData ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading programs...</TableCell></TableRow>
                            ) : programs && programs.length > 0 ? programs.map(program => {
                                const sheetsCompleted = programProgress[program.id as keyof typeof programProgress] || 0;
                                const totalSheetsRequired = program.totalSheetsRequired || 1;
                                const progress = (sheetsCompleted / totalSheetsRequired) * 100;
                                const itemType = itemTypes?.find(it => it.id === program.itemTypeId);
                                return (
                                    <TableRow key={program.id}>
                                        <TableCell className="font-medium whitespace-nowrap">{program.brand}</TableCell>
                                        <TableCell className="whitespace-nowrap">{itemType?.itemName || 'N/A'}</TableCell>
                                        <TableCell>{(program.totalSheetsRequired ?? 0).toLocaleString()}</TableCell>
                                        <TableCell>{sheetsCompleted.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={progress} className="h-2" />
                                                <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">No active programs found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}

    