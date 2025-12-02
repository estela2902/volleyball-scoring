# Agregar Trazabilidad a las Evaluaciones

## Instrucciones para agregar el campo `created_by` a las evaluaciones

### 1. Agregar columna a la tabla evaluaciones

Ejecuta este SQL en el **SQL Editor** de Supabase:

```sql
-- Agregar columna created_by a la tabla evaluaciones
ALTER TABLE evaluaciones 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Crear índice para mejorar el rendimiento en consultas por usuario
CREATE INDEX IF NOT EXISTS idx_evaluaciones_created_by ON evaluaciones(created_by);

-- Agregar comentario a la columna
COMMENT ON COLUMN evaluaciones.created_by IS 'ID del usuario que creó la evaluación';
```

### 2. Actualizar función de eliminación de usuarios

```sql
-- Actualizar función para eliminar evaluaciones del usuario
CREATE OR REPLACE FUNCTION delete_user(
    user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
DECLARE
    target_email VARCHAR(255);
    eval_count INTEGER;
BEGIN
    -- Verificar que el usuario actual es admin
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND (
            auth.users.email = 'estelagonzalez@fvbpa.com'
            OR COALESCE((auth.users.raw_user_meta_data->>'es_admin')::boolean, false) = true
        )
    ) THEN
        RAISE EXCEPTION 'No autorizado - Solo administradores pueden eliminar usuarios';
    END IF;

    -- Obtener el email del usuario objetivo
    SELECT email INTO target_email
    FROM auth.users
    WHERE id = user_id;

    -- No permitir eliminar el super admin
    IF target_email = 'estelagonzalez@fvbpa.com' THEN
        RAISE EXCEPTION 'No se puede eliminar el super administrador';
    END IF;

    -- Contar evaluaciones del usuario
    SELECT COUNT(*) INTO eval_count
    FROM evaluaciones
    WHERE created_by = user_id;

    -- Eliminar evaluaciones del usuario
    DELETE FROM evaluaciones WHERE created_by = user_id;

    -- Eliminar el usuario de auth.users
    DELETE FROM auth.users WHERE id = user_id;

    RAISE NOTICE 'Usuario eliminado. Se eliminaron % evaluaciones asociadas.', eval_count;

    RETURN true;
END;
$$ LANGUAGE plpgsql;
```

### 3. (Opcional) Actualizar evaluaciones existentes

Si ya tienes evaluaciones en la base de datos y quieres asignarlas al super admin:

```sql
-- Asignar evaluaciones existentes (sin created_by) al super admin
UPDATE evaluaciones
SET created_by = (
    SELECT id FROM auth.users 
    WHERE email = 'estelagonzalez@fvbpa.com'
    LIMIT 1
)
WHERE created_by IS NULL;
```

### 4. Verificar la configuración

```sql
-- Ver estructura de la tabla evaluaciones
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'evaluaciones'
ORDER BY ordinal_position;

-- Ver cuántas evaluaciones tiene cada usuario
SELECT 
    u.email,
    COUNT(e.id) as total_evaluaciones
FROM auth.users u
LEFT JOIN evaluaciones e ON e.created_by = u.id
GROUP BY u.id, u.email
ORDER BY total_evaluaciones DESC;
```

## Beneficios de esta implementación

1. ✅ **Trazabilidad completa**: Sabes quién creó cada evaluación
2. ✅ **Auditoría**: Puedes rastrear las acciones de cada usuario
3. ✅ **Eliminación en cascada**: Al eliminar un usuario, se eliminan sus evaluaciones
4. ✅ **Reportes por usuario**: Puedes generar estadísticas de quién evalúa más
5. ✅ **Integridad de datos**: Relación con Foreign Key hacia auth.users

## Notas importantes

- El campo `created_by` permite NULL para mantener compatibilidad con evaluaciones existentes
- `ON DELETE SET NULL` significa que si se elimina un usuario, el campo se pone en NULL (pero ahora lo cambiamos para que se elimine en cascada en la función)
- Las evaluaciones sin `created_by` se pueden asignar manualmente al super admin si es necesario
