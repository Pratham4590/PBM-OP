'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { Stock, PaperType } from '@/lib/types';
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
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, Timestamp } from 'firebase/firestore';

export default function StockPage() {
  const firestore = useFirestore();
  const stockQuery = useMemoFirebase(() => firestore ? collection(firestore, 'stock') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);

  const { data: stock, isLoading: loadingStock } = useCollection<Stock>(stockQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStockItem, setNewStockItem] = useState<Partial<Stock>>({
    numberOfReels: 1,
  });

  const handleSelectPaper = (paperTypeId: string) => {
    const selectedPaper = paperTypes?.find((p) => p.id === paperTypeId);
    if (selectedPaper) {
      setNewStockItem({
        ...newStockItem,
        paperTypeId: selectedPaper.id,
        gsm: selectedPaper.gsm,
        length: selectedPaper.length,
      });
    }
  };

  const handleAddStock = () => {
    if (
      firestore &&
      newStockItem.paperTypeId &&
      newStockItem.totalWeight &&
      newStockItem.numberOfReels &&
      newStockItem.gsm &&
      newStockItem.length
    ) {
      const stockToAdd = {
        date: serverTimestamp(),
        paperTypeId: newStockItem.paperTypeId,
        gsm: newStockItem.gsm,
        length: newStockItem.length,
        totalWeight: newStockItem.totalWeight,
        numberOfReels: newStockItem.numberOfReels,
      };
      const stockCollection = collection(firestore, 'stock');
      addDocumentNonBlocking(stockCollection, stockToAdd);
      setNewStockItem({ numberOfReels: 1 }); // Reset form
      setIsModalOpen(false);
    } else {
      // Basic validation feedback
      alert('Please fill all fields');
    }
  };

  const getPaperTypeName = (paperTypeId: string) => {
    return paperTypes?.find(p => p.id === paperTypeId)?.name || 'N/A';
  }

  const formatDate = (date: Date | Timestamp) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    if (date instanceof Date) {
        return date.toLocaleDateString();
    }
    return 'N/A';
  }

  return (
    <>
      <PageHeader
        title="Stock Management"
        description="Track and manage your paper stock in real-time."
      >
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Stock</DialogTitle>
              <DialogDescription>
                Enter the details of the new paper stock received.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paper-type" className="text-right">
                  Paper Type
                </Label>
                <Select onValueChange={handleSelectPaper} disabled={loadingPaperTypes}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a paper type" />
                  </SelectTrigger>
                  <SelectContent>
                    {paperTypes?.map((paper) => (
                      <SelectItem key={paper.id} value={paper.id}>
                        {paper.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gsm" className="text-right">
                  GSM
                </Label>
                <Input
                  id="gsm"
                  value={newStockItem.gsm || ''}
                  className="col-span-3"
                  readOnly
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="length" className="text-right">
                  Length (cm)
                </Label>
                <Input
                  id="length"
                  value={newStockItem.length || ''}
                  className="col-span-3"
                  readOnly
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="total-weight" className="text-right">
                  Total Weight (kg)
                </Label>
                <Input
                  id="total-weight"
                  type="number"
                  value={newStockItem.totalWeight || ''}
                  onChange={(e) =>
                    setNewStockItem({
                      ...newStockItem,
                      totalWeight: parseFloat(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reels" className="text-right">
                  Number of Reels
                </Label>
                <Input
                  id="reels"
                  type="number"
                  value={newStockItem.numberOfReels || ''}
                  onChange={(e) =>
                    setNewStockItem({
                      ...newStockItem,
                      numberOfReels: parseInt(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddStock}>Add Stock</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Current Stock</CardTitle>
          <CardDescription>A list of all paper stock available.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Paper Type</TableHead>
                <TableHead>GSM</TableHead>
                <TableHead>Length (cm)</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead className="text-right">No. of Reels</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingStock ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading stock...
                  </TableCell>
                </TableRow>
              ) : stock && stock.length > 0 ? (
                stock.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {formatDate(item.date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getPaperTypeName(item.paperTypeId)}
                    </TableCell>
                    <TableCell>{item.gsm}</TableCell>
                    <TableCell>{item.length}</TableCell>
                    <TableCell>{item.totalWeight.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {item.numberOfReels}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No stock added yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
