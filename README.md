# Sistema de Gestión de Pedidos de Compras y Control Presupuestario
## Departamento de Ciencias Agropecuarias
**Facultad de Ingeniería y Ciencias Agropecuarias (FICA) - Universidad Nacional de San Luis**

---

## 🌾 Descripción del Sistema

Sistema web integral desarrollado a medida para el **Departamento de Ciencias Agropecuarias** de la FICA - UNSL. Permite gestionar todas las solicitudes y pedidos de compras anuales de bienes y servicios que realizan las distintas áreas docentes y de investigación, controlar la ejecución presupuestaria en tiempo real, clasificar por rubro y modalidad (Compra Directa / Licitación), y generar la ficha oficial institucional lista para imprimir o guardar como PDF.

Cuenta con **consultas públicas abiertas** (modo solo lectura para cualquier miembro de la comunidad universitaria) y **acceso de administración protegido** para 3 usuarios con contraseña.

---

## 🔑 Usuarios y Claves de Acceso

| Usuario | Clave / Contraseña | Responsable |
| :--- | :--- | :--- |
| **`director`** | `Omar26+` | Director (Omar) |
| **`vicedir`** | `Marisa26+` | Vicedirectora (Marisa) |
| **`dpto`** | `Selva26+` | Departamento (Selva) |

---

## 🚀 Características Principales

### 1. Panel de Control y Métricas Financieras (Consultas Públicas)
- **Presupuesto Departamental Anual**: Fondo inicial definido para el ejercicio, total ejecutado/gastado y saldo libre disponible.
- **Seguimiento por Área**: Visualización del porcentaje asignado, presupuesto calculado, monto gastado y saldo restante para cada área con barras de progreso interactivo.
- **Clasificación por Rubros**: Distribución de compras y solicitudes por rubro (*Vidrio y droga*, *Informática*, *Mobiliario*, *Librería y papelería*, etc.).
- **Modalidades de Compra**: Seguimiento de adquisiciones por *Compra Directa* y *Licitación*.
- **Exportación Abierta**: Descarga de reportes en Excel / CSV y generación de fichas oficiales en PDF sin necesidad de registro.

### 2. Formulario de Carga de Pedidos & Asistente para Mails (Admin)
- Diseñado con la estructura de la **Ficha Oficial de Solicitud de Bienes y Servicios de la FICA**.
- **Asistente de Mail**: Cuadro para pegar el correo electrónico recibido con extractor automático de renglones y respaldo del texto original.
- **Tabla Dinámica de Renglones**: Carga de descripción detallada, cantidad solicitada, unidad de medida, precio unitario estimado y cálculo automático del total.
- **Sección de Proveedores Sugeridos**: Registro de Razón Social, CUIT, Dirección, Teléfono y Email para contacto en el procedimiento de compra.

### 3. Registro y Ejecución de Compras ("Cargar Precio y lo Comprado") (Admin)
- Registro de cantidad real comprada, precio final unitario y total, fecha, proveedor adjudicado y número de Factura / Orden de Compra / Expediente.
- **Descuento Presupuestario Inmediato**: El gasto se descuenta automáticamente del saldo asignado al área y del fondo total del departamento.

---

## 🛠️ Cómo Iniciar el Sistema

### Inicio Rápido en Windows (1 Clic)
Haz doble clic en el archivo:
```
iniciar_sistema.bat
```
Se abrirá automáticamente la aplicación en tu navegador web en `http://localhost:5000`.
