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
import { MoreHorizontal, Eye, Pencil, KeyRound, Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { EstudiantesTable } from "@/components/dashboard/estudiantes-table";

const ESTADOS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
  { value: "retirado", label: "Retirado" },
  { value: "egresado", label: "Egresado" },
];

export default function EstudiantesPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("activo");
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    ci: "",
    rude: "",
    genero: "",
    estado: "activo",
  });

  const GENEROS = ["Masculino", "Femenino"];

  // Validar RUDE (15-16 dígitos)
  const validarRude = (rude: string) => {
    if (!rude) return true;
    const cleaned = rude.replace(/\D/g, "");
    return cleaned.length >= 15 && cleaned.length <= 16;
  };

  // Validar edad mínima (4 años cumplidos hasta 30 de junio de 2026)
  const validarEdadMinima = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return true;
    const fecha = new Date(fechaNacimiento);
    const fechaLimite = new Date(2022, 5, 30);
    return fecha <= fechaLimite;
  };

  // Calcular si es mayor a 18 años (al 30 de junio de 2026)
  const esEstudianteMayor = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return false;
    const fecha = new Date(fechaNacimiento);
    const fechaReferencia = new Date(2026, 5, 30);
    const edad = fechaReferencia.getFullYear() - fecha.getFullYear();
    const mes = fechaReferencia.getMonth() - fecha.getMonth();

    if (mes < 0 || (mes === 0 && fechaReferencia.getDate() < fecha.getDate())) {
      return edad - 1 >= 18;
    }
    return edad >= 18;
  };

  const load = useCallback(async () => {
    // Aquí iría la llamada real a la API
    console.log("Cargando estudiantes con filtros:", { search, estadoFilter });
  }, [search, estadoFilter]);

  const handleSearchChange = (e: any) => setSearch(e.target.value);

  const openNew = () => {
    setEditId(null);
    setForm({ ...form });
    setShowDialog(true);
  };
  const openEdit = (e: any) => {
    setEditId(e.id_estudiante);
    setForm({
      nombre: e.nombre,
      apellido: e.apellido,
      ci: e.ci ?? "",
      rude: e.rude ?? "",
      fecha_nacimiento: e.fecha_nacimiento ?? "",
      genero: e.genero,
      estado: e.estado,
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

    if (form.rude && !validarRude(form.rude)) {
      return toast.error("El RUDE debe tener 15 a 16 dígitos válidos");
    }

    if (form.fecha_nacimiento) {
      if (new Date(form.fecha_nacimiento) > new Date()) {
        return toast.error("La fecha de nacimiento no puede ser una fecha futura");
      }
      if (!validarEdadMinima(form.fecha_nacimiento)) {
        return toast.error("El estudiante debe tener 4 años cumplidos hasta el 30/06/2026");
      }
    }

    setShowDialog(false);
    load();
  };

  const handleExportCsv = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/estudiantes/exportar/csv`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al exportar");
      const blob = await data.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "estudiantes.csv";
      a.click();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al exportar");
    }
  };

  const openCrearCuenta = (e: any) => {
    // Implementar creación de cuenta
    toast.info("Función por implementar");
  };

  return (
    <div className="space-y-6">
      {/* Header con pestañas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">Estudiantes</CardTitle>
            <Badge variant="secondary">{/* Contador */}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <!-- Pestañas -->
          <div className="grid grid-cols-4 gap-2 border-b border-border py-2">
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-center py-2 text-sm",
                "bg-white border-b-2 border-primary text-primary"
              )}
            >
              Listado
            </Button>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-center py-2 text-sm",
                "bg-white border-b-2 border-secondary text-secondary"
              )}
            >
              Por Grado
            </Button>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-center py-2 text-sm",
                "bg-white border-b-2 border-accent text-accent"
              )}
            >
              Documentación
            </Button>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-center py-2 text-sm",
                "bg-white border-b-2 border-muted text-muted-foreground"
              )}
            >
              Historial
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contenido según pestaña activa */}
      <div className="mt-4">
        {/* Pestaña: Listado */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Estudiantes</h1>
                <p className="text-muted-foreground">
                  Expedientes digitales — <span className="text-primary">0</span> resultado(s)
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportCsv} className="gap-2">
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button onClick={openNew} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Estudiante
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {load()}
            <EstudiantesTable
              onEdit={openEdit}
              onDelete={() => console.log("delete")}
              onViewDetail={() => console.log("view")}
              onCreateAccount={openCrearCuenta}
            />
          </CardContent>
        </Card>

        {/* Pestaña: Por Grado */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Estudiantes por Grado</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-muted-foreground">
              Implementación pending - Filtrar estudiantes por nivel/grado
            </p>
          </CardContent>
        </Card>

        {/* Pestaña: Documentación */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Documentación</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-muted-foreground">
              Implementación pending - Ver documentos y certificados de estudiantes
            </p>
          </CardContent>
        </Card>

        {/* Pestaña: Historial */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Historial Académico</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-muted-foreground">
              Implementación pending - Ver historial de calificaciones, asistencias y progreso
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}