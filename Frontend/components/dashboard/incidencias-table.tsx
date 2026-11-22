"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal } from "lucide-react";

interface Incidencia {
  id_bitacora: number;
  accion: string;
  descripcion: string;
  fecha_hora: string;
  usuario_registro: string;
  modulo: string;
  estado: string;
}

export function IncidenciasTable() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/incidencias`,
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
      setIncidencias(data.incidencias);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleNueva = () => {
    // Implementar creación de incidencia
    toast.info("Crear nueva incidencia - pending");
  };

  const estadoClase = (estado: string) => {
    const map: Record<string, string> = {
     Registrada: "bg-yellow-100 text-yellow-700",
      "En revisión": "bg-blue-100 text-blue-700",
      "En proceso": "bg-cyan-100 text-cyan-700",
      Resuelta: "bg-green-100 text-green-700",
      Cerrada: "bg-gray-100 text-gray-600",
    };
    return map[estado] || "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={handleNueva}>
          <MoreHorizontal className="h-4 w-4 mr-2" />
          Nueva Incidencia
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incidencias Institucionales</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidencias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No hay incidencias registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableBody>
                    {incidencias.map((i) => (
                      <TableRow key={i.id_bitacora}>
                        <TableCell>{i.fecha_hora}</TableCell>
                        <TableCell>{i.modulo}</TableCell>
                        <TableCell>{i.descripcion}</TableCell>
                        <TableCell>{i.usuario_registro}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={estadoClase(i.estado)}>
                            {i.estado}
                          </Badge>
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