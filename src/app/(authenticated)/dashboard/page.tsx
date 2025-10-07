'use client';
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
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { PageHeader } from '@/components/page-header';
import {
  Boxes,
  Package,
  Sheet,
  TrendingUp,
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Ruling, Stock, ItemType } from '@/lib/types';
import { useMemo }from 'react';

const chartData = [
    { date: "Jan", "Ruled": 4000, "Planned": 3800 },
    { date: "Feb", "Ruled": 3000, "Planned": 3200 },
    { date: "Mar", "Ruled": 5000, "Planned": 4800 },
    { date: "Apr", "Ruled": 4780, "Planned": 4900 },
    { date: "May", "Ruled": 5890, "Planned": 5500 },
    { date: "Jun", "Ruled": 4390, "Planned": 4500 },
    { date: "Jul", "Ruled": 4490, "Planned": 4300 },
]

export default function DashboardPage() {
  const firestore = useFirestore();
  const rulingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reels') : null, [firestore]);
  const stockQuery = useMemoFirebase(() => firestore ? collection(firestore, 'stock') : null, [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'item_types') : null, [firestore]);
  
  const { data: rulings, isLoading: loadingRulings } = useCollection<Ruling>(rulingsQuery);
  const { data: stock, isLoading: loadingStock } = useCollection<Stock>(stockQuery);
  const { data: itemTypes, isLoading: loadingItemTypes } = useCollection<ItemType>(itemTypesQuery);

  const stockSummary = useMemo(() => {
    if (!stock) return { totalWeight: 0, totalReels: 0, paperTypes: [] };
    const totalWeight = stock.reduce((acc, item) => acc + item.totalWeight, 0);
    const totalReels = stock.reduce((acc, item) => acc + item.numberOfReels, 0);
    return { totalWeight, totalReels, paperTypes: [] }; // paperTypes summary can be enhanced
  }, [stock]);

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

  const recentRulings = useMemo(() => {
    if (!rulings || !itemTypes) return [];
    return rulings
      .flatMap(r => r.entries.map(e => ({ ...e, reelNo: r.reelNo, serialNo: r.serialNo })))
      .slice(0, 5);
  }, [rulings, itemTypes]);

  const getItemTypeName = (itemTypeId: string) => itemTypes?.find(it => it.id === itemTypeId)?.name || 'N/A';

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome back, Admin! Here's your production summary."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Stock Weight
            </CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStock ? <div className="text-2xl font-bold">...</div> : <div className="text-2xl font-bold">{stockSummary.totalWeight.toLocaleString()} kg</div>}
            <p className="text-xs text-muted-foreground">
              Across all paper types
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reels</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
          {loadingStock ? <div className="text-2xl font-bold">...</div> : <div className="text-2xl font-bold">{stockSummary.totalReels}</div>}
            <p className="text-xs text-muted-foreground">
              In stock
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sheets Ruled (Today)</CardTitle>
            <Sheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingRulings ? <div className="text-2xl font-bold">...</div> : <div className="text-2xl font-bold">{productionSummary.sheetsRuledToday.toLocaleString()}</div>}
            <p className="text-xs text-muted-foreground">
              Across {productionSummary.rulingsToday} rulings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
          {loadingRulings ? <div className="text-2xl font-bold">...%</div> : <div className="text-2xl font-bold">{productionSummary.efficiency}%</div>}
            <p className="text-xs text-muted-foreground">
              Based on recent production data
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Sheets Ruled vs. Planned</CardTitle>
            <CardDescription>
              A summary of production over the last 7 months.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                 <Tooltip
                  cursor={{fill: 'hsl(var(--muted))'}}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))'
                  }}
                />
                <Bar
                  dataKey="Planned"
                  fill="hsl(var(--secondary))"
                  radius={[4, 4, 0, 0]}
                  name="Planned Sheets"
                />
                <Bar
                  dataKey="Ruled"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  name="Ruled Sheets"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Rulings</CardTitle>
            <CardDescription>
              A quick look at the latest reel rulings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reel No.</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRulings || loadingItemTypes ? <TableRow><TableCell colSpan={3} className="text-center">Loading...</TableCell></TableRow> : recentRulings.map((ruling, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="font-medium">{ruling.reelNo}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        {ruling.serialNo}
                      </div>
                    </TableCell>
                    <TableCell>{getItemTypeName(ruling.itemTypeId)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={ruling.difference > 0 ? "default" : "destructive"} className={ruling.difference > 0 ? "bg-green-600" : ""}>
                        {ruling.difference.toLocaleString()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    