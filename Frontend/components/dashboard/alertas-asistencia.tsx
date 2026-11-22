"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

interface AlertaAsistencia {
  id_estudiante: number;
  nombre: string;
  apellido: string;
  ci: string;
  total_asistencias: number;
  ausencias_no_justificadas: number;
  llegadas_tarde: number;
  porcentaje_riesgo: number;
  estado_riesgo: "alto" | "medio" | "bajo";
}

export function AlertasAsistenciaPage() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<AlertaAsistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoDias, setPeriodoDias] = useState(30);
  const [nivelRiesgo, setNivelRiesgo] = useState("alto");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/asistencias/alertas?periodoDias=${periodoDias}&nivelRiesgo=${nivelRiesgo}`,
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
      setAlertas(data.alertas);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [periodoDias, nivelRiesgo]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVerDetalle = async (id: number) => {
    router.push(`/dashboard/estudiantes/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            type="number"
            placeholder="Periodo en días"
            value={periodoDias}
            onChange={(e) => setPeriodoDias(Number(e.target.value))}
            min={7}
            max={90}
            className="w-full"
          />
        </div>
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Nivel de riesgo"
            value={nivelRiesgo}
            onChange={(e) => setNivelRiesgo(e.target.value as "alto" | "medio" | "bajo")}
          />
        </div>
        <Button
          variant="primary"
          onClick={load}
          disabled={loading}
          className="flex-1"
        >
          {loading ? "Actualizando..." : "Aplicar filtros"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertas de Inasistencia</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Cargando...</div>
          ) : (
            <div className="space-y-3">
              {alertas.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No hay estudiantes con alertas para el período y nivel de riesgo seleccionados.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estudiante</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Justificadas</TableHead>
                      <TableHead>No Justificadas</TableHead>
                      <TableHead>Llegadas Tarde</TableHead>
                      <TableHead>% Riesgo</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertas.map((a) => (
                      <TableRow key={a.id_estudiante}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="secondary"
                              className="h-8 w-8"
                            >
                              {a.nombre[0]}. {a.apellido[0]}
                            </Badge>
                            <div>
                              <p className="font-medium">{a.nombre} {a.apellido}</p>
                              <p className="text-xs text-muted-foreground">CI: {a.ci}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{a.total_asistencias}</TableCell>
                        <TableCell />
                        <TableCell>
                          <Badge
                            variant="destructive"
                          >
                            {a.ausencias_no_justificadas}
                          </Badge>
                        </TableCell>
                        <TableCell>{a.llegadas_tarde}</TableCell>
                        <TableCell>
                          <Badge
                            variant={a.porcentaje_riesgo === "alto" ? "destructive" : a.porcentaje_riesgo === "medio" ? "warning" : "secondary"}
                          >
                            {a.porcentaje_riesgo}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleVerDetalle(a.id_estudiante)}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}