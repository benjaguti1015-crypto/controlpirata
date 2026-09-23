# Cookie Crave Control

Crea una aplicación web optimizada para gestión de pedidos, control de inventario y cálculo de utilidades para un emprendimiento de galletas artesanales. El diseño visual debe ser moderno, limpio y cálido, utilizando una paleta de colores inspirada en la repostería (fondos crema/beige, acentos en marrón chocolate y detalles sutiles en ámbar/caramelo). Debe construirse utilizando React, Tailwind CSS, TypeScript y componentes de shadcn/ui con iconos de Lucide.



La aplicación debe estructurarse en las siguientes vistas funcionales interconectadas:



1. **Módulo de Productos e Inventario:**

   - Permite registrar, editar y eliminar galletas/productos.

   - Campos requeridos por producto: Nombre, Costo de producción unitario, Precio de venta unitario y Stock actual (unidades disponibles).

   - Cálculo automático en tiempo real: Margen de utilidad por unidad (Precio de venta - Costo) y porcentaje de ganancia.



2. **Módulo de Registro de Pedidos:**

   - Formulario manual para registrar nuevos pedidos.

   - Campos: Nombre del cliente, fecha del pedido, y selector dinámico de productos donde se pueda elegir la galleta y la cantidad deseada (permitiendo agregar múltiples ítems a un mismo pedido).

   - Validación de stock: El sistema debe verificar que la cantidad solicitada no supere el stock disponible, mostrando una advertencia visual si el stock es insuficiente, pero permitiendo registrarlo si el usuario lo confirma conscientemente.



3. **Módulo de Gestión y Entrega de Pedidos:**

   - Listado de pedidos organizados por estado ("Pendientes" y "Entregados").

   - Botón de acción rápida en cada pedido: "Marcar como Entregado".

   - Al hacer clic en "Marcar como Entregado", la aplicación debe ejecutar una transacción lógica que:

     * Cambie el estado del pedido a entregado.

     * Descuente automáticamente la cantidad vendida del stock actual de cada producto correspondiente.

     * Actualice los acumuladores de ventas y utilidades.



4. **Dashboard Financiero y Métricas:**

   - Tarjetas de resumen en la parte superior con: Ingresos Totales (Ventas), Costos Totales, Utilidad Neta Real y Total de Pedidos Pendientes.

   - Gráficos o listas simples que muestren los productos más vendidos y el rendimiento financiero general conectado directamente a las ventas de pedidos entregados.



### Requisitos de Robustez (Para evitar errores y asegurar estabilidad):

- **Validación de Formularios:** Impedir el ingreso de precios, costos o cantidades negativas, así como campos vacíos en productos y pedidos.

- **Persistencia de Datos:** Utilizar almacenamiento local robusto (localStorage con tipado estricto) o gestión de estado centralizada para evitar la pérdida de información al refrescar la página.

- **Manejo de Estados Vacíos (Empty States):** Mostrar mensajes ilustrados y botones de acción rápida cuando aún no existan productos registrados o pedidos en curso.

- **Diseño Responsivo:** Adaptabilidad perfecta tanto para computadoras como para uso rápido en tel

éfonos móviles (mobile-first).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://piratacontrol.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e06705f3-f499-40c0-9cb4-a651345af6b7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
