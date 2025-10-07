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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { Program, PaperType, ItemType } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';

export default function ProgramPage() {
  const firestore = useFirestore();
  const programsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'programs') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'itemTypes') : null, [firestore]);

  const { data: programs, isLoading: loadingPrograms } = useCollection<Program>(programsQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);
  const { data: itemTypes, isLoading: loadingItemTypes } = useCollection<ItemType>(itemTypesQuery);

  const [newProgram, setNewProgram] = useState<Partial<Program>>({
    brand: '',
    bundlesRequired: 0,
    cutoff: 0,
    notebookPages: 0,
    piecesPerBundle: 0,
    ups: 0,
    coverIndex: 0,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleInputChange = (
    field: keyof Program,
    value: string | number
  ) => {
    setNewProgram((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: keyof Program, value: string) => {
    if (field === 'paperTypeId') {
      const selectedPaper = paperTypes?.find((p) => p.id === value);
      if (selectedPaper) {
        setNewProgram((prev) => ({
          ...prev,
          paperTypeId: value,
          gsm: selectedPaper.gsm,
          length: selectedPaper.length,
        }));
      }
    } else {
      setNewProgram((prev) => ({ ...prev, [field]: value }));
    }
  };

  const calculatedValues = useMemo(() => {
    const {
      length = 0,
      cutoff = 0,
      notebookPages = 0,
      gsm = 0,
      bundlesRequired = 0,
      piecesPerBundle = 0,
      ups = 0,
      coverIndex = 0,
    } = newProgram;
    if (
      length > 0 &&
      cutoff > 0 &&
      notebookPages > 0 &&
      gsm > 0 &&
      ups > 0
    ) {
      const sheetsPerNotebook = (notebookPages / 2 / ups) + coverIndex;
      const totalSheetsRequired = sheetsPerNotebook * piecesPerBundle * bundlesRequired;
      const reamWeight = (length * cutoff * gsm * 500) / 10000;
      return { reamWeight, totalSheetsRequired };
    }
    return { reamWeight: 0, totalSheetsRequired: 0 };
  }, [newProgram]);

  const handleCreateProgram = () => {
    if (!firestore) return;

    const programToAdd = {
      date: serverTimestamp(),
      ...newProgram,
      ...calculatedValues,
    };

    const programsCollection = collection(firestore, 'programs');
    addDocumentNonBlocking(programsCollection, programToAdd);
    
    setNewProgram({
      brand: '',
      bundlesRequired: 0,
      cutoff: 0,
      notebookPages: 0,
      piecesPerBundle: 0,
      ups: 0,
      coverIndex: 0,
    });
    setIsModalOpen(false);
  };

  const getPaperTypeName = (paperTypeId?: string) => paperTypes?.find(p => p.id === paperTypeId)?.name;
  const getItemTypeName = (itemTypeId?: string) => itemTypes?.find(i => i.id === itemTypeId)?.name;

  return (
    <>
      <PageHeader
        title="Production Program"
        description="Create and manage production programs with detailed calculations."
      >
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Program
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Production Program</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new program. Calculated values
                will update automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                {/* Inputs */}
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand Name</Label>
                  <Input
                    id="brand"
                    value={newProgram.brand || ''}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paperTypeId">Paper Type</Label>
                  <Select
                    onValueChange={(value) =>
                      handleSelectChange('paperTypeId', value)
                    }
                    disabled={loadingPaperTypes}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select paper" />
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
                <div className="space-y-2">
                  <Label htmlFor="itemTypeId">Item Type</Label>
                   <Select onValueChange={(value) => handleSelectChange('itemTypeId', value)} disabled={loadingItemTypes}>
                     <SelectTrigger>
                       <SelectValue placeholder="Select item type" />
                     </SelectTrigger>
                     <SelectContent>
                       {itemTypes?.map((item) => (
                         <SelectItem key={item.id} value={item.id}>
                           {item.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cutoff">Cutoff (cm)</Label>
                  <Input
                    id="cutoff"
                    type="number"
                    value={newProgram.cutoff || ''}
                    onChange={(e) => handleInputChange('cutoff', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notebookPages">Notebook Pages</Label>
                  <Input
                    id="notebookPages"
                    type="number"
                    value={newProgram.notebookPages || ''}
                    onChange={(e) => handleInputChange('notebookPages', parseInt(e.target.value) || 0)}
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="coverIndex">Cover Pages</Label>
                  <Input
                    id="coverIndex"
                    type="number"
                    value={newProgram.coverIndex || ''}
                    onChange={(e) => handleInputChange('coverIndex', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="piecesPerBundle">Pieces per Bundle</Label>
                  <Input
                    id="piecesPerBundle"
                    type="number"
                    value={newProgram.piecesPerBundle || ''}
                    onChange={(e) => handleInputChange('piecesPerBundle', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bundlesRequired">Bundles Required</Label>
                  <Input
                    id="bundlesRequired"
                    type="number"
                    value={newProgram.bundlesRequired || ''}
                    onChange={(e) => handleInputChange('bundlesRequired', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ups">UPS</Label>
                  <Input
                    id="ups"
                    type="number"
                    value={newProgram.ups || ''}
                    onChange={(e) => handleInputChange('ups', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-4 rounded-md bg-muted p-4">
                <h3 className="font-semibold text-lg">Calculations</h3>
                <div className="space-y-2">
                  <Label>Paper GSM</Label>
                  <Input value={newProgram.gsm || ''} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label>Paper Length (cm)</Label>
                  <Input value={newProgram.length || ''} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label>Ream Weight (kg)</Label>
                  <Input
                    value={calculatedValues.reamWeight.toFixed(2)}
                    readOnly
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Sheets Required</Label>
                  <Input
                    value={Math.ceil(calculatedValues.totalSheetsRequired).toLocaleString()}
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateProgram}>Create Program</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Production Programs</CardTitle>
            <CardDescription>
              List of all created production programs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPrograms ? (
              <div className="p-4 text-center text-muted-foreground">Loading programs...</div>
            ) : programs && programs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Paper</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Sheets Req.</TableHead>
                    <TableHead className="text-right">Ream Wt. (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell className="font-medium">
                        {program.brand}
                      </TableCell>
                      <TableCell>
                        {getPaperTypeName(program.paperTypeId)}
                      </TableCell>
                      <TableCell>
                        {getItemTypeName(program.itemTypeId)}
                      </TableCell>
                      <TableCell>
                        {program.totalSheetsRequired.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {program.reamWeight.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No programs created yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
