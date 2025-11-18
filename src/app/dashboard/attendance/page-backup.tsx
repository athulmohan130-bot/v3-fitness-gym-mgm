"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AttendancePageMinimal() {
  const [viewMode, setViewMode] = useState<"grid" | "list" | "compact">("compact");

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>/</span>
        <span className="text-foreground">Attendance</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">
          Track member check-ins and monitor gym activity
        </p>
      </div>

      {/* View Mode Buttons */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === "grid" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewMode("grid")}
        >
          Grid
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewMode("list")}
        >
          List
        </Button>
        <Button
          variant={viewMode === "compact" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewMode("compact")}
        >
          Compact
        </Button>
      </div>

      {/* Simple Content */}
      <Card>
        <CardContent className="p-6">
          <p>Minimal attendance page - Current view: {viewMode}</p>
          <p>Navigation should work normally from here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
