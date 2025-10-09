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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User as AppUser, UserRole } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  const firestore = useFirestore();
  const { user: currentUserAuth, isUserLoading: isAuthLoading } = useUser();
  const { toast } = useToast();

  const currentUserDocRef = useMemoFirebase(
    () => (firestore && currentUserAuth ? doc(firestore, 'users', currentUserAuth.uid) : null),
    [firestore, currentUserAuth]
  );
  
  const { data: currentUserData, isLoading: isLoadingCurrentUserDoc } = useDoc<AppUser>(currentUserDocRef);
  
  const allUsersQuery = useMemoFirebase(
    () => {
      if (!currentUserData || currentUserData.role !== 'Admin') {
        return null;
      }
      return firestore ? collection(firestore, 'users') : null;
    },
    [firestore, currentUserData]
  );

  const { data: users, isLoading: isLoadingAllUsers } = useCollection<AppUser>(allUsersQuery);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!firestore || currentUserData?.role !== 'Admin') return;

    const userDocToUpdate = doc(firestore, 'users', userId);
    try {
        await updateDoc(userDocToUpdate, { role: newRole });
        toast({
            title: 'Role Updated',
            description: `User role has been successfully changed to ${newRole}.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: error.message || 'Could not update user role.'
        });
    }
  };
  
  const isLoading = isAuthLoading || isLoadingCurrentUserDoc;

  if (isLoading) {
     return (
       <>
        <PageHeader
          title="Users & Management"
          description="Manage user roles and permissions."
        />
        <Card>
           <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>
              Checking permissions and loading users...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
       </>
     )
  }

  if (currentUserData?.role !== 'Admin') {
    return (
      <>
        <PageHeader
          title="Users & Management"
          description="Manage user roles and permissions."
        />
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Only users with the 'Admin' role can manage other users.</p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Users & Management"
        description="Manage user roles and permissions. (Admin only)"
      />
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>
            A list of all registered users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[180px]">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAllUsers ? (
                   <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium whitespace-nowrap">{user.displayName}</TableCell>
                      <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(newRole: UserRole) =>
                            handleRoleChange(user.id, newRole)
                          }
                          disabled={user.id === currentUserAuth?.uid} // Can't change your own role
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Member">Member</SelectItem>
                            <SelectItem value="Operator">Operator</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
    