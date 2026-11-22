"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function BusquedaGlobal() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [tiposBusqueda, setTiposBusqueda] = useState<{
    estudiantes: boolean;
    cursos: boolean;
    materias: boolean;
    pagos: boolean;
    comunicados: boolean;
  }>({
    estudiantes: true,
    cursos: true,
    materias: true,
    pagos: true,
    comunicados: true,
  });

  const realizarBusqueda = useCallback(async (termino: string) => {
    if (!termino || termino.trim().length === 0) {
      setResultados([]);
      return;
    }

    setCargando(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/busqueda?q=${encodeURIComponent(termino)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Error en la búsqueda");
        setResultados([]);
        return;
      }

      setResultados(data.resultados || []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error en la búsqueda");
      setResultados([]);
    } finally {
      setCargando(false);
    }
  }, []);

  const manejarSeleccion = useCallback((item: any) => {
    // Navegar al módulo correspondiente según el tipo
    if (item.tipo === "estudiantes") {
      router.push(`/dashboard/estudiantes`);
    } else if (item.tipo === "cursos") {
      router.push(`/dashboard/cursos/${item.id}`);
    } else if (item.tipo === "materias") {
      router.push(`/dashboard/materias`);
    } else if (item.tipo === "pagos") {
      router.push(`/dashboard/pagos`);
    } else if (item.tipo === "comunicados") {
      router.push(`/dashboard/comunicacion`);
    }
  }, [router]);

  return (
    <div className="relative">
      <Input
        type="search"
        placeholder="Buscar estudiantes, pagos, reportes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            realizarBusqueda(query);
          }
        }}
        className="w-full pl-10 pr-4"
        disabled={cargando}
      />
      {cargando && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Buscando...</span>
      )}
      {query && !cargando && resultados.length > 0 && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-border overflow-hidden max-h-96">
          <div className="p-3 border-b border-border">
            <h4 className="font-medium text-sm">Resultados para "{query}"</h4>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {Object.entries(resultados).map(([tipo, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={tipo} className="space-y-2">
                  <p className="text-xs text-muted-foreground capitalize">{tipo}</p>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        size="icon"
                        className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-muted/50"
                        onClick={() => manejarSeleccion(item)}
                      >
                        {item.icono || '📌'}
                        <span className="truncate max-w-[150px]">{item.nombre}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}