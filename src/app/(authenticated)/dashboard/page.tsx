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
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, Timestamp, doc } from 'firebase/firestore';
import { Ruling, Stock, ItemType, User as AppUser } from '@/lib/types';
import { useMemo } from 'react';

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
  const { user } = useUser();

  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useDoc<AppUser>(currentUserDocRef);
  
  const isOperator = currentUser?.role === 'Operator';

  const rulingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reels') : null, [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'itemTypes') : null, [firestore]);
  
  // Conditionally create the stock query only AFTER we know the user is not an operator
  const stockQuery = useMemoFirebase(() => {
    // Wait until the user's role is confirmed.
    if (isLoadingCurrentUser || !firestore) {
      return null;
    }
    // Only fetch stock if the user is NOT an operator.
    if (isOperator) {
        return null;
    }
    return collection(firestore, 'stock');
  }, [firestore, isOperator, isLoadingCurrentUser]);
  
  const { data: rulings, isLoading: loadingRulings } = useCollection<Ruling>(rulingsQuery);
  const { data: stock, isLoading: loadingStock } = useCollection<Stock>(stockQuery);
  const { data: itemTypes, isLoading: loadingItemTypes } = useCollection<ItemType>(itemTypesQuery);

  const stockSummary = useMemo(() => {
    if (isOperator || !stock) return { totalWeight: 0, totalReels: 0 };
    const totalWeight = stock.reduce((acc, item) => acc + item.totalWeight, 0);
    const totalReels = stock.reduce((acc, item) => acc + item.numberOfReels, 0);
    return { totalWeight, totalReels };
  }, [stock, isOperator]);

  const productionSummary = useMemo(() => {
    if (!rulings) return { sheetsRuledToday: 0, rulingsToday: 0, efficiency: '0.0' };
    const today = new Date().toDateString();

    const todayRulings = rulings.filter(r => {
      const rulingDate = r.date instanceof Timestamp ? r.date.toDate() : new Date(r.date);
      return rulingDate.toDateString() === today;
    });

    const sheetsRuledToday = todayRulings.flatMap(r => r.entries).reduce((acc, entry) => acc + entry.sheetsRuled, 0);
    
    const totalSheetsRuled = rulings.flatMap(r => r.entries).reduce((acc, entry) => acc + entry.sheetsRuled, 0);
    const totalTheoreticalSheets = rulings.flatMap(r => r.entries).reduce((acc, entry) => acc + (entry.theoreticalSheets || 0), 0);
    const efficiency = totalTheoreticalSheets > 0 ? (totalSheetsRuled / totalTheoreticalSheets) * 100 : 0;

    return { sheetsRuledToday, rulingsToday: todayRulings.length, efficiency: efficiency.toFixed(1) };
  }, [rulings]);

  const recentRulings = useMemo(() => {
    if (!rulings) return [];
    return rulings
      .flatMap(r => (r.entries || []).map(e => ({ ...e, reelNo: r.reelNo, serialNo: r.serialNo, date: r.date })))
      .sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date).getTime();
        const dateB = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [rulings]);

  const getItemTypeName = (itemTypeId: string) => itemTypes?.find(it => it.id === itemTypeId)?.name || 'N/A';

  // Comprehensive loading state
  const isLoading = isLoadingCurrentUser || loadingRulings || loadingItemTypes || (!isOperator && loadingStock);
  
  if (isLoadingCurrentUser) { // Start with a more specific loading state
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="text-lg text-muted-foreground">Loading Dashboard...</div>
        </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's your production summary."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!isOperator && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Stock Weight
                </CardTitle>
                <Boxes className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stockSummary.totalWeight.toLocaleString()} kg</div>
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
              <div className="text-2xl font-bold">{stockSummary.totalReels}</div>
                <p className="text-xs text-muted-foreground">
                  In stock
                </p>
              </CardContent>
            </Card>
          </>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sheets Ruled (Today)</CardTitle>
            <Sheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productionSummary.sheetsRuledToday.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {productionSummary.rulingsToday} rulings
            </p>
          </CardContent>
        </Card>
        {!isOperator && (
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Efficiency</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{productionSummary.efficiency}%</div>
                <p className="text-xs text-muted-foreground">
                Based on recent production data
                </p>
            </CardContent>
            </Card>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-1 lg:grid-cols-7">
        {!isOperator && (
            <Card className="col-span-full lg:col-span-4">
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
        )}
        <Card className={`col-span-full ${isOperator ? 'lg:col-span-7' : 'lg:col-span-3'}`}>
          <CardHeader>
            <CardTitle>Recent Rulings</CardTitle>
            <CardDescription>
              A quick look at the latest reel rulings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reel No.</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRulings.length > 0 ? recentRulings.map((ruling, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="font-medium">{ruling.reelNo}</div>
                        <div className="text-sm text-muted-foreground">
                          {ruling.serialNo}
                        </div>
                      </TableCell>
                      <TableCell>{getItemTypeName(ruling.itemTypeId)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={ruling.difference >= 0 ? "default" : "destructive"} className={ruling.difference >= 0 ? "bg-green-600" : ""}>
                          {Math.round(ruling.difference || 0).toLocaleString()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={3} className="text-center">No recent rulings found.</TableCell></TableRow>
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
