# **App Name**: ObraControlIA

## Core Features:

- Inicialización de Proyectos y Presupuestos: Interfaz para configurar nuevos proyectos, definir ítems y etapas de trabajo, y cargar el presupuesto teórico inicial y el cronograma (simplificado tipo Gantt).
- Registro de Gastos y Mano de Obra: Un formulario dedicado ('Ficha de Ítem') para la entrada diaria/semanal de compras de materiales (seguimiento de stock vs. consumo), horas de mano de obra (incluyendo cálculos de costo específicos UOCRA), uso de equipos y gastos generales, todo vinculado a ítems específicos del proyecto.
- Certificación de Avance Físico: Interfaz simplificada para que el personal de obra (ej. capataz/arquitecto) ingrese el porcentaje de avance físico real para cada ítem o etapa de trabajo.
- Detección Automática de Anomalías Financieras y Alertas: Una herramienta de IA que monitorea constantemente los datos ingresados contra el presupuesto, identificando y alertando automáticamente a los usuarios sobre 'Gastos fuera de presupuesto', 'Inflación de ítem' (comparando precios unitarios), y advertencias generales de sobrecostos basadas en umbrales predefinidos (ej. gasto superior al 90% del presupuesto de un ítem).
- Panel de Control Dinámico y Visualización de KPIs: Un panel interactivo en tiempo real que proporciona un estado visual de 'semáforo' (verde/amarillo/rojo) para KPIs críticos como el Índice de Desempeño de Costos (CPI), el Índice de Desempeño del Plazo (SPI), la incidencia de mano de obra y el ratio de acopio vs. consumo. Incluye proyecciones de costos finales y fechas de finalización.
- Extracción de Datos de Facturas Asistida por IA: Una herramienta de IA que permite a los usuarios subir fotos de facturas o remitos y extrae automáticamente datos clave como proveedor, CUIT, monto total e ítems, precargando formularios de gastos para una entrada de datos más rápida.
- Reporte Financiero Semanal Automatizado: Una herramienta de IA para generar y enviar automáticamente (exportable a PDF) informes semanales completos que resumen el estado ejecutivo, resaltando las principales desviaciones financieras (ej. ítems con CPI < 1.0 en rojo) y listando los pendientes administrativos.

## Style Guidelines:

- Color primario: Gris azulado profesional (#52636B), evocando estabilidad e integridad de datos, sobre un fondo claro.
- Color de fondo: Gris azulado muy claro y desaturado (#F3F6F8), asegurando una alta legibilidad y una estética limpia.
- Color de acento: Verde vibrante pero claro (#2BD043) para indicar cumplimiento positivo, progreso y elementos interactivos. Las advertencias y alertas utilizarán prominentemente rojo y ámbar.
- Fuente para cuerpo y titulares: 'Inter' (sans-serif de estilo grotesco) para una experiencia moderna, objetiva y altamente legible en todas las pantallas de datos y formularios.
- Utilizar iconos de contorno claros y minimalistas para la navegación y las acciones. Implementar iconos circulares o tipo insignia prominentes y codificados por colores (rojo para alerta, amarillo para precaución, verde para bueno) para representar visualmente el estado de los KPIs en los paneles de control.
- Un diseño estructurado y modular, con una clara separación de cabeceras de contexto dinámicas (selectores de proyecto/etapa), bloques de entrada lógicos (Comprobante, Imputación Técnica, El Diferencial del Analista), y elementos visualmente ricos del panel de control. Priorizar la amplitud y las rutas directas para una entrada de datos eficiente y una rápida identificación de problemas.
- Animaciones sutiles y funcionales para la retroalimentación de la interfaz de usuario, como transiciones suaves entre secciones de formularios, resaltado de alertas recién activadas o indicación de estados de carga, para mejorar la experiencia del usuario sin causar distracciones.