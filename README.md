# Herramientas de Tarjetas

Aplicación web local para generar datos sintéticos de tarjetas destinados a desarrollo, demostraciones y pruebas de interfaces. Funciona en el navegador y no requiere servicios de inteligencia artificial ni claves de API.

## Funciones

- Generación a partir de patrones BIN con dígitos variables.
- Cálculo y validación mediante el algoritmo de Luhn.
- Validador independiente de formato, longitud y Luhn que no guarda el número introducido.
- Lotes reproducibles mediante semilla y año base, limitados a 50 registros sintéticos.
- Copia y exportación en CSV, JSON o texto con encabezados configurables.
- Compatibilidad con números de 15 y 16 dígitos.
- Extrapolación y comparación de patrones.
- Generación de datos ficticios para pruebas.
- Historial y BINs guardados en el almacenamiento local del navegador.
- Temas Día, Noche y Lluvia.
- Control para reducir animaciones y navegación adaptada a móvil.

## Atajos de teclado

- `Alt+G`: abrir el Generador.
- `Alt+V`: abrir el Validador.
- `Alt+L`: abrir la generación por Lotes.
- `Ctrl+Enter` (o `Cmd+Enter`): ejecutar la acción principal del modo activo.

## Ejecutar localmente

### Requisitos

- Node.js 18 o posterior.
- npm.

### Instalación

```bash
npm install
npm run dev
```

La terminal mostrará la dirección local de la aplicación, normalmente `http://localhost:3000`.

### Compilar para producción

```bash
npm run build
npm run preview
```

### Verificación del proyecto

```bash
npm run check
```

Este comando ejecuta las pruebas automáticas, comprueba los tipos y compila la aplicación.

## Privacidad

La funcionalidad principal se ejecuta localmente. El historial y los BINs guardados permanecen en el navegador mediante `localStorage`.

## Uso responsable

Este proyecto está pensado exclusivamente para generar datos sintéticos en entornos de desarrollo y pruebas. No debe utilizarse con datos financieros reales ni para realizar transacciones.
