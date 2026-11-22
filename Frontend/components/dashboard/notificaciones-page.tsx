"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

interface Notificacion {
  id_notificacion: number;
  titulo: string;
  contenido: string;
  canal: string;
  estado_envio: string;
  fecha_envio: string;
  remitente: string;
  aviso_titulo: string;
}

export function NotificacionesPage() {
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/notificaciones?soloNoLeidas=${soloNoLeidas ? 'true' : 'false'}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      setNotificaciones(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [soloNoLeidas]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarcarComoLeida = async (id: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/notificaciones/${id}/leer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      toast.success(data.message);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const estadoClase = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: "bg-yellow-100 text-yellow-700",
      leido: "bg-muted text-muted-foreground",
      enviado: "bg-blue-100 text-blue-700",
      fallido: "bg-red-100 text-red-700",
    };
    return map[estado] || "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setSoloNoLeidas((prev) => !prev)}
        >
          {soloNoLeidas ? "Ver todas" : "Solo no leídas"}
        </Button>
        <span className="text-sm text-muted-foreground">
          {notificaciones.length} notificaciones
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Cargando...</div>
          ) : (
            <div className="space-y-3">
              {notificaciones.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Sin notificaciones
                </div>
              ) : (
                <div>
                  {notificaciones.map((n) => (
                    <div
                      key={n.id_notificacion}
                      className={cn(
                        "p-4 rounded-lg border ",
                        estadoClase(n.estado_envio),
                        " hover:bg-muted/50 transition-colors"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{n.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {n.aviso_titulo || "Sin aviso asociado"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Canal: {n.canal} · {n.fecha_envio ? new Date(n.fecha_envio).toLocaleDateString() : "fecha desconocida"}
                          </p>
                        </div>
                        {!n.estado_envio === 'leido' && (
                          <span className="bg-primary text-primary-foreground rounded-full text-[10px] px-2 py-1">
                            {n.estado_envio === 'pendiente' ? "NUEVA" : "Leída"}
                          </span>
                        )}
                        {n.estado_envio !== 'leido' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMarcarComoLeida(n.id_notificacion)}
                            className="h-5 w-5 rounded-lg bg-primary text-primary-foreground text-xs"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11H5m14 3a7 7 0 11-14 0 7 7 0 0114 0z"
                              />
                            </svg>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}