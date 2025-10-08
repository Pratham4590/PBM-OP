
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
import { useState, useMemo } from 'react';
import { Reel, PaperType } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

type AggregatedStock = {
  paperTypeId: string;
  paperName: string;
  length: number;
  gsm: number;
  totalWeight: number;
  numberOfReels: number;
};

export default function StockPage() {
  const firestore = useFirestore();
  
  const reelsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reels') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);

  const { data: reels, isLoading: loadingReels } = useCollection<Reel>(reelsQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);

  const [searchFilter, setSearchFilter] = useState('');

  const aggregatedStock = useMemo(() => {
    if (!reels || !paperTypes) return [];

    const stockMap: Record<string, AggregatedStock> = {};

    paperTypes.forEach(pt => {
        stockMap[pt.id] = {
            paperTypeId: pt.id,
            paperName: pt.paperName,
            length: pt.length,
            gsm: pt.gsm,
            totalWeight: 0,
            numberOfReels: 0,
        };
    });

    reels.forEach(reel => {
      if (stockMap[reel.paperTypeId]) {
        stockMap[reel.paperTypeId].totalWeight += reel.weight;
        stockMap[reel.paperTypeId].numberOfReels += 1;
      }
    });

    return Object.values(stockMap);
  }, [reels, paperTypes]);
  
  const filteredStock = useMemo(() => {
    return aggregatedStock.filter(item => 
        item.paperName.toLowerCase().includes(searchFilter.toLowerCase())
    ).sort((a,b) => a.paperName.localeCompare(b.paperName));
  }, [aggregatedStock, searchFilter]);

  const stockStatusVariant = (reels: number): "default" | "destructive" => {
    return reels > 0 ? 'default' : 'destructive';
  };
  
  const stockStatusColor = (reels: number): string => {
    return reels > 0 ? 'bg-green-600 dark:bg-green-800' : '';
  }

  const renderFilters = () => (
    <div className="space-y-2">
      <Label htmlFor='stock-search'>Search by Paper Name</Label>
      <Input id="stock-search" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Type a paper name..." className="h-11" />
    </div>
  );

  return (
    <>
      <PageHeader
        title="📦 Stock Management"
        description="A real-time overview of aggregated paper stock."
      />

      <Card>
        <CardHeader>
          <CardTitle>Stock Summary</CardTitle>
          <CardDescription>This list is automatically generated from individual reel data.</CardDescription>
            <div className="pt-4">
              {renderFilters()}
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paper Name</TableHead>
                  <TableHead>Size (cm)</TableHead>
                  <TableHead>GSM</TableHead>
                  <TableHead>Total Weight (kg)</TableHead>
                  <TableHead>Available Reels</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingReels || loadingPaperTypes ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading stock...</TableCell></TableRow>
                ) : filteredStock && filteredStock.length > 0 ? (
                  filteredStock.map((item) => (
                    <TableRow key={item.paperTypeId}>
                      <TableCell className="font-medium whitespace-nowrap">{item.paperName}</TableCell>
                      <TableCell>{item.length}</TableCell>
                      <TableCell>{item.gsm}</TableCell>
                      <TableCell>{item.totalWeight.toFixed(2)}</TableCell>
                       <TableCell>
                        <Badge variant={stockStatusVariant(item.numberOfReels)} className={stockStatusColor(item.numberOfReels)}>
                          {item.numberOfReels}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No stock found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
