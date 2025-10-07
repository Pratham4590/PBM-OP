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
  Factory,
  CheckCircle,
  TrendingUp,
  Sheet,
} from 'lucide-react';
import { recentRulings, chartData, stockSummary, productionSummary } from '@/lib/data';

export default function DashboardPage() {
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
            <div className="text-2xl font-bold">{stockSummary.totalWeight.toLocaleString()} kg</div>
            <p className="text-xs text-muted-foreground">
              Across {stockSummary.paperTypes.length} paper types
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
              {stockSummary.paperTypes.map(p => `${p.reels} ${p.name}`).join(', ')}
            </p>
          </CardContent>
        </Card>
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
                {recentRulings.map((ruling) => (
                  <TableRow key={ruling.reelNo}>
                    <TableCell>
                      <div className="font-medium">{ruling.reelNo}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        {ruling.serialNo}
                      </div>
                    </TableCell>
                    <TableCell>{ruling.itemRuled}</TableCell>
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
