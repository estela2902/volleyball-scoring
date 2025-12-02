-- ====================================
-- CONFIGURACIÓN DE PERMISOS PARA TABLAS DE DESARROLLO
-- ====================================

-- Habilitar RLS en las tablas de desarrollo
ALTER TABLE partidos_dev ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones_dev ENABLE ROW LEVEL SECURITY;

-- ====================================
-- POLÍTICAS PARA partidos_dev
-- ====================================

-- Política para LECTURA: permitir a todos los usuarios autenticados y anónimos
CREATE POLICY "Permitir lectura pública de partidos_dev"
ON partidos_dev
FOR SELECT
TO public
USING (true);

-- Política para INSERCIÓN: permitir a usuarios autenticados
CREATE POLICY "Permitir inserción de partidos_dev a usuarios autenticados"
ON partidos_dev
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para ACTUALIZACIÓN: permitir a usuarios autenticados
CREATE POLICY "Permitir actualización de partidos_dev a usuarios autenticados"
ON partidos_dev
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para ELIMINACIÓN: permitir a usuarios autenticados
CREATE POLICY "Permitir eliminación de partidos_dev a usuarios autenticados"
ON partidos_dev
FOR DELETE
TO authenticated
USING (true);

-- ====================================
-- POLÍTICAS PARA evaluaciones_dev
-- ====================================

-- Política para LECTURA: permitir a todos los usuarios autenticados y anónimos
CREATE POLICY "Permitir lectura pública de evaluaciones_dev"
ON evaluaciones_dev
FOR SELECT
TO public
USING (true);

-- Política para INSERCIÓN: permitir a usuarios autenticados
CREATE POLICY "Permitir inserción de evaluaciones_dev a usuarios autenticados"
ON evaluaciones_dev
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para ACTUALIZACIÓN: permitir a usuarios autenticados
CREATE POLICY "Permitir actualización de evaluaciones_dev a usuarios autenticados"
ON evaluaciones_dev
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para ELIMINACIÓN: permitir a usuarios autenticados
CREATE POLICY "Permitir eliminación de evaluaciones_dev a usuarios autenticados"
ON evaluaciones_dev
FOR DELETE
TO authenticated
USING (true);

-- ====================================
-- VERIFICACIÓN DE PERMISOS
-- ====================================

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('partidos_dev', 'evaluaciones_dev')
ORDER BY tablename, policyname;
