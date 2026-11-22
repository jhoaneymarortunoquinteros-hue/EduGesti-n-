"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Check, X, Clock, Info, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

interface Material {
  id_material: number;
  nombre_item: string;
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  estado: boolean;
}

interface SolicitudMaterial {
  id_solicitud: number;
  id_solicitante: number;
  id_material: number;
  cantidad_solicitada: number;
  cantidad_solicitada_entregada: number;
  estado: string;
  justificacion: string;
  fecha_solicitud: string;
  material_nombre: string;
}

export function SolicitudesMaterialPage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<SolicitudMaterial[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (estadoFilter !== "todos") params.estado = estadoFilter;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/inventario/solicitudes`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      setSolicitudes(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [search, estadoFilter]);

  const loadMateriales = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/inventario/materiales?estado=true`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      setMateriales(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }, []);

  useEffect(() => {
    load();
    loadMateriales();
  }, [load, loadMateriales]);

  const handleNew = () => {
    // Implementar creación de solicitud
    toast.info("Crear nueva solicitud - pending");
  };

  const handleAprobar = async (id: number) => {
    if (!confirm("¿Aprobar esta solicitud?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/inventario/solicitudes/${id}/aprobar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ observaciones: "Aprobado por administrador" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      toast.success(data.message);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const handleRechazar = async (id: number) => {
    if (!confirm("¿Rechazar esta solicitud?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/inventario/solicitudes/${id}/rechazar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ observaciones: "Solicitud rechazada" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      toast.success(data.message);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const handleEntregar = async (id: number) => {
    if (!confirm("¿Marcar esta solicitud como entregada?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/inventario/solicitudes/${id}/entregar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ id_tutor: 1, id_estudiante: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      toast.success(data.message);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: "bg-yellow-100 text-yellow-700",
      aprobada: "bg-blue-100 text-blue-700",
      rechazada: "bg-red-100 text-red-700",
      entregada: "bg-green-100 text-green-700",
    };
    return map[estado] || "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Materiales</h1>
          <p className="text-muted-foreground">
            Solicitudes e inventario
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Solicitud
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Input
                placeholder="Buscar solicitudes..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="aprobada">Aprobadas</SelectItem>
                <SelectItem value="rechazada">Rechazadas</SelectItem>
                <SelectItem value="entregada">Entregadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Cargando...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Solicitud</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Solicitado</TableHead>
                    <TableHead>Entregado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitudes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No hay solicitudes registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    solicitudes.map((s) => (
                      <TableRow key={s.id_solicitud}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Solicitud #{s.id_solicitud}</span>
                            <span className="text-xs text-muted-foreground">
                              {s.fecha_solicitud ? new Date(s.fecha_solicitud).toLocaleDateString() : ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{s.material_nombre}</TableCell>
                        <TableCell>{s.cantidad_solicitada}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={s.cantidad_solicitada_entregada > 0 ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}
                          >
                            {s.cantidad_solicitada_entregada}/{s.cantidad_solicitada}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={estadoFilter === "todos" ? undefined : estadoFilter}
                            className={estadoBadge(s.estado)}
                          >
                            {s.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {s.estado === "pendiente" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleAprobar(s.id_solicitud)}>
                                    <Check className="h-4 w-4 mr-2" />
                                    Aprobar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRechazar(s.id_solicitud)}>
                                    <X className="h-4 w-4 mr-2 text-destructive" />
                                    Rechazar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {s.estado === "aprobada" && (
                                <DropdownMenuItem onClick={() => handleEntregar(s.id_solicitud)}>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Entregar
                                </DropdownMenuItem>
                              )}
                              {s.estado !== "entregada" && (
                                <DropdownMenuItem>
                                  <Info className="h-4 w-4 mr-2" />
                                  Ver detalles
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}