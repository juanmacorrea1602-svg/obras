# ObraControlIA - Gestión Inteligente de Obras

Este es un sistema experto (PMO) para el control de gestión de obras de construcción, enfocado en la trazabilidad financiera y física.

## Instrucciones para subir a GitHub (Solución de Autenticación)

Si recibes errores de autenticación o de "Secret detected", sigue estos pasos exactos para una limpieza total y un push exitoso:

1. **Borrar configuración previa y reiniciar**:
   ```bash
   rm -rf .git
   git init
   git branch -M main
   ```

2. **Configurar el remoto con tu Token (Recomendado)**:
   *Reemplaza `<TU_TOKEN>` por tu Personal Access Token de GitHub.*
   ```bash
   git remote add origin https://<TU_TOKEN>@github.com/juanmacorrea1602-svg/obras.git
   ```

3. **Subir el código**:
   ```bash
   git add .
   git commit -m "Initial clean commit"
   git push -u origin main --force
   ```

## Características Principales

- **Dashboard de Gestión**: Análisis de Valor Ganado (EVM), CPI y alertas de desvíos en tiempo real.
- **Módulo de Licitaciones**: Estudio de costos de mercado con márgenes configurables y conversión a obra activa.
- **Registro de Gastos**: Imputación por ítem con extracción de datos mediante OCR (IA).
- **Certificación de Campo**: Registro de avance físico con firma digital y evidencia fotográfica.
- **Reportes Semanales**: Generación automática de estados de situación mediante Genkit.

## Tecnologías

- **Framework**: Next.js 15 (App Router)
- **Base de Datos**: Firebase Firestore
- **Autenticación**: Firebase Auth
- **IA**: Genkit (Google Gemini)
- **UI**: ShadCN + Tailwind CSS
