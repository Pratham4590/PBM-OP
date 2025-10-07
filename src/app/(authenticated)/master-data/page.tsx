'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { PaperType, ItemType } from '@/lib/types';

const initialPaperTypes: PaperType[] = [
  { id: '1', name: 'Maplitho', gsm: 58, length: 91.5 },
  { id: '2', name: 'Creamwove', gsm: 60, length: 88 },
  { id: '3', name: 'Coated Art', gsm: 120, length: 70 },
];

const initialItemTypes: ItemType[] = [
  { id: '1', name: 'Single Line', shortCode: 'SL' },
  { id: '2', name: 'Double Line', shortCode: 'DL' },
  { id: '3', name: 'Four Line', shortCode: 'FL' },
  { id: '4', name: 'Square Line', shortCode: 'SQL' },
];

export default function MasterDataPage() {
  const [paperTypes, setPaperTypes] = useState<PaperType[]>(initialPaperTypes);
  const [itemTypes, setItemTypes] = useState<ItemType[]>(initialItemTypes);
  const [newPaperType, setNewPaperType] = useState({
    name: '',
    gsm: '',
    length: '',
  });
  const [newItemType, setNewItemType] = useState({ name: '', shortCode: '' });

  const handleAddPaperType = () => {
    if (newPaperType.name && newPaperType.gsm && newPaperType.length) {
      setPaperTypes([
        ...paperTypes,
        {
          id: `${paperTypes.length + 1}`,
          name: newPaperType.name,
          gsm: parseFloat(newPaperType.gsm),
          length: parseFloat(newPaperType.length),
        },
      ]);
      setNewPaperType({ name: '', gsm: '', length: '' });
    }
  };

  const handleAddItemType = () => {
    if (newItemType.name && newItemType.shortCode) {
      setItemTypes([
        ...itemTypes,
        {
          id: `${itemTypes.length + 1}`,
          name: newItemType.name,
          shortCode: newItemType.shortCode,
        },
      ]);
      setNewItemType({ name: '', shortCode: '' });
    }
  };

  return (
    <>
      <PageHeader
        title="Master Data"
        description="Manage reference data for paper, items, and more."
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Master Data</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <h3 className="text-lg font-semibold">Add Paper Type</h3>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paper-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="paper-name"
                  value={newPaperType.name}
                  onChange={(e) =>
                    setNewPaperType({ ...newPaperType, name: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paper-gsm" className="text-right">
                  GSM
                </Label>
                <Input
                  id="paper-gsm"
                  type="number"
                  value={newPaperType.gsm}
                  onChange={(e) =>
                    setNewPaperType({ ...newPaperType, gsm: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paper-length" className="text-right">
                  Length (cm)
                </Label>
                <Input
                  id="paper-length"
                  type="number"
                  value={newPaperType.length}
                  onChange={(e) =>
                    setNewPaperType({ ...newPaperType, length: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <Button onClick={handleAddPaperType} className="w-full">
                Add Paper Type
              </Button>
              <hr />
              <h3 className="text-lg font-semibold">Add Item Type</h3>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="item-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="item-name"
                  value={newItemType.name}
                  onChange={(e) =>
                    setNewItemType({ ...newItemType, name: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="item-shortCode" className="text-right">
                  Short Code
                </Label>
                <Input
                  id="item-shortCode"
                  value={newItemType.shortCode}
                  onChange={(e) =>
                    setNewItemType({
                      ...newItemType,
                      shortCode: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <Button onClick={handleAddItemType} className="w-full">
                Add Item Type
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Paper Types</CardTitle>
            <CardDescription>
              Define the types of paper used in production.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paper Name</TableHead>
                  <TableHead>GSM</TableHead>
                  <TableHead className="text-right">Length (cm)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paperTypes.map((paper) => (
                  <TableRow key={paper.id}>
                    <TableCell className="font-medium">{paper.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{paper.gsm}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{paper.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Item Types</CardTitle>
            <CardDescription>
              Define the ruling types for notebooks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Short Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemTypes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.shortCode}
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
