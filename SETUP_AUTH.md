# Configuración de Autenticación en Supabase

## 1. Habilitar Email Auth en Supabase Dashboard

1. Ve a **Authentication** → **Providers** en tu proyecto de Supabase
2. Asegúrate de que **Email** esté habilitado
3. Configura las plantillas de email (opcional pero recomendado):
   - Ve a **Authentication** → **Email Templates**
   - Personaliza "Confirm signup", "Magic Link", "Reset Password"

## 2. Configurar políticas RLS (Row Level Security)

Ejecuta estos comandos SQL en el **SQL Editor** de Supabase:

```sql
-- Permitir a usuarios autenticados leer todos los partidos
CREATE POLICY "Usuarios autenticados pueden leer partidos"
ON public.partidos
FOR SELECT
TO authenticated
USING (true);

-- Permitir a usuarios autenticados insertar evaluaciones
CREATE POLICY "Usuarios autenticados pueden insertar evaluaciones"
ON public.evaluaciones
FOR INSERT
TO authenticated
WITH CHECK (
  -- El usuario solo puede insertar con su propio email
  auth.email() = email
);

-- Permitir a todos leer evaluaciones (para mostrar estado)
CREATE POLICY "Todos pueden leer evaluaciones"
ON public.evaluaciones
FOR SELECT
TO authenticated, anon
USING (true);

-- Habilitar RLS en las tablas si aún no está habilitado
ALTER TABLE public.partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
```

## 3. Crear usuarios manualmente (método recomendado)

### Opción A: Desde Supabase Dashboard
1. Ve a **Authentication** → **Users**
2. Click en **Invite user** o **Add user**
3. Introduce el email del entrenador/árbitro
4. El usuario recibirá un email para configurar su contraseña

### Opción B: Desde SQL (crear directamente con contraseña)
⚠️ **Importante**: No uses este método en producción. Solo para testing.

```sql
-- NO RECOMENDADO PARA PRODUCCIÓN
-- Este comando crea un usuario directamente (sin email de confirmación)
-- Mejor usar el Dashboard o la API de Supabase

-- Ejemplo (reemplaza con datos reales):
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'entrenador@ejemplo.com',
  crypt('contraseña_temporal', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
```

## 4. (Opcional) Crear tabla de perfiles de usuario

Si quieres almacenar información adicional de usuarios (nombre, equipo, rol):

```sql
-- Crear tabla de perfiles
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre TEXT,
  equipo TEXT,
  rol TEXT CHECK (rol IN ('entrenador_local', 'entrenador_visitante', 'arbitro', 'admin')),
  aprobado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: usuarios pueden leer su propio perfil
CREATE POLICY "Usuarios pueden leer su perfil"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- RLS: solo admins pueden actualizar perfiles (implementar lógica de admin)
CREATE POLICY "Admins pueden actualizar perfiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  -- Verifica si el usuario actual es admin
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND rol = 'admin' AND aprobado = true
  )
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Trigger para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, nombre, equipo, rol, aprobado)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'equipo', ''),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'entrenador_local'),
    false  -- Por defecto no aprobado
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 5. Flujo de uso

### Para crear un nuevo usuario (entrenador/árbitro):

1. **Como admin**, ve al Dashboard de Supabase
2. Authentication → Users → Add user
3. Introduce:
   - Email del entrenador/árbitro
   - (Opcional) Genera contraseña temporal o deja que ellos la creen
4. El usuario recibe email con link de confirmación
5. Usuario accede a la app, hace login y puede completar evaluaciones

### Para que un usuario recupere su contraseña:

1. En la pantalla de login, click en "¿Olvidaste tu contraseña?"
2. Introduce su email
3. Recibe email con link para resetear
4. Crea nueva contraseña y vuelve a entrar

## 6. Verificación

Para verificar que todo funciona:

```sql
-- Ver usuarios creados
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- Ver políticas activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

## 7. Constraint único recomendado

Para evitar duplicados de evaluaciones (protección adicional):

```sql
ALTER TABLE public.evaluaciones
ADD CONSTRAINT uq_evaluaciones_idpartido_equipo UNIQUE (idpartido, equipo);
```

## Notas importantes

- Los usuarios deben confirmar su email antes de poder iniciar sesión (configurable en Supabase)
- Por defecto, Supabase envía emails desde `noreply@mail.app.supabase.io`
- Puedes configurar tu propio dominio SMTP en Settings → Auth
- Las políticas RLS aseguran que solo usuarios autenticados puedan insertar evaluaciones con su email
