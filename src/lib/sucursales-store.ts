import { useEffect, useState } from "react";

export type Sucursal = {
  id: string;
  nombre: string;
  direccion: string;
};

const STORAGE_KEY = "timecore_sucursales";

const DEFAULT_SUCURSALES: Sucursal[] = [
  { id: "matriz", nombre: "Matriz", direccion: "Sucursal principal" },
];

function read(): Sucursal[] {
  if (typeof window === "undefined") return DEFAULT_SUCURSALES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SUCURSALES;
    const parsed = JSON.parse(raw) as Sucursal[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SUCURSALES;
    return parsed;
  } catch {
    return DEFAULT_SUCURSALES;
  }
}

function write(list: Sucursal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("sucursales:changed"));
}

export function useSucursales() {
  const [sucursales, setSucursales] = useState<Sucursal[]>(() => read());

  useEffect(() => {
    const sync = () => setSucursales(read());
    window.addEventListener("sucursales:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sucursales:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const agregar = (nombre: string, direccion: string) => {
    const nueva: Sucursal = {
      id: `${Date.now()}`,
      nombre: nombre.trim(),
      direccion: direccion.trim(),
    };
    write([...read(), nueva]);
  };

  const eliminar = (id: string) => {
    if (id === "matriz") return;
    write(read().filter((s) => s.id !== id));
  };

  return { sucursales, agregar, eliminar };
}
