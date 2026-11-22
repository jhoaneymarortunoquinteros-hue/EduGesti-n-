"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

export function PortalPadresPage() {
  const router = useRouter();
  const [hijos, setHijos] = useState([]);
  const [estudianteSel, setEstudianteSel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState("");

  const loadHijos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/portal/estudiante/hijos`,
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
      setHijos(data.hijos);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInfoAcademica = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/portal/estudiante/informacion/${id}`,
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
      setEstudianteSel(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSolicitarCita = useCallback(async (e: any) => {
    if (!estudianteSel) return;
    
    const fecha = new Date();
    const hoy = fecha.toISOString().split('T')[0];
    
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/portal/estudiante/citas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify({
            id_estudiante: estudianteSel.id_estudiante,
            fecha: hoy,
            motivo: "Solicitud desde portal de padres"
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      toast.success(data.message);
      loadHijos();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }, [estudianteSel, loadHijos]);

  useEffect(() => {
    loadHijos();
  }, [loadHijos]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="primary"
          onClick={loadHijos}
          disabled={loading}
        >
          {loading ? "Cargando..." : "Mis Hijos"}
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Cargando...</div>
      ) : (
        <div>
          {hijos.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No tienes estudiantes vinculados o no tienes permisos.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hijos.map((h) => (
                <div
                  key={h.id_estudiante}
                  className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => loadInfoAcademica(h.id_estudiante)}
                >
                  <div className="font-medium">{h.nombre} {h.apellido}</div>
                  <div className="text-sm text-muted-foreground">
                    Grado: {h.grado || 'N/A'} · {h.parentesco || 'Tutor'}
                  </div>
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => loadInfoAcademica(h.id_estudiante)}
                      title="Ver información académica"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pestaña: Información Académica */}
      {estudianteSel && (
        <Card>
          <CardHeader>
            <CardTitle>Información Académica de {estudianteSel.nombre} {estudianteSel.apellido}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">CI</p>
                <p className="font-medium">{estudianteSel.ci || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de nacimiento</p>
                <p className="font-medium">{estudianteSel.fecha_nacimiento || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Grado y Sección</p>
                <p className="font-medium">{estudianteSel.grado ? `${estudianteSel.grado}°` : '—'}{estudianteSel.sección ? ` - ${estudianteSel.sección}` : ''}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Género</p>
                <p className="font-medium">{estudianteSel.genero || '—'}</p>
              </div>
            </div>

            {/* Calificaciones */}
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Calificaciones Recientes</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Actividad</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estudianteSel.calificaciones?.length > 0 ? (
                    estudianteSel.calificaciones.map((c: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{c.nombre_actividad || '—'}</TableCell>
                        <TableCell>
                          {c.nota !== undefined ? c.nota.toFixed(2) : '—'}
                        </TableCell>
                        <TableCell>{c.fecha_evaluacion ? new Date(c.fecha_evaluacion).toLocaleDateString() : '—'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="py-4 text-center text-muted-foreground">
                        Sin calificaciones registradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Asistencias */}
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Asistencias Recientes</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estudianteSel.asistencias?.length > 0 ? (
                    estudianteSel.asistencias.map((a: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{a.fecha ? new Date(a.fecha).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={a.estado === 'P' ? 'success' : a.estado === 'A' ? 'destructive' : 'secondary'}
                          >
                            {a.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>{a.observaciones || '—'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="py-4 text-center text-muted-foreground">
                        Sin asistencias registradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Deudas */}
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Deudas Pendientes</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Pagado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estudianteSel.deudas?.length > 0 ? (
                    estudianteSel.deudas.map((d: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{d.mes || '—'}</TableCell>
                        <TableCell>{d.monto ? `$${d.monto}` : '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={d.deuda_estado === 'mora' ? 'destructive' : 'secondary'}
                          >
                            {d.deuda_estado}
                          </Badge>
                        </TableCell>
                        <TableCell>{d.pago_estado || '—'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                        Sin deudas pendientes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Solicitar Cita */}
            <div className="mt-4 p-4 border rounded-lg bg-blue-50">
              <p className="text-sm text-muted-foreground mb-2">Solicitar Cita Médica</p>
              <Button
                variant="outline"
                onClick={handleSolicitarCita}
                className="w-full"
              >
                {estudianteSel ? `Solicitar cita para ${estudianteSel.nombre}` : 'Seleccionar estudiante'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pestaña: Nueva Solicitud */}
      {!estudianteSel && (
        <Card>
          <CardHeader>
            <CardTitle>Portal de Padres</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Seleccione un hijo de la lista arriba para ver su información académica y solicitar citas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}