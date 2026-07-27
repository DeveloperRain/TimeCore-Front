import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { timecoreApi } from "@/lib/api/timecore";
import { Search, Plus, Pencil, X } from "lucide-react";
import { Commet } from 'react-loading-indicators';
export const Route = createFileRoute("/_authenticated/empleados")({
  validateSearch: (search: Record<string, unknown>) => {
    const rawBranchId = search.branch_id;

    return {
      branch_id:
        rawBranchId !== undefined && rawBranchId !== null && rawBranchId !== ""
          ? Number(rawBranchId)
          : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Empleados — TimeCore" },
      {
        name: "description",
        content: "Gestión de empleados registrados en el sistema TimeCore.",
      },
    ],
  }),
  component: EmpleadosPage,
});

type EstadoEmpleado = "Activo" | "Inactivo";

type SucursalOption = {
  id: number;
  nombre: string;
};

type RelojOption = {
  id: number;
  nombre: string;
  empresa: string;
  branch_id: number | null;
  activo: boolean;
};

type EmpleadoFront = {
  id: number;
  uid: number;
  nombre: string;
  area: string;
  puesto: string;
  sucursal: string;
  email: string;
  empresa: string;
  estado: EstadoEmpleado;
  branch_id?: number | null;
  device_id?: number | null;
};

function normalizeEstado(value: any): EstadoEmpleado {
  const estado = String(value ?? "").toLowerCase().trim();

  if (
    value === true ||
    estado === "activo" ||
    estado === "active" ||
    estado === "1" ||
    estado === "true"
  ) {
    return "Activo";
  }

  return "Inactivo";
}

function EmpleadosPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const branchId = search.branch_id;
  const isBranchMode =
    branchId !== undefined && branchId !== null && !Number.isNaN(branchId);

  const branchParams = isBranchMode ? { branchId } : undefined;

  const [query, setQuery] = useState("");
  const [filterSucursal, setFilterSucursal] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [sucursales, setSucursales] = useState<SucursalOption[]>([]);
  const [relojes, setRelojes] = useState<RelojOption[]>([]);
  const [calculatingUid, setCalculatingUid] = useState(false);
  const [selectedBranchName, setSelectedBranchName] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmpleadoFront | null>(null);
  const [empleados, setEmpleados] = useState<EmpleadoFront[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyingEmployee, setCopyingEmployee] = useState(false);
  const [calculatingCopyUid, setCalculatingCopyUid] = useState(false);
  const [destinationDevices, setDestinationDevices] = useState<RelojOption[]>([]);
  const PAGE_SIZE = 50;

  const [copyForm, setCopyForm] = useState({
    branch_id: "",
    sucursal: "",
    device_id: "",
    empresa: "",
    uid: "",
  });

  const [form, setForm] = useState({
    uid: "",
    nombre: "",
    area: "",
    puesto: "usuario",
    sucursal: "",
    email: "",
    empresa: "",
    device_id: "",
    estado: "Activo" as EstadoEmpleado,
  });

  useEffect(() => {
    cargarSucursales();
  }, [branchId]);

  useEffect(() => {
    setPage(1);
  }, [branchId, query, filterEstado]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      cargarEmpleados();
    }, query ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [branchId, page, query, filterEstado]);

  const cargarSucursales = () => {
    return timecoreApi
      .getBranches()
      .then((res) => {
        const data = Array.isArray(res) ? res : res?.data ?? [];

        const opciones: SucursalOption[] = data
          .map((b: any) => ({
            id: Number(b.id),
            nombre: String(b.name ?? b.nombre ?? "").trim(),
          }))
          .filter((b: SucursalOption) => b.nombre !== "");

        setSucursales(opciones);

        if (isBranchMode) {
          const selected = opciones.find((s) => s.id === Number(branchId));
          setSelectedBranchName(selected?.nombre ?? "");
          setFilterSucursal("");
        } else {
          setSelectedBranchName("");
        }

        return opciones;
      })
      .catch((err) => {
        console.error("Error cargando sucursales:", err);
        setSucursales([]);
        setSelectedBranchName("");
        return [];
      });
  };

  const cargarEmpleados = () => {
    setLoading(true);

    return timecoreApi
      .getUsuariosPaginados({
        page,
        limit: PAGE_SIZE,
        branchId: isBranchMode ? branchId : undefined,
        search: query,
        status: filterEstado,
      })
      .then((res) => {
        const payload = res?.data ?? {};
        const lista = payload.items ?? [];
        setTotal(Number(payload.total ?? 0));
        setTotalPages(Number(payload.pages ?? 1));

        const empleadosApi: EmpleadoFront[] = lista.map((u: any) => ({
          id: Number(u.id ?? u.uid),
          uid: Number(u.uid ?? u.id),
          nombre: String(u.name ?? u.nombre ?? "Sin nombre"),
          area: String(u.area ?? u.department ?? u.departamento ?? ""),
          puesto: String(u.role ?? u.puesto ?? "usuario"),
          sucursal: String(u.sucursal ?? u.branch_name ?? "Sin sucursal"),
          email: String(u.email ?? "Sin correo"),
          empresa: String(u.empresa ?? u.company ?? ""),
          estado: normalizeEstado(u.status ?? u.estado ?? "Activo"),
          branch_id:
            u.branch_id !== undefined && u.branch_id !== null
              ? Number(u.branch_id)
              : null,
          device_id:
            u.device_id !== undefined && u.device_id !== null
              ? Number(u.device_id)
              : null,
        }));

        setEmpleados(empleadosApi);
      })
      .catch((err) => {
        console.error("Error cargando empleados:", err);
        setEmpleados([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  };

  const sucursalesVisibles = useMemo(() => {
    if (!isBranchMode) return sucursales;

    return sucursales.filter((s) => s.id === Number(branchId));
  }, [sucursales, isBranchMode, branchId]);

  const getBranchIdBySucursalName = (nombre: string) => {
    const found = sucursales.find(
      (s) => s.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
    );

    return found?.id;
  };

  const cargarRelojesDeSucursal = async (
    selectedBranchId?: number,
  ): Promise<RelojOption[]> => {
    if (!selectedBranchId) {
      setRelojes([]);
      return [];
    }

    try {
      const res = await timecoreApi.getDevices({ branchId: selectedBranchId });
      const data = Array.isArray(res) ? res : res?.data ?? [];

      const opciones: RelojOption[] = data
        .map((device: any) => ({
          id: Number(device.id),
          nombre: String(device.nombre ?? device.name ?? "Reloj sin nombre"),
          empresa: String(device.empresa ?? ""),
          branch_id:
            device.branch_id !== undefined && device.branch_id !== null
              ? Number(device.branch_id)
              : null,
          activo: Boolean(device.activo ?? device.is_active ?? true),
        }))
        .filter((device: RelojOption) => device.activo);

      setRelojes(opciones);
      return opciones;
    } catch (err) {
      console.error("Error cargando relojes:", err);
      setRelojes([]);
      return [];
    }
  };

  const calcularSiguienteUid = async (deviceId: number) => {
    setCalculatingUid(true);

    try {
      const res = await timecoreApi.getSiguienteUidReloj(deviceId);
      const nextUid = Number(res?.data?.next_uid ?? 1);

      setForm((current) => ({
        ...current,
        uid: String(nextUid),
      }));
    } catch (err) {
      console.error("Error calculando UID del reloj:", err);
      setForm((current) => ({ ...current, uid: "" }));
      window.alert(
        "No se pudo consultar la UID del reloj seleccionado. Verifica que esté conectado."
      );
    } finally {
      setCalculatingUid(false);
    }
  };

  const seleccionarReloj = async (deviceIdValue: string) => {
    const selectedDevice = relojes.find(
      (device) => device.id === Number(deviceIdValue)
    );

    setForm((current) => ({
      ...current,
      device_id: deviceIdValue,
      empresa: selectedDevice?.empresa ?? "",
      uid: "",
    }));

    if (selectedDevice) {
      await calcularSiguienteUid(selectedDevice.id);
    }
  };

  const seleccionarSucursal = async (sucursalNombre: string) => {
    const selectedBranchId = getBranchIdBySucursalName(sucursalNombre);
    const devices = await cargarRelojesDeSucursal(selectedBranchId);
    const firstDevice = devices[0];

    setForm((current) => ({
      ...current,
      sucursal: sucursalNombre,
      device_id: firstDevice ? String(firstDevice.id) : "",
      empresa: firstDevice?.empresa ?? "",
      uid: "",
    }));

    if (firstDevice) {
      await calcularSiguienteUid(firstDevice.id);
    }
  };

  const openAdd = async () => {
    const opciones = await cargarSucursales();
    const selected = isBranchMode
      ? opciones.find((s) => s.id === Number(branchId))
      : opciones[0];

    const devices = await cargarRelojesDeSucursal(selected?.id);
    const firstDevice = devices[0];

    setEditing(null);
    setForm({
      uid: "",
      nombre: "",
      area: "",
      puesto: "usuario",
      sucursal: selected?.nombre ?? "",
      email: "",
      empresa: firstDevice?.empresa ?? "",
      device_id: firstDevice ? String(firstDevice.id) : "",
      estado: "Activo",
    });
    setOpen(true);

    if (firstDevice) {
      await calcularSiguienteUid(firstDevice.id);
    }
  };

  const openEdit = async (e: EmpleadoFront) => {
    await cargarSucursales();
    await cargarRelojesDeSucursal(e.branch_id ?? undefined);
    setEditing(e);
    setForm({
      uid: String(e.uid),
      nombre: e.nombre,
      area: e.area,
      puesto: e.puesto,
      sucursal: e.sucursal === "Sin sucursal" ? "" : e.sucursal,
      email: e.email === "Sin correo" ? "" : e.email,
      empresa: e.empresa,
      device_id: e.device_id ? String(e.device_id) : "",
      estado: e.estado,
    });
    setOpen(true);
  };

  const cargarRelojesDestino = async (
    selectedBranchId?: number,
    sourceDeviceId?: number | null,
  ): Promise<RelojOption[]> => {
    if (!selectedBranchId) {
      setDestinationDevices([]);
      return [];
    }

    try {
      const res = await timecoreApi.getDevices({ branchId: selectedBranchId });
      const data = Array.isArray(res) ? res : res?.data ?? [];

      const opciones: RelojOption[] = data
        .map((device: any) => ({
          id: Number(device.id),
          nombre: String(device.nombre ?? device.name ?? "Reloj sin nombre"),
          empresa: String(device.empresa ?? ""),
          branch_id:
            device.branch_id !== undefined && device.branch_id !== null
              ? Number(device.branch_id)
              : null,
          activo: Boolean(device.activo ?? device.is_active ?? true),
        }))
        .filter(
          (device: RelojOption) =>
            device.activo && device.id !== Number(sourceDeviceId ?? 0)
        );

      setDestinationDevices(opciones);
      return opciones;
    } catch (err) {
      console.error("Error cargando relojes destino:", err);
      setDestinationDevices([]);
      return [];
    }
  };

  const calcularUidDestino = async (deviceId: number) => {
    setCalculatingCopyUid(true);

    try {
      const res = await timecoreApi.getSiguienteUidReloj(deviceId);
      const nextUid = Number(res?.data?.next_uid ?? 1);

      setCopyForm((current) => ({
        ...current,
        uid: String(nextUid),
      }));
    } catch (err) {
      console.error("Error calculando UID destino:", err);
      setCopyForm((current) => ({ ...current, uid: "" }));
    } finally {
      setCalculatingCopyUid(false);
    }
  };

  const seleccionarSucursalDestino = async (branchIdValue: string) => {
    const selectedBranch = sucursales.find(
      (branch) => branch.id === Number(branchIdValue)
    );

    const devices = await cargarRelojesDestino(
      selectedBranch?.id,
      editing?.device_id
    );
    const firstDevice = devices[0];

    setCopyForm({
      branch_id: branchIdValue,
      sucursal: selectedBranch?.nombre ?? "",
      device_id: firstDevice ? String(firstDevice.id) : "",
      empresa: firstDevice?.empresa ?? "",
      uid: "",
    });

    if (firstDevice) {
      await calcularUidDestino(firstDevice.id);
    }
  };

  const seleccionarRelojDestino = async (deviceIdValue: string) => {
    const selectedDevice = destinationDevices.find(
      (device) => device.id === Number(deviceIdValue)
    );

    setCopyForm((current) => ({
      ...current,
      device_id: deviceIdValue,
      empresa: selectedDevice?.empresa ?? "",
      uid: "",
    }));

    if (selectedDevice) {
      await calcularUidDestino(selectedDevice.id);
    }
  };

  const abrirCrearEnOtroReloj = async () => {
    if (!editing) return;

    const defaultBranch =
      sucursales.find((branch) => branch.id === editing.branch_id) ??
      sucursales[0];

    const devices = await cargarRelojesDestino(
      defaultBranch?.id,
      editing.device_id
    );
    const firstDevice = devices[0];

    setCopyForm({
      branch_id: defaultBranch ? String(defaultBranch.id) : "",
      sucursal: defaultBranch?.nombre ?? "",
      device_id: firstDevice ? String(firstDevice.id) : "",
      empresa: firstDevice?.empresa ?? "",
      uid: "",
    });
    setCopyOpen(true);

    if (firstDevice) {
      await calcularUidDestino(firstDevice.id);
    }
  };

  const crearEnOtroReloj = async () => {
    if (!editing || !copyForm.device_id) {
      window.alert("Selecciona el reloj físico de destino.");
      return;
    }

    const targetDevice = destinationDevices.find(
      (device) => device.id === Number(copyForm.device_id)
    );

    const confirmed = window.confirm(
      `Se creará otra asignación de ${editing.nombre} en ${
        targetDevice?.nombre ?? "el reloj seleccionado"
      } (${copyForm.empresa || "sin empresa"}).

` +
        "El empleado original y todas sus asistencias históricas permanecerán intactas. ¿Deseas continuar?"
    );

    if (!confirmed) return;

    setCopyingEmployee(true);

    try {
      const res = await timecoreApi.crearEmpleadoEnOtroReloj(
        editing.id,
        Number(copyForm.device_id)
      );

      const newAssignment = res?.data?.new_assignment ?? {};
      const createdUid = newAssignment.uid ?? copyForm.uid;

      await cargarEmpleados();
      setCopyOpen(false);
      setOpen(false);

      window.alert(
        `Empleado creado en ${targetDevice?.nombre ?? "el reloj destino"} con UID ${createdUid}. La asignación original se conservó.`
      );
    } catch (err) {
      console.error("Error creando empleado en otro reloj:", err);
      window.alert(
        "No se pudo crear la nueva asignación. Verifica que el reloj destino esté conectado."
      );
    } finally {
      setCopyingEmployee(false);
    }
  };

  const guardarEmpleado = () => {
    if (
      !form.uid.trim() ||
      !form.area.trim() ||
      !form.nombre.trim() ||
      !form.device_id
    ) {
      alert("UID, Área, Nombre y Reloj son obligatorios");
      return;
    }

    const selectedBranchId = isBranchMode
      ? Number(branchId)
      : getBranchIdBySucursalName(form.sucursal);

    const profilePayload = {
      role: form.puesto,
      sucursal: form.sucursal,
      email: form.email,
      area: form.area,
      empresa: form.empresa,
      branch_id: selectedBranchId,
    };

    if (!editing) {
      setLoading(true);

      timecoreApi
        .crearUsuario(
          {
            uid: Number(form.uid),
            name: form.nombre,
            role: form.puesto,
          },
          {
            deviceId: Number(form.device_id),
            branchId: selectedBranchId,
          }
        )
        .then(async (created) => {
          const createdUserId = Number(created?.data?.id);

          if (!createdUserId) {
            throw new Error("El backend no devolvió el ID interno del empleado");
          }

          await timecoreApi.actualizarPerfilEmpleadoPorId(
            createdUserId,
            profilePayload
          );

          if (form.estado !== "Activo") {
            await timecoreApi.actualizarEstadoEmpleadoPorId(
              createdUserId,
              form.estado
            );
          }

          alert("Empleado creado con éxito");
        })
        .then(() => {
          cargarEmpleados();
          setOpen(false);
        })
        .catch((err) => {
          console.error("Error creando empleado:", err);
          alert("No se pudo crear el empleado, revise si el reloj está conectado o la UID es correcta.");
        })
        .finally(() => {
          setLoading(false);
        });

      return;
    }

    // Agregar animacion de carga mientras se actualiza el empleado
    setLoading(true);

    timecoreApi
      .actualizarUsuarioPorId(editing.id, {
        name: form.nombre,
        role: form.puesto,
      })
      .then(() =>
        timecoreApi.actualizarPerfilEmpleadoPorId(editing.id, profilePayload)
      )
      .then(() => timecoreApi.actualizarEstadoEmpleadoPorId(editing.id, form.estado))
      .then(() => {
        alert("Empleado actualizado con éxito");
        cargarEmpleados();
        setOpen(false);
      })
      .catch((err) => {
        console.error("Error actualizando empleado:", err);
        alert("No se pudo actualizar el empleado, revise si el reloj está conectado o la UID es correcta.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();

    return empleados.filter((e) => {
      const matchSucursal =
        !filterSucursal || e.sucursal === filterSucursal;

      const matchEstado =
        !filterEstado || e.estado === filterEstado;

      const searchableText = [
        e.nombre,
        e.area,
        e.puesto,
        e.sucursal,
        e.email,
        e.empresa,
        String(e.uid),
      ]
        .join(" ")
        .toLowerCase();

      const matchQuery =
        !normalizedQuery || searchableText.includes(normalizedQuery);

      return matchSucursal && matchEstado && matchQuery;
    });
  }, [empleados, query, filterSucursal, filterEstado]);

  const subtitle = loading
    ? "Cargando empleados..."
    : isBranchMode
      ? `${total} empleados en ${selectedBranchName || "esta sucursal"}`
      : `${total} empleados encontrados`;

  return (
    <AppShell
      title={isBranchMode ? `Empleados de ${selectedBranchName || "Sucursal"}`  
      : "Gestión de Empleados"
      }
      subtitle={subtitle}
    >
      {isBranchMode && (
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-lg border border-border bg-card p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Vista filtrada por sucursal
            </p>
            <p className="text-xs text-muted-foreground">
              Mostrando únicamente empleados de{" "}
              {selectedBranchName || "la sucursal seleccionada"}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/empleados",
                  search: {
                    branch_id: undefined,
                  },
                })
              }
              className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Ver todos
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-4 md:p-5 border-b border-border flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 flex-1 min-w-0">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, área, empresa, puesto, sucursal o email..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isBranchMode && (
              <select
                value={filterSucursal}
                onChange={(e) => setFilterSucursal(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.nombre}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>

            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-5 py-3">Área</th>
                <th className="text-left font-semibold px-5 py-3">Empleado</th>
                <th className="text-left font-semibold px-5 py-3">Puesto</th>
                <th className="text-left font-semibold px-5 py-3">Sucursal</th>
                <th className="text-left font-semibold px-5 py-3">Email</th>
                <th className="text-left font-semibold px-5 py-3">Estado</th>
                <th className="text-left font-semibold px-5 py-3">Empresa</th>
                <th className="text-right font-semibold px-5 py-3">Editar</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filtered.map((e) => (
                <tr
                  key={`${e.id}-${e.uid}-${e.empresa}`}
                  className="hover:bg-muted/40 transition-colors"
                >
                  <td className="px-5 py-3 text-foreground">
                    {e.area || ""}
                  </td>

                  <td className="px-5 py-3 font-medium text-foreground">
                    {e.nombre}
                  </td>

                  <td className="px-5 py-3 text-foreground">{e.puesto}</td>

                  <td className="px-5 py-3 text-foreground">{e.sucursal}</td>

                  <td className="px-5 py-3 text-muted-foreground">{e.email}</td>

                  <td className="px-5 py-3">
                    <span
                      title={
                        e.estado === "Inactivo"
                          ? "Empleado guardado en BD aunque ya no esté en el reloj"
                          : "Empleado presente en el reloj"
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        e.estado === "Activo"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          e.estado === "Activo"
                            ? "bg-success"
                            : "bg-destructive"
                        }`}
                      />
                      {e.estado}
                    </span>
                  </td>

                  <td className="px-5 py-3 text-muted-foreground">
                    {e.empresa || ""}
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(e)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    {loading
                      ? "Cargando empleados..."
                      : isBranchMode
                        ? "No se encontraron empleados en esta sucursal."
                        : "No se encontraron empleados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages} • Maximo {PAGE_SIZE} empleados por página 
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {editing ? "Editar empleado" : "Nuevo empleado"}                                               
              </h3>

              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-card/70 backdrop-blur-[1px]">
                <Commet color="#00884f" size="medium" text="" textColor="" />
              </div>
            )}

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="UID en el Reloj"
                  value={form.uid}
                  disabled={!!editing || calculatingUid || !form.device_id}
                  onChange={(v) => setForm({ ...form, uid: v })}
                  placeholder={
                    calculatingUid
                      ? "Calculando..."
                      : form.device_id
                        ? "UID automática"
                        : "Selecciona un reloj"
                  }
                />

                <Field
                  label="Nombre completo"
                  value={form.nombre}
                  onChange={(v) => setForm({ ...form, nombre: v })}
                  placeholder="Nombre del empleado"
                />

                <Field
                  label="Área"
                  value={form.area}
                  onChange={(v) => setForm({ ...form, area: v })}
                  placeholder="Ej. Riego"
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Rol en el Reloj
                  </label>
                  <select
                    value={form.puesto}
                    onChange={(e) =>
                      setForm({ ...form, puesto: e.target.value })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="usuario">usuario</option>
                    <option value="admin">admin</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Sucursal
                  </label>
                  <select
                    value={form.sucursal}
                    disabled={isBranchMode}
                    onChange={(e) => seleccionarSucursal(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                  >
                    <option value="">Seleccionar...</option>
                    {sucursalesVisibles.map((s) => (
                      <option key={s.id} value={s.nombre}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Reloj físico
                  </label>
                  <select
                    value={form.device_id}
                    disabled={!!editing || relojes.length === 0}
                    onChange={(e) => seleccionarReloj(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                  >
                    <option value="">
                      {relojes.length === 0
                        ? "Sin relojes activos"
                        : "Seleccionar reloj..."}
                    </option>
                    {relojes.map((reloj) => (
                      <option key={reloj.id} value={reloj.id}>
                        {reloj.nombre}
                        {reloj.empresa ? ` (${reloj.empresa})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <Field
                  label="Email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                  placeholder="Sin correo"
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={form.empresa}
                    readOnly
                    placeholder="Se asigna según el reloj"
                    className="w-full rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground">
                    Estado
                  </label>
                  <select
                    value={form.estado}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        estado: e.target.value as EstadoEmpleado,
                      })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
                {editing && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={abrirCrearEnOtroReloj}
                    className="mr-auto rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-70"
                  >
                    Crear en otro reloj
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarEmpleado}
                  disabled={loading}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-70"
                >
                  {editing ? "Guardar cambios" : "Crear empleado"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {copyOpen && editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Crear en otro reloj
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Se creará una asignación independiente de {editing.nombre}.
                </p>
              </div>

              <button
                type="button"
                disabled={copyingEmployee}
                onClick={() => setCopyOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {copyingEmployee && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-card/75 backdrop-blur-[1px]">
                <div className="flex flex-col items-center gap-3">
                  <Commet color="#00884f" size="medium" text="" textColor="" />
                  <p className="text-sm font-medium text-foreground">
                    Creando empleado en el reloj destino...
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4 p-5">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                La asignación original en <strong>{editing.sucursal}</strong> / {editing.empresa || "sin empresa"} no se modificará. Sus asistencias históricas permanecerán ligadas al reloj de origen.
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Sucursal destino
                  </label>
                  <select
                    value={copyForm.branch_id}
                    disabled={copyingEmployee}
                    onChange={(e) => seleccionarSucursalDestino(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                  >
                    <option value="">Seleccionar...</option>
                    {sucursales.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Reloj físico destino
                  </label>
                  <select
                    value={copyForm.device_id}
                    disabled={
                      copyingEmployee ||
                      !copyForm.branch_id ||
                      destinationDevices.length === 0
                    }
                    onChange={(e) => seleccionarRelojDestino(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                  >
                    <option value="">
                      {destinationDevices.length === 0
                        ? "Sin otros relojes activos"
                        : "Seleccionar reloj..."}
                    </option>
                    {destinationDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.nombre}
                        {device.empresa ? ` (${device.empresa})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <Field
                  label="UID nueva"
                  value={copyForm.uid}
                  disabled
                  onChange={() => undefined}
                  placeholder={
                    calculatingCopyUid
                      ? "Calculando..."
                      : "Se asignará automáticamente"
                  }
                />

                <Field
                  label="Empresa destino"
                  value={copyForm.empresa}
                  disabled
                  onChange={() => undefined}
                  placeholder="Se asigna según el reloj"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Se copiarán el nombre, rol, área y correo actualmente guardados. Los cambios posteriores serán independientes en cada sucursal y reloj.
              </p>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  disabled={copyingEmployee}
                  onClick={() => setCopyOpen(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={
                    copyingEmployee ||
                    calculatingCopyUid ||
                    !copyForm.device_id
                  }
                  onClick={crearEnOtroReloj}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Crear asignación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        type="text"
        value={value} 
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
      />
    </div>
  );
}