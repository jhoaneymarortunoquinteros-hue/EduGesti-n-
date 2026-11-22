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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  KeyRound,
  Download,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Estudiante {
  id_estudiante: number;
  nombre: string;
  apellido: string;
  ci: string | null;
  rude: string | null;
  genero: string;
  edad?: number;
  estado: string;
}

interface EstudiantesTableProps {
  onEdit?: (estudiante: Estudiante) => void;
  onDelete?: (id: number) => void;
  onViewDetail?: (id: number) => void;
  onCreateAccount?: (estudiante: Estudiante) => void;
}

export function EstudiantesTable({
  onEdit,
  onDelete,
  onViewDetail,
  onCreateAccount,
}: EstudiantesTableProps) {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("activo");
  const router = useRouter();

  const GENEROS = ["Masculino", "Femenino"];
  const ESTADOS = [
    { value: "activo", label: "Activo" },
    { value: "inactivo", label: "Inactivo" },
    { value: "retirado", label: "Retirado" },
    { value: "egresado", label: "Egresado" },
  ];

  const emptyForm: Estudiante = {
    nombre: "",
    apellido: "",
    ci: "",
    rude: "",
    genero: "",
    estado: "activo",
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (estadoFilter !== "todos") params.estado = estadoFilter;
      // Usar la API real del proyecto
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/estudiantes`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      setEstudiantes(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [search, estadoFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleSearchChange = (e: any) => setSearch(e.target.value);

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      activo: "bg-green-100 text-green-700",
      inactivo: "bg-red-100 text-red-700",
      retirado: "bg-yellow-100 text-yellow-700",
      egresado: "bg-gray-100 text-gray-600",
    };
    return map[estado] || "";
  };

  const handleNew = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setShowDialog(true);
  };

  const openEdit = (e: Estudiante) => {
    setEditId(e.id_estudiante);
    setForm({
      nombre: e.nombre,
      apellido: e.apellido,
      ci: e.ci ?? "",
      rude: e.rude ?? "",
      fecha_nacimiento: e.fecha_nacimiento ?? "",
      genero: e.genero,
      de_traslado: false,
      institucion_origen: "",
      observaciones: e.observaciones ?? "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.apellido || !form.genero)
      return toast.error("Nombre, apellido y género son obligatorios");

    if (!form.ci || form.ci.trim() === "") {
      return toast.error("El CI es obligatorio");
    }

    if (!form.rude || form.rude.trim() === "") {
      return toast.error("El RUDE es obligatorio");
    }

    if (form.rude && form.rude.replace(/\D/g, "").length < 15 || form.rude.replace(/\D/g, "").length > 16) {
      return toast.error("El RUDE debe tener 15 a 16 dígitos válidos");
    }

    setSaving(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/estudiantes/${editId}` : "/api/estudiantes";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      toast.success(data.message || "Guardado correctamente");
      setShowDialog(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este estudiante?")) return;
    try {
      const res = await fetch(`/api/estudiantes/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      toast.success(data.message || "Eliminado correctamente");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const initials = (e: Estudiante) =>
    `${e.nombre[0] ?? ""}${e.apellido[0] ?? ""}`.toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estudiantes</h1>
          <p className="text-muted-foreground">
            Expedientes digitales — {estudiantes.length} resultado(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Estudiante
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Input
                placeholder="Buscar por nombre o CI..."
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
                {ESTADOS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Buscando...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudiante</TableHead>
                    <TableHead>CI</TableHead>
                    <TableHead>Género</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estudiantes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Sin resultados
                      </TableCell>
                    </TableRow>
                  ) : (
                    estudiantes.map((e) => (
                      <TableRow key={e.id_estudiante}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {initials(e)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{e.nombre} {e.apellido}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{e.ci ?? "—"}</TableCell>
                        <TableCell>{e.genero}</TableCell>
                        <TableCell>{e.edad ? `${e.edad} años` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={estadoBadge(e.estado)}>
                            {e.estado}
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
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/expedientes?id=${e.id_estudiante}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver expediente
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(e)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              {e.estado !== "inactivo" && e.estado !== "egresado" && (
                                <DropdownMenuItem onClick={() => handleDelete(e.id_estudiante)}>
                                  <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                  Eliminar
                                </DropdownMenuItem>
                              )}
                              {onCreateAccount && (
                                <DropdownMenuItem onClick={() => openCrearCuenta(e)}>
                                  <KeyRound className="h-4 w-4 mr-2" />
                                  Crear cuenta de acceso
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