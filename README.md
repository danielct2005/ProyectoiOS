Implementa la nueva sección 'Gestión Vehicular' siguiendo la arquitectura y diseño de las secciones actuales. La sección debe contener y gestionar los siguientes bloques de datos:

Ficha del Vehículo: Registro de datos fijos (Marca, modelo, año, patente/placa, VIN) y Odómetro dinámico (kilometraje actual).

Módulo de Mantenciones: Historial con fecha, kilometraje del servicio, descripción, costo y selector de 'Tipo de Servicio' (Aceite, Frenos, Neumáticos, etc.).

Control de Documentación: Panel de vencimientos para:

Seguro/Póliza.

Revisión Técnica / ITV.

Permiso de Circulación / Impuesto Vehicular.

Incluir sistema de estados: Vigente, Próximo a vencer y Vencido.

Bitácora de Gastos: Registro rápido de carga de combustible y otros gastos (peajes, reparaciones) que se vinculen automáticamente al módulo de Finanzas de la app.

Próximos Eventos: Generar recordatorios automáticos que se integren con la sección de Agenda basados en fechas de documentos o kilometraje proyectado.

Genera la vista principal, los modales de ingreso y actualiza el modelo de datos global para incluir esta nueva entidad.
