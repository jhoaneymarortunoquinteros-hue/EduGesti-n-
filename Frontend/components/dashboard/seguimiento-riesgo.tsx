"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

interface EstudianteRiesgo {
  id_estudiante: number;
  nombre: string;
  apellido: string;
  ci: string;
  promedio: number | null;
  inasistencias: number;
  tardanzas: number;
  nivel_riesgo: "Bajo" | "Medio" | "Alto" | "Critico";
  causa_principal: string | null;
  estado_analisis: string;
}

export function SeguimientoRiesgoPage() {
  const router = useRouter();
  const [estudiantes, setEstudiantes] = useState<EstudianteRiesgo[]>([]);
  const [loading, setLoading] = useState(true);
  const [nivelFiltro, setNivelFiltro] = useState("todos");
  const [cursoId, setCursoId] = useState("");
  const [materiaId, setMateriaId] = useState("");
  const [trimestre, setTrimestre] = useState("1");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/riesgo-academico/estudiantes?nivel=${nivelFiltro}&curso=${cursoId}&materia=${materiaId}&trimestre=${trimestre}`,
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
      setEstudiantes(data.estudiantes);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [nivelFiltro, cursoId, materiaId, trimestre]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVerDetalle = useCallback((id: number) => {
    router.push(`/dashboard/estudiantes/${id}`);
  }, [router]);

  const estadoClase = (nivel: string) => {
    const map: Record<string, string> = {
      Bajo: "bg-secondary/10 text-secondary",
      Medio: "bg-cyan-100 text-cyan-700",
      Alto: "bg-yellow-100 text-yellow-700",
      Critico: "bg-red-100 text-red-700",
    };
    return map[nivel] || "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={nivelFiltro} onValueChange={setNivelFiltro}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Critico">Crítico</SelectItem>
            <SelectItem value="Alto">Alto</SelectItem>
            <SelectItem value="Medio">Medio</SelectItem>
            <SelectItem value="Bajo">Bajo</SelectItem>
          </SelectContent>
        </Select>

        <Select value={cursoId} onValueChange={setCursoId} disabled={loading}>
          <SelectTrigger className="w-40">
            <SelectValue>Curso</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los cursos</SelectItem>
            {/* Aquí irían los cursos cargados dinámicamente */}
          </SelectContent>
        </Select>

        <Select value={materiaId} onValueChange={setMateriaId} disabled={loading}>
          <SelectTrigger className="w-40">
            <SelectValue>Materia</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las materias</SelectItem>
          </SelectContent>
        </Select>

        <Select value={trimestre} onValueChange={setTrimestre}>
          <SelectTrigger className="w-40">
            <SelectValue>Trimestre</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="primary" onClick={load} disabled={loading}>
          {loading ? "Actualizando..." : "Aplicar filtros"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seguimiento de Intervenciones Académicas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Promedio</TableHead>
                  <TableHead>Inasistencias</TableHead>
                  <TableHead>Tardanzas</TableHead>
                  <TableHead>Nivel Riesgo</TableHead>
                  <TableHead>Causa Principal</TableHead>
                  <TableHead className="text-right">Ver Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estudiantes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay estudiantes con el filtro seleccionado
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableBody>
                    {estudiantes.map((e) => (
                      <TableRow key={e.id_estudiante}>
                        <TableCell>
                          <div className="font-medium">{e.nombre} {e.apellido}</div>
                          <p className="text-xs text-muted-foreground">CI: {e.ci}</p>
                        </TableCell>
                        <TableCell>
                          {e.promedio !== null ? e.promedio.toFixed(2) : '—'}
                        </TableCell>
                        <TableCell>{e.inasistencias}</TableCell>
                        <TableCell>{e.tardanzas}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={estadoClase(e.nivel_riesgo)}
                          >
                            {e.nivel_riesgo}
                          </Badge>
                        </TableCell>
                        <TableCell>{e.causa_principal || '—'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleVerDetalle(e.id_estudiante)}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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