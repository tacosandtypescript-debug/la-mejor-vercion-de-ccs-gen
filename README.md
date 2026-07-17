# Herramientas de Tarjetas

Aplicación web local para generar datos sintéticos de tarjetas destinados a desarrollo, demostraciones y pruebas de interfaces. Funciona en el navegador y no requiere servicios de inteligencia artificial ni claves de API.

## Funciones

- Generación a partir de patrones BIN con dígitos variables.
- Cálculo y validación mediante el algoritmo de Luhn.
- Compatibilidad con números de 15 y 16 dígitos.
- Extrapolación y comparación de patrones.
- Generación de datos ficticios para pruebas.
- Historial y BINs guardados en el almacenamiento local del navegador.
- Temas Día, Noche y Lluvia.

## Ejecutar localmente

### Requisitos

- Node.js 18 o posterior.
- npm o pnpm.

### Instalación

```bash
pnpm install
pnpm dev
```

La terminal mostrará la dirección local de la aplicación, normalmente `http://localhost:3000`.

### Compilar para producción

```bash
pnpm build
pnpm preview
```

## Privacidad

La funcionalidad principal se ejecuta localmente. El historial y los BINs guardados permanecen en el navegador mediante `localStorage`.

## Uso responsable

Este proyecto está pensado exclusivamente para generar datos sintéticos en entornos de desarrollo y pruebas. No debe utilizarse con datos financieros reales ni para realizar transacciones.
