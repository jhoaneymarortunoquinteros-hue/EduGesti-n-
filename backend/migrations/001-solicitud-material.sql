-- =====================================================================
-- Migración: Solicitud de Materiales (CU-N03)
-- =====================================================================

-- 1. Tabla: solicitud_material
CREATE TABLE IF NOT EXISTS public.solicitud_material (
    id_solicitud integer NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitante integer NOT NULL,
    id_material integer NOT NULL,
    cantidad_solicitada integer NOT NULL,
    cantidad_solicitada_entregada integer DEFAULT 0,
    estado character varying(20) DEFAULT 'pendiente' NOT NULL,
    justificacion text,
    fecha_solicitud timestamp without time zone DEFAULT now() NOT NULL,
    fecha_resolucion timestamp without time zone,
    id_responsable_asignado integer,
    observaciones text,
    CONSTRAINT solicitud_material_estado_check CHECK (((estado)::text = ANY (ARRAY[('pendiente'::character varying)::text, ('aprobada'::character varying)::text, ('rechazada'::character varying)::text, ('entregada'::character varying)::text, ('cancelada'::character varying)::text])))
);

-- 2. Tabla: solicitud_material_detalle (múltiples materiales por solicitud)
CREATE TABLE IF NOT EXISTS public.solicitud_material_detalle (
    id_detalle integer NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud integer NOT NULL REFERENCES public.solicitud_material(id_solicitud) ON DELETE CASCADE,
    id_material integer NOT NULL REFERENCES public.material(id_material) ON DELETE RESTRICT,
    cantidad_solicitada integer NOT NULL,
    cantidad_entregada integer DEFAULT 0,
    CONSTRAINT unique_material_por_solicitud UNIQUE (id_solicitud, id_material)
);

-- 3. Función para validar estado de solicitud
CREATE OR REPLACE FUNCTION public.fn_solicitud_estado_validar()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validar que la cantidad entregada no exceda la solicitada
    IF NEW.cantidad_solicitada_entregada > NEW.cantidad_solicitada THEN
        RAISE EXCEPTION 'La cantidad entregada (%) excede la solicitada (%)',
            NEW.cantidad_solicitada_entregada, NEW.cantidad_solicitada;
    END IF;
    RETURN NEW;
END;
$$;

-- 4. Trigger para validar en solicitud_material
CREATE TRIGGER tr_solicitud_material_estado_validar
AFTER INSERT OR UPDATE ON public.solicitud_material
FOR EACH ROW
EXECUTE FUNCTION public.fn_solicitud_estado_validar();

-- 5. Función para registrar movimiento de stock por solicitud aprobada
CREATE OR REPLACE FUNCTION public.fn_registrar_movimiento_solicitud()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_material public.material%ROWTYPE;
BEGIN
    -- Solo ejecutar cuando el estado cambia a 'entregada'
    IF TG_OP = 'UPDATE' AND NEW.estado = 'entregada' AND OLD.estado != 'entregada' THEN
        -- Registrar movimiento de salida del inventario
        UPDATE material
        SET stock_actual = stock_actual - NEW.cantidad_solicitada_entregada
        WHERE id_material = NEW.id_material;
        
        -- Registrar en bitácora
        INSERT INTO public.bitacora (id_usuario, id_modulo, id_funcionalidad, accion, tabla_afectada, id_registro_afectado, descripcion)
        VALUES (
            NEW.id_responsable_asignado,
            (SELECT id_modulo FROM public.modulo WHERE nombre_modulo = 'inventario'),
            (SELECT id_funcionalidad FROM public.funcionalidad WHERE metodo = 'POST /api/inventario/materiales'),
            'INSERT',
            'solicitud_material',
            NEW.id_solicitud,
            'Material entregado por solicitud: ' || COALESCE((SELECT nombre_item FROM public.material WHERE id_material = NEW.id_material), 'desconocido')
        );
    END IF;
    RETURN NEW;
END;
$$;

-- 6. Trigger para aplicar movimiento al aprobar/entregar
CREATE TRIGGER tr_solicitud_material_movimiento
AFTER UPDATE ON public.solicitud_material
FOR EACH ROW
EXECUTE FUNCTION public.fn_registrar_movimiento_solicitud();