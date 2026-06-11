// Datos simulados para prototipo. Reemplazar por consumo de API FastAPI.

export type Empleado = {
  id: number;
  codigo: string;
  nombre: string;
  puesto: string;
  sucursal: string;
  email: string;
  estado: "Activo" | "Inactivo";
};

export const empleados: Empleado[] = [
  { id: 1, codigo: "EMP-001", nombre: "Carlos Ramírez", puesto: "Gerente", sucursal: "Matriz CDMX", email: "carlos.ramirez@empresa.com", estado: "Activo" },
  { id: 2, codigo: "EMP-002", nombre: "Ana López", puesto: "Recepcionista", sucursal: "Sucursal Norte", email: "ana.lopez@empresa.com", estado: "Activo" },
  { id: 3, codigo: "EMP-003", nombre: "Jorge Mendoza", puesto: "Vendedor", sucursal: "Sucursal Sur", email: "jorge.mendoza@empresa.com", estado: "Activo" },
  { id: 4, codigo: "EMP-004", nombre: "María Fernández", puesto: "Contadora", sucursal: "Matriz CDMX", email: "maria.fernandez@empresa.com", estado: "Inactivo" },
  { id: 5, codigo: "EMP-005", nombre: "Luis Castillo", puesto: "Almacenista", sucursal: "Sucursal Guadalajara", email: "luis.castillo@empresa.com", estado: "Activo" },
  { id: 6, codigo: "EMP-006", nombre: "Patricia Núñez", puesto: "Supervisora", sucursal: "Sucursal Monterrey", email: "patricia.nunez@empresa.com", estado: "Activo" },
  { id: 7, codigo: "EMP-007", nombre: "Roberto Díaz", puesto: "Técnico", sucursal: "Sucursal Norte", email: "roberto.diaz@empresa.com", estado: "Activo" },
  { id: 8, codigo: "EMP-008", nombre: "Sofía Hernández", puesto: "Asistente", sucursal: "Matriz CDMX", email: "sofia.hernandez@empresa.com", estado: "Activo" },
];

export type Asistencia = {
  id: number;
  empleado: string;
  codigo: string;
  sucursal: string;
  fecha: string;
  entrada: string;
  salida: string;
  estado: "A tiempo" | "Retardo" | "Falta";
};

export const asistencias: Asistencia[] = [
  { id: 1, empleado: "Carlos Ramírez", codigo: "EMP-001", sucursal: "Matriz CDMX", fecha: "2026-06-11", entrada: "08:00", salida: "17:05", estado: "A tiempo" },
  { id: 2, empleado: "Ana López", codigo: "EMP-002", sucursal: "Sucursal Norte", fecha: "2026-06-11", entrada: "08:15", salida: "17:00", estado: "Retardo" },
  { id: 3, empleado: "Jorge Mendoza", codigo: "EMP-003", sucursal: "Sucursal Sur", fecha: "2026-06-11", entrada: "07:55", salida: "17:10", estado: "A tiempo" },
  { id: 4, empleado: "Luis Castillo", codigo: "EMP-005", sucursal: "Sucursal Guadalajara", fecha: "2026-06-11", entrada: "—", salida: "—", estado: "Falta" },
  { id: 5, empleado: "Patricia Núñez", codigo: "EMP-006", sucursal: "Sucursal Monterrey", fecha: "2026-06-11", entrada: "08:02", salida: "17:00", estado: "A tiempo" },
  { id: 6, empleado: "Roberto Díaz", codigo: "EMP-007", sucursal: "Sucursal Norte", fecha: "2026-06-11", entrada: "08:25", salida: "17:00", estado: "Retardo" },
  { id: 7, empleado: "Sofía Hernández", codigo: "EMP-008", sucursal: "Matriz CDMX", fecha: "2026-06-11", entrada: "07:58", salida: "17:00", estado: "A tiempo" },
];

export type Reloj = {
  id: number;
  nombre: string;
  ip: string;
  puerto: number;
  ubicacion: string;
  estado: "Conectado" | "Desconectado";
  ultimaSync: string;
};

export const relojes: Reloj[] = [
  { id: 1, nombre: "ZKTeco K40-Matriz", ip: "192.168.1.10", puerto: 4370, ubicacion: "Matriz CDMX", estado: "Conectado", ultimaSync: "2026-06-11 09:12" },
  { id: 2, nombre: "ZKTeco F18-Norte", ip: "192.168.2.10", puerto: 4370, ubicacion: "Sucursal Norte", estado: "Conectado", ultimaSync: "2026-06-11 09:10" },
  { id: 3, nombre: "ZKTeco K40-Sur", ip: "192.168.3.10", puerto: 4370, ubicacion: "Sucursal Sur", estado: "Desconectado", ultimaSync: "2026-06-10 18:45" },
  { id: 4, nombre: "ZKTeco MB360-GDL", ip: "192.168.4.10", puerto: 4370, ubicacion: "Sucursal Guadalajara", estado: "Conectado", ultimaSync: "2026-06-11 09:08" },
  { id: 5, nombre: "ZKTeco K50-MTY", ip: "192.168.5.10", puerto: 4370, ubicacion: "Sucursal Monterrey", estado: "Conectado", ultimaSync: "2026-06-11 09:11" },
];

export type Sucursal = {
  id: number;
  nombre: string;
  ubicacion: string;
  empleados: number;
  relojes: number;
};

export const sucursales: Sucursal[] = [
  { id: 1, nombre: "Matriz CDMX", ubicacion: "Av. Reforma 100, Ciudad de México", empleados: 42, relojes: 2 },
  { id: 2, nombre: "Sucursal Norte", ubicacion: "Av. Insurgentes Norte 500, CDMX", empleados: 18, relojes: 1 },
  { id: 3, nombre: "Sucursal Sur", ubicacion: "Calz. de Tlalpan 2000, CDMX", empleados: 15, relojes: 1 },
  { id: 4, nombre: "Sucursal Guadalajara", ubicacion: "Av. Vallarta 1234, Guadalajara", empleados: 22, relojes: 1 },
  { id: 5, nombre: "Sucursal Monterrey", ubicacion: "Av. Constitución 500, Monterrey", empleados: 28, relojes: 1 },
];

export const sucursalesNombres = sucursales.map((s) => s.nombre);
