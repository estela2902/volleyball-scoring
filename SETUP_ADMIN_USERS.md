# Configuración de Gestión de Usuarios Administradores

## Instrucciones para configurar la gestión de usuarios en Supabase

### 1. Crear función para obtener todos los usuarios

Ejecuta este SQL en el **SQL Editor** de Supabase:

```sql
-- Función para obtener todos los usuarios (solo para administradores)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
    id UUID,
    email VARCHAR(255),
    created_at TIMESTAMPTZ,
    es_admin BOOLEAN
) 
SECURITY DEFINER
AS $$
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
        RAISE EXCEPTION 'No autorizado - Solo administradores pueden acceder';
    END IF;

    RETURN QUERY
    SELECT 
        auth.users.id,
        auth.users.email::VARCHAR(255),
        auth.users.created_at,
        COALESCE((auth.users.raw_user_meta_data->>'es_admin')::boolean, false) as es_admin
    FROM auth.users
    ORDER BY auth.users.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

### 2. Crear función para actualizar el estado de administrador

```sql
-- Función para actualizar el rol de administrador de un usuario
CREATE OR REPLACE FUNCTION update_user_admin_status(
    user_id UUID,
    is_admin BOOLEAN
)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
DECLARE
    target_email TEXT;
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
        RAISE EXCEPTION 'No autorizado - Solo administradores pueden modificar roles';
    END IF;

    -- Obtener el email del usuario objetivo
    SELECT email INTO target_email
    FROM auth.users
    WHERE id = user_id;

    -- No permitir modificar el super admin
    IF target_email = 'estelagonzalez@fvbpa.com' THEN
        RAISE EXCEPTION 'No se puede modificar el rol del super administrador';
    END IF;

    -- Actualizar el metadata del usuario
    UPDATE auth.users
    SET raw_user_meta_data = 
        CASE 
            WHEN is_admin THEN 
                jsonb_set(
                    COALESCE(raw_user_meta_data, '{}'::jsonb),
                    '{es_admin}',
                    'true'::jsonb
                )
            ELSE 
                raw_user_meta_data - 'es_admin'
        END,
        updated_at = NOW()
    WHERE id = user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;
```

### 3. Crear función para eliminar usuarios

**Importante:** Antes de crear esta función, asegúrate de ejecutar el SQL del archivo `SETUP_TRAZABILIDAD_EVALUACIONES.md` para agregar el campo `created_by` a las evaluaciones.

```sql
-- Función para eliminar un usuario y sus evaluaciones
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

### 4. Otorgar permisos de ejecución

```sql
-- Otorgar permisos para ejecutar las funciones
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_admin_status(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated;
```

### 5. Verificar la configuración

Para verificar que todo funciona correctamente:

```sql
-- Ver todos los usuarios y su estado de admin
SELECT 
    email,
    created_at,
    COALESCE((raw_user_meta_data->>'es_admin')::boolean, false) as es_admin
FROM auth.users
ORDER BY created_at DESC;
```

## Uso en la aplicación

Una vez configuradas las funciones, podrás:

1. **Ver todos los usuarios registrados** en la pestaña "Gestión de Usuarios"
2. **Otorgar permisos de administrador** haciendo clic en "✅ Hacer Admin"
3. **Quitar permisos de administrador** haciendo clic en "❌ Quitar Admin"
4. **Eliminar usuarios** haciendo clic en "🗑️ Eliminar" (requiere doble confirmación)

### Notas importantes:

- El usuario `estelagonzalez@fvbpa.com` es el **super administrador** y no puede ser modificado ni eliminado
- Solo los administradores pueden acceder a la gestión de usuarios
- Los cambios se aplican inmediatamente
- Los usuarios administradores tendrán acceso al panel de administración
- **Eliminar un usuario es permanente** y borra todas sus evaluaciones asociadas
- La eliminación requiere confirmación múltiple para evitar accidentes

## Migración del sistema actual

El sistema actual verifica si el email es `estelagonzalez@fvbpa.com` para determinar si es admin. Este sistema:

1. **Mantiene esa verificación** como super admin
2. **Añade la posibilidad** de tener múltiples administradores
3. **Almacena el estado** en `raw_user_meta_data` de auth.users

No es necesario modificar código adicional, el sistema es retrocompatible.
