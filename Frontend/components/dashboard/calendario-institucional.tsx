"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

interface EventoCalendario {
  id_horario?: number;
  materia?: string;
  dia_semana?: string;
  hora_inicio?: string;
  hora_fin?: string;
  actividad?: string;
  publicado?: boolean;
}

interface Cita {
  id_cita?: number;
  titulo?: string;
  descripcion?: string;
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string;
}

export function CalendarioInstitucionalPage() {
  const router = useRouter();
  const [vista, setVista] = useState<"mes" | "semana" | "dia">("mes");
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [fechaActual, setFechaActual] = useState(new Date());

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const loadEventos = useCallback(async () => {
    try {
      // Cargar horarios
      const horRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/calendario/horarios`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );
      const horData = await horRes.json();
      if (horRes.ok) {
        setEventos((prev) => [...prev, ...horData.map((h: any) => ({
          id_horario: h.id_horario,
          materia: h.nombre_materia || 'Sin materia',
          dia_semana: h.dia_semana,
          hora_inicio: h.hora_inicio,
          hora_fin: h.hora_fin,
          actividad: h.actividad || 'Clase',
          publicado: h.publicado || false,
        }))]);
      }

      // Cargar citas
      const citRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/calendario/citas`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );
      const citData = await citRes.json();
      if (citRes.ok) {
        setCitas(citData);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al cargar calendario");
    }
  }, []);

  useEffect(() => {
    loadEventos();
  }, [loadEventos]);

  // Renderizar según vista
  let contenidoCalendario;
  
  if (vista === "mes") {
    // Vistas mes - mostrar grid de días
    const fechaInicio = new Date(fechaActual);
    fechaInicio.setDate(1);
    const fechaFin = new Date(fechaActual);
    fechaFin.setMonth(fechaFin.getMonth() + 1);
    
    const diasEnMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate();
    const diaSemanaInicio = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).getDay();
    
    const diasGrid = [];
    for (let i = 0; i < diaSemanaInicio; i++) {
      diasGrid.push(null);
    }
    for (let d = 1; d <= diasEnMes; d++) {
      diasGrid.push(d);
    }
    
    contenidoCalendario = (
      <div className="grid grid-cols-7 gap-1">
        {diasSemana.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {diasGrid.map((dia, idx) => {
          if (dia === null) return null;
          return (
            <div
              key={idx}
              className="border rounded p-1 text-center min-h-[80px] flex items-center justify-center"
              style={{ background: idx % 7 >= 5 ? "#f8fafc" : "#fff" }}
            >
              {dia}
            </div>
          );
        })}
      </div>
    );
  } else if (vista === "semana") {
    contenidoCalendario = (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setVista("mes")}>Ver Mes</Button>
        <Button variant="outline" onClick={() => setVista("dia")}>Ver Día</Button>
        <p className="text-sm text-muted-foreground">
          Semana de {new Date(fechaActual).toLocaleDateString('es-BO', { month: 'long', weekday: 'long' })}
        </p>
      </div>
    );
  } else {
    contenidoCalendario = (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setVista("mes")}>Ver Mes</Button>
        <Button variant="outline" onClick={() => setVista("semana")}>Ver Semana</Button>
        <p className="text-sm text-muted-foreground">
          Día {fechaActual.getDate()} de {meses[fechaActual.getMonth()]}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendario Institucional</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setVista("mes")}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <rect x="3" y="3" width="14" height="14" rx="2" ry="2" />
              </svg>
              Mes
            </Button>
            <Button variant="outline" onClick={() => setVista("semana")}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <rect x="3" y="3" width="14" height="14" rx="2" ry="2" />
              </svg>
              Semana
            </Button>
            <Button variant="outline" onClick={() => setVista("dia")}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <rect x="3" y="3" width="14" height="14" rx="2" ry="2" />
              </svg>
              Día
            </Button>
            <span className="text-sm text-muted-foreground">
              {fechaActual.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {contenidoCalendario}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horarios Académicos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Materia</TableHead>
                  <TableHead>Día</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No hay horarios registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableBody>
                    {eventos.map((e) => (
                      <TableRow key={e.id_horario}>
                        <TableCell>{e.materia}</TableCell>
                        <TableCell>{e.dia_semana}</TableCell>
                        <TableCell>
                          {e.hora_inicio} - {e.hora_fin}
                        </TableCell>
                        <TableCell>{e.actividad}</TableCell>
                        <TableCell>
                          <Badge
                            variant={e.publicado ? "secondary" : "destructive"}
                          >
                            {e.publicado ? "Publicado" : "Borrador"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Citas y Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {citas.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay citas programadas
            </p>
          ) : (
            <div className="space-y-2">
              {citas.map((c, idx) => (
                <div key={idx} className="p-3 rounded border-b">
                  <div className="font-medium">{c.titulo || 'Cita'}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.fecha ? new Date(c.fecha).toLocaleDateString() : 'Sin fecha'}
                    {c.hora_inicio && c.hora_fin ? ` - ${c.hora_inicio} - ${c.hora_fin}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}