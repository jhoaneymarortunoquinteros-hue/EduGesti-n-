"use client";

import { useContext } from "react";
import { Badge } from "@/components/ui/badge";
import { MenuMoreHorizontal } from "lucide-react";
import { UserContext } from "@/lib/context";

interface ActionMenuProps {
  itemId: number;
  itemType: "estudiante" | "inventario" | "pago" | "comunicado";
  onEdit?: () => void;
  onView?: () => void;
  onDelete?: () => void;
  onDesactivate?: () => void;
}

export function ActionMenu({ itemId, itemType, onEdit, onView, onDelete, onDesactivate }: ActionMenuProps) {
  const { userRole, userPermissions } = useContext(UserContext);

  const canEdit = userRole === 1 || userPermissions?.includes("estudiantes:editar");
  const canView = userRole === 1 || userPermissions?.includes("estudiantes:ver");
  const canDelete = userRole === 1 || (userPermissions?.includes("estudiantes:eliminar") && userRole !== 4);
  const canDesactivate = userRole === 1 || userPermissions?.includes("estudiantes:desactivar");

  return (
    <div className="relative">
      {/* Botón de tres puntos */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => e.stopPropagation()}
        className="text-muted-foreground hover:text-primary"
      >
        <MenuMoreHorizontal className="h-4 w-4" />
      </Button>

      {/* Menú desplegable */}
      <DropdownMenu align="end" className="w-44">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hidden">
            {/* Empty - the trigger is the more dots button above */}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {/* Edición - solo para roles autorizados */}
          {canEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
          )}

          {/* Ver detalles */}
          {canView && (
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              Ver detalles
            </DropdownMenuItem>
          )}

          {/* Historial académico */}
          <DropdownMenuItem>
            <UserCheck className="h-4 w-4 mr-2" />
            Historial académico
          </DropdownMenuItem>

          {/* Documentación */}
          <DropdownMenuItem>
            <FileText className="h-4 w-4 mr-2" />
            Documentación
          </DropdownMenuItem>

          {/* Desactivar/Activar */}
          {canDesactivate && (
            <DropdownMenuItem onClick={onDesactivate}>
              {itemType === "estudiante"
                ? `<EyeOff className="h-4 w-4 mr-2 text-destructive" /> Desactivar`
                : `<Eye className="h-4 w-4 mr-2 text-emerald-600" /> Activar`}
            </DropdownMenuItem>
          )}

          {/* Eliminar - solo superusuario y cuando es seguro */}
          {canDelete && (
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}