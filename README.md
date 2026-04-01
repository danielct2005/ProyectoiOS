Tengo un problema en mi aplicación de finanzas. Cuando registro movimientos de forma manual, los datos se guardan correctamente y permanecen ahí después de reiniciar la app. Sin embargo, al usar la función de 'Importar Datos', sucede lo siguiente:

Los datos aparecen visualmente en la interfaz tras la importación.

Si cierro la app o la actualizo, los datos importados desaparecen.

El problema parece estar ligado específicamente a los datos de la billetera/wallet.

Lo que necesito:

Revisa mi lógica de importación para ver si estoy olvidando ejecutar el método de persistencia (commit, save, push, etc.).

Verifica si hay un conflicto de IDs (Primary Keys) que cause que los datos importados no se guarden por duplicidad o formato.

Analiza si la importación se está haciendo de forma asíncrona pero sin confirmar la transacción en la base de datos.
