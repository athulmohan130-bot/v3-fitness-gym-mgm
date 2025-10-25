// Reusable skeleton components for consistent loading states across the app

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Card-based skeleton for member/attendance cards
export function MemberCardSkeleton() {
  return (
    <Card className="overflow-hidden border-2">
      <CardContent className="p-5">
        <div className="flex flex-col items-center text-center space-y-3">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
          <div className="w-full pt-2 border-t border-gray-200 space-y-2">
            <Skeleton className="h-3 w-24 mx-auto" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Grid of member cards
export function MemberCardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MemberCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// Stats grid skeleton
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Enhanced table skeleton that matches the actual DataTable structure
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        {/* Search and Columns Controls - matches DataTable */}
        <div className="flex items-center p-4">
          <Skeleton className="h-10 max-w-sm flex-1 rounded-md" /> {/* Search input */}
          <Skeleton className="h-10 w-28 ml-auto rounded-md" /> {/* Columns button */}
        </div>

        {/* Table */}
        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Simulating table headers - matches member columns */}
                <TableHead><Skeleton className="h-4 w-4" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead><Skeleton className="h-4 w-28" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: rows }).map((_, i) => (
                <TableRow
                  key={i}
                  className="animate-in fade-in-50"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Checkbox */}
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  {/* Avatar + Name */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </TableCell>
                  {/* Bio ID */}
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  {/* Plan */}
                  <TableCell>
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </TableCell>
                  {/* Status */}
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  {/* Date */}
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  {/* Actions */}
                  <TableCell>
                    <Skeleton className="h-8 w-20 rounded-md" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination - matches DataTable pagination */}
      <div className="flex items-center justify-between px-2">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full flex items-end justify-between gap-2 px-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="w-full rounded-t"
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Form skeleton
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  );
}

// List item skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-6 w-20" />
    </div>
  );
}

// List skeleton
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}

// Page header skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
  );
}

// Full page loading skeleton
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <PageHeaderSkeleton />
      <StatsGridSkeleton />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <ChartSkeleton />
        </div>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32 mt-1" />
          </CardHeader>
          <CardContent>
            <ListSkeleton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Member detail skeleton - matches the ViewMemberDetails layout
export function MemberDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left column - 2/3 width */}
      <div className="lg:col-span-2 space-y-8">
        {/* Personal Information Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={i === 6 ? "md:col-span-2" : ""}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-full max-w-xs" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Health & Fitness Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
            <div className="md:col-span-2">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-5 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Right column - 1/3 width */}
      <div className="space-y-8">
        {/* Profile Card */}
        <Card>
          <CardHeader className="items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Membership Progress */}
            <div>
              <Skeleton className="h-4 w-36 mb-2" />
              <Skeleton className="h-2 w-full mb-2" />
              <div className="flex justify-between mb-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>

            {/* Plan Details */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>

        {/* Membership History Accordion */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-48 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-5 w-32 mb-3" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Compact list skeleton (for sidebars, quick views)
export function CompactListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-16" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

// Search bar skeleton
export function SearchBarSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="h-10 flex-1 rounded-md" />
      <Skeleton className="h-10 w-32 rounded-md" />
      <Skeleton className="h-10 w-24 rounded-md" />
    </div>
  );
}
