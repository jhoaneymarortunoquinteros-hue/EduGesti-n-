"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function RecordatoriosPagosPage() {
  const router = useRouter();
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vencidosSolo, setVencidosSolo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/pagos/recordatorios?vencidosSolo=${vencidosSolo}`,
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
      setPagos(data.pagos);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [vencidosSolo]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerarRecordatorio = useCallback(async () => {
    if (!confirm("¿Generar recordatorios de pago pendientes?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/pagos/recordatorios`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      toast.success(data.message);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }, [load]);

  const handleVerPago = useCallback(async (id: number) => {
    router.push(`/dashboard/pagos/${id}`);
  }, [router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            type="checkbox"
            checked={vencidosSolo}
            onChange={(e) => setVencidosSolo(e.target.checked)}
            id="vencidosSolo"
            className="w-4 h-4"
          />
          <label htmlFor="vencidosSolo" className="ml-2 text-sm">
            Mostrar solo vencidos
          </label>
        </div>
        <div className="flex-1">
          <Button
            variant="primary"
            onClick={handleGenerarRecordatorio}
            disabled={loading}
          >
            {loading ? "Generando..." : "Generar Recordatorios"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recordatorios de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Cargando...</div>
          ) : (
            <div className="space-y-3">
              {pagos.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {vencidosSolo ? "No hay pagos vencidos" : "No hay recordatorios pendientes"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estudiante</TableHead>
                      <TableHead>Deuda</TableHead>
                      <TableHead>Mes</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último Recordatorio</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagos.map((p) => (
                      <TableRow key={p.id_pago}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="secondary"
                              className="h-8 w-8"
                            >
                              {p.estudiante_nombre?.split(' ')[0][0]}. 
                            </Badge>
                            <span>{p.estudiante_nombre || 'Desconocido'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-2 py-1"
                          >
                            {p.mes_deuda}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.monto_deuda ? `$${p.monto_deuda}` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={p.deuda_estado === 'mora' ? 'destructive' : 'secondary'}
                          >
                            {p.deuda_estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString() : 'Nunca'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleVerPago(p.id_pago)}
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