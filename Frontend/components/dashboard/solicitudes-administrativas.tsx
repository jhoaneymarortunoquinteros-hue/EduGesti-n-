"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MoreHorizontal } from "lucide-react";

interface SolicitudAdministrativa {
  id_solicitud: number;
  tipo: string;
  titulo: string;
  descripcion: string;
  estado: string;
  fecha_solicitud: string;
  fecha_resolucion?: string;
  solicitante: string;
  observaciones?: string;
  responsable_asignado?: number;
}

export function SolicitudesAdministrativasPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudAdministrativa[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFilter, setTipoFilter] = useState("todos");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/solicitudes-administrativas?tipo=${tipoFilter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      setSolicitudes(data.solicitudes);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [tipoFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleNueva = () => {
    // Implementar creación de solicitud
    toast.info("Crear nueva solicitud administrativa - pending");
  };

  const handleAprobar = async (id: number) => {
    if (!confirm("¿Aprobar esta solicitud?")) return;
    try {
      const res = await fetch(
        `/api/solicitudes-administrativas/${id}/aprobar`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify({ observaciones: "Aprobado por administrador" }),
        }
      );
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
      const res = await fetch(
        `/api/solicitudes-administrativas/${id}/aprobar`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify({ observaciones: "Solicitud rechazada", estado: "rechazada" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      toast.success(data.message);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const tipoClase = (tipo: string) => {
    const map: Record<string, string> = {
      licencia: "bg-primary/10 text-primary",
      permiso: "bg-success/10 text-success",
      justificacion: "bg-warning/10 text-warning-foreground",
      "cambio_datos": "bg-info/10 text-info",
      otro: "bg-muted/10 text-muted-foreground",
    };
    return map[tipo] || "";
  };

  const estadoClase = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: "bg-yellow-100 text-yellow-700",
      aprobada: "bg-blue-100 text-blue-700",
      rechazada: "bg-red-100 text-red-700",
      en_proceso: "bg-cyan-100 text-cyan-700",
      resuelta: "bg-green-100 text-green-700",
      cerrada: "bg-gray-100 text-gray-600",
    };
    return map[estado] || "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={handleNueva}>
          <MoreHorizontal className="h-4 w-4 mr-2" />
          Nueva Solicitud
        </Button>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="licencia">Licencia</SelectItem>
            <SelectItem value="permiso">Permiso</SelectItem>
            <SelectItem value="justificacion">Justificación</SelectItem>
            <SelectItem value="cambio_datos">Cambio de Datos</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes Administrativas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trámite</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Solicitud</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay solicitudes registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableBody>
                    {solicitudes.map((s) => (
                      <TableRow key={s.id_solicitud}>
                        <TableCell>
                          <Badge
                            variant="link"
                            className={tipoClase(s.tipo)}
                          >
                            {s.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>{s.titulo}</TableCell>
                        <TableCell>{s.solicitante}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={estadoClase(s.estado)}>
                            {s.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>{s.fecha_solicitud}</TableCell>
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
                              <DropdownMenuItem>
                                <Info className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                )}
              </Table>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}