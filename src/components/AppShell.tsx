import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, TriangleAlert, X } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { timecoreApi } from "@/lib/api/timecore";

type NoticePosition = {
  x: number;
  y: number;
};

type SyncLogRow = {
  time: string;
  message: string;
};

type SyncLogEventDetail = {
  title?: string;
  rows?: SyncLogRow[];
  mode?: "replace" | "append";
  instant?: boolean;
};

function getCurrentTime() {
  return new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [showSyncNotice, setShowSyncNotice] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("timecore-sync-notice-hidden") !== "true";
  });

  const [showSyncNoticeMessage, setShowSyncNoticeMessage] = useState(false);
  const [syncingAllDevices, setSyncingAllDevices] = useState(false);
  const [syncLogRows, setSyncLogRows] = useState<SyncLogRow[]>(() => {
    if (typeof window === "undefined") return [];

    const savedRows = window.localStorage.getItem("timecore-sync-log-rows");

    if (!savedRows) return [];

    try {
      return JSON.parse(savedRows) as SyncLogRow[];
    } catch {
      return [];
    }
  });
  const [syncLogTitle, setSyncLogTitle] = useState(() => {
    if (typeof window === "undefined") {
      return "Sincronización realizada con éxito";
    }

    return (
      window.localStorage.getItem("timecore-sync-log-title") ??
      "Sincronización realizada con éxito"
    );
  });
  const [showSyncLog, setShowSyncLog] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("timecore-sync-log-visible") === "true";
  });
  const [syncLogPosition, setSyncLogPosition] = useState<NoticePosition>(() => {
    if (typeof window === "undefined") {
      return { x: 16, y: 560 };
    }

    const savedPosition = window.localStorage.getItem(
      "timecore-sync-log-position"
    );

    if (!savedPosition) {
      return {
        x: 16,
        y: Math.max(16, window.innerHeight - 220),
      };
    }

    try {
      return JSON.parse(savedPosition) as NoticePosition;
    } catch {
      return {
        x: 16,
        y: Math.max(16, window.innerHeight - 220),
      };
    }
  });
  const [isDraggingSyncLog, setIsDraggingSyncLog] = useState(false);
  const syncLogDragOffsetRef = useRef<NoticePosition>({ x: 0, y: 0 });
  const syncLogSequenceRef = useRef(0);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("timecore-sidebar-collapsed") === "true";
  });

  const [noticePosition, setNoticePosition] = useState<NoticePosition>(() => {
    if (typeof window === "undefined") {
      return { x: 300, y: 150 };
    }

    const savedPosition = window.sessionStorage.getItem("timecore-sync-notice-position");

    if (!savedPosition) {
      return { x: 300, y: 150 };
    }

    try {
      return JSON.parse(savedPosition) as NoticePosition;
    } catch {
      return { x: 300, y: 150 };
    }
  });

  const [isDraggingNotice, setIsDraggingNotice] = useState(false);
  const dragOffsetRef = useRef<NoticePosition>({ x: 0, y: 0 });
  const dragStartRef = useRef<NoticePosition>({ x: 0, y: 0 });
  const noticeWasDraggedRef = useRef(false);

  function dismissSyncNotice() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("timecore-sync-notice-hidden", "true");
    }

    setShowSyncNotice(false);
  }

  function startDraggingNotice(e: MouseEvent<HTMLDivElement>) {
    e.preventDefault();

    dragOffsetRef.current = {
      x: e.clientX - noticePosition.x,
      y: e.clientY - noticePosition.y,
    };

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
    };

    noticeWasDraggedRef.current = false;
    setIsDraggingNotice(true);
  }

  
  function toggleSyncNoticeMessage() {
    if (noticeWasDraggedRef.current) {
      noticeWasDraggedRef.current = false;
      return;
    }

    setShowSyncNoticeMessage((value) => !value);
  }

  function sincronizarTodosLosRelojes(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();

    const confirmar = window.confirm(
      "Esta acción puede tomar tiempo. ¿Deseas continuar?"
    );

    if (!confirmar) return;

    setSyncingAllDevices(true);

    timecoreApi
      .sincronizarTodosLosRelojes()
      .then((res) => {
        const data = res.data ?? {};
        const syncedDevices = Number(data.synced_devices ?? 0);
        const failedDevices = Number(data.failed_devices ?? 0);

        const failedList = Array.isArray(data.failed)
          ? data.failed
          : Array.isArray(data.failed_devices_list)
            ? data.failed_devices_list
            : [];

        const failedRows: SyncLogRow[] = failedList.map(
          (device: any) => {
            const deviceName = String(
              device.device_name ??
                device.name ??
                device.device ??
                "Reloj sin nombre"
            );

            const deviceIp = String(
              device.ip ?? device.device_ip ?? ""
            ).trim();

            const reason = String(
              device.error ??
                device.message ??
                device.reason ??
                ""
            ).trim();

            const deviceLabel = deviceIp
              ? `${deviceName} (${deviceIp})`
              : deviceName;

            return {
              time: getCurrentTime(),
              message: reason
                ? `No sincronizado: ${deviceLabel} — ${reason}`
                : `No sincronizado: ${deviceLabel}`,
            };
          }
        );

        const rows: SyncLogRow[] = [
          {
            time: getCurrentTime(),
            message: `Relojes sincronizados: ${syncedDevices}`,
          },
          {
            time: getCurrentTime(),
            message: `Relojes no sincronizados: ${failedDevices}`,
          },
          ...failedRows,
        ];

        if (failedDevices > 0 && failedRows.length === 0) {
          rows.push({
            time: getCurrentTime(),
            message:
              "No fue posible obtener el nombre de los relojes que fallaron.",
          });
        }

        showSyncLogMessages({
          title:
            failedDevices > 0
              ? "Sincronización finalizada con errores"
              : "Sincronización realizada con éxito",
          rows,
        });
      })
      .catch((err) => {
        console.error("Error sincronizando todos los relojes:", err);

        showSyncLogMessages({
          title: "Error de sincronización",
          rows: [
            {
              time: getCurrentTime(),
              message:
                "No se pudo completar la sincronización de los relojes.",
            },
          ],
        });
      })
      .finally(() => {
        setSyncingAllDevices(false);
      });
  }

  function showSyncLogMessages(detail: SyncLogEventDetail) {
    const rows = detail.rows ?? [];
    const mode = detail.mode ?? "replace";
    const instant = detail.instant ?? false;

    if (detail.title) {
      setSyncLogTitle(detail.title);
    }

    setShowSyncLog(true);

    if (mode === "append") {
      if (rows.length === 0) return;

      if (instant) {
        setSyncLogRows((currentRows) => [...currentRows, ...rows]);
        return;
      }

      const sequence = syncLogSequenceRef.current;

      rows.forEach((row, index) => {
        window.setTimeout(() => {
          if (sequence !== syncLogSequenceRef.current) return;
          setSyncLogRows((currentRows) => [...currentRows, row]);
        }, index * 250);
      });

      return;
    }

    syncLogSequenceRef.current += 1;
    const sequence = syncLogSequenceRef.current;
    setSyncLogRows([]);

    if (rows.length === 0) return;

    if (instant) {
      setSyncLogRows(rows);
      return;
    }

    rows.forEach((row, index) => {
      window.setTimeout(() => {
        if (sequence !== syncLogSequenceRef.current) return;
        setSyncLogRows((currentRows) => [...currentRows, row]);
      }, index * 650);
    });
  }

  useEffect(() => {
    function handleSyncLog(event: Event) {
      const detail = (event as CustomEvent<SyncLogEventDetail>).detail;

      showSyncLogMessages(detail);
    }

    window.addEventListener("timecore:sync-log", handleSyncLog);

    return () => {
      window.removeEventListener("timecore:sync-log", handleSyncLog);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      "timecore-sidebar-collapsed",
      String(sidebarCollapsed)
    );
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      "timecore-sync-log-visible",
      String(showSyncLog)
    );
  }, [showSyncLog]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      "timecore-sync-log-title",
      syncLogTitle
    );
  }, [syncLogTitle]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      "timecore-sync-log-rows",
      JSON.stringify(syncLogRows)
    );
  }, [syncLogRows]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      "timecore-sync-log-position",
      JSON.stringify(syncLogPosition)
    );
  }, [syncLogPosition]);

  useEffect(() => {
    if (!isDraggingSyncLog) return;

    function handleMouseMove(e: globalThis.MouseEvent) {
      const logWidth = 360;
      const logHeight = 190;

      setSyncLogPosition({
        x: Math.max(
          8,
          Math.min(
            e.clientX - syncLogDragOffsetRef.current.x,
            window.innerWidth - logWidth - 8
          )
        ),
        y: Math.max(
          8,
          Math.min(
            e.clientY - syncLogDragOffsetRef.current.y,
            window.innerHeight - logHeight - 8
          )
        ),
      });
    }

    function handleMouseUp() {
      setIsDraggingSyncLog(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSyncLog]);

  useEffect(() => {
    if (!isDraggingNotice) return;

    function handleMouseMove(e: globalThis.MouseEvent) {
      const movedX = Math.abs(e.clientX - dragStartRef.current.x);
      const movedY = Math.abs(e.clientY - dragStartRef.current.y);

      if (movedX > 4 || movedY > 4) {
        noticeWasDraggedRef.current = true;
      }

      const nextPosition = {
        x: Math.max(16, Math.min(e.clientX - dragOffsetRef.current.x, window.innerWidth - 96)),
        y: Math.max(16, Math.min(e.clientY - dragOffsetRef.current.y, window.innerHeight - 96)),
      };

      setNoticePosition(nextPosition);
    }

    function handleMouseUp() {
      setIsDraggingNotice(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingNotice]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.sessionStorage.setItem(
      "timecore-sync-notice-position",
      JSON.stringify(noticePosition)
    );
  }, [noticePosition]);

  function startDraggingSyncLog(e: MouseEvent<HTMLDivElement>) {
    e.preventDefault();

    syncLogDragOffsetRef.current = {
      x: e.clientX - syncLogPosition.x,
      y: e.clientY - syncLogPosition.y,
    };

    setIsDraggingSyncLog(true);
  }

  function closeSyncLog() {
    setShowSyncLog(false);

    if (typeof window !== "undefined") {
      window.localStorage.setItem("timecore-sync-log-visible", "false");
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <style>
        {`
          @keyframes timecoreFloat {
            0%, 100% {
              transform: translateY(0) rotate(-1deg);
            }
            50% {
              transform: translateY(-8px) rotate(1deg);
            }
          }

          @keyframes timecorePulse {
            0%, 100% {
              box-shadow: 0 14px 28px rgba(234, 179, 8, 0.28), 0 0 0 0 rgba(234, 179, 8, 0.35);
            }
            50% {
              box-shadow: 0 18px 38px rgba(234, 179, 8, 0.42), 0 0 0 10px rgba(234, 179, 8, 0);
            }
          }

          @keyframes timecoreMessageIn {
            from {
              opacity: 0;
              transform: translateX(-8px) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
          }

          @keyframes timecoreRowIn {
            from {
              opacity: 0;
              transform: translateY(6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      {showSyncNotice && (
        <div
          onMouseDown={startDraggingNotice}
          className={`fixed z-50 select-none transition-transform duration-200 ${
            isDraggingNotice
              ? "cursor-grabbing scale-110 rotate-3"
              : "cursor-grab"
          }`}
          style={{
            left: `${noticePosition.x}px`,
            top: `${noticePosition.y}px`,
            animation: isDraggingNotice
              ? "none"
              : "timecoreFloat 3.2s ease-in-out infinite",
          }}
        >
          {showSyncNoticeMessage && (
            <div
              className="absolute left-20 top-1 w-80 rounded-2xl border border-warning/30 bg-card p-4 shadow-xl"
              style={{ animation: "timecoreMessageIn 180ms ease-out" }}
            >
              <div className="absolute -left-2 top-6 h-4 w-4 rotate-45 border-b border-l border-warning/30 bg-card" />

              <p className="text-sm font-semibold text-foreground">
                Se recomienda que sincronice los relojes disponibles
              </p>

              <button
                type="button"
                disabled={syncingAllDevices}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={sincronizarTodosLosRelojes}
                className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    syncingAllDevices ? "animate-spin" : ""
                  }`}
                />
                {syncingAllDevices
                  ? "Sincronizando..."
                  : "Sincronizar todos los relojes"}
              </button>

              <p className="mt-1 text-xs text-muted-foreground">
                Para consultar asistencias recientes, sincronice los relojes antes de revisar o exportar registros.
              </p>

            </div>
          )}

          <button
            type="button"
            onClick={toggleSyncNoticeMessage}
            aria-label="Mostrar u ocultar recomendación"
            className="flex h-16 w-16 items-center justify-center rounded-full border border-yellow-500/40 bg-yellow-400 text-black ring-4 ring-yellow-400/20 transition-transform hover:scale-105 active:scale-95"
            style={{
              animation: isDraggingNotice
                ? "none"
                : "timecorePulse 2.4s ease-in-out infinite",
            }}
          >
            <TriangleAlert className="h-9 w-9" strokeWidth={2.8} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={dismissSyncNotice}
            aria-label="Cerrar aviso"
            className="absolute -right-1 -top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-destructive/20 bg-destructive text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showSyncLog && (
        <div
          className="fixed z-50 w-[360px] overflow-hidden rounded-md border border-border bg-card text-xs shadow-xl"
          style={{
            left: `${syncLogPosition.x}px`,
            top: `${syncLogPosition.y}px`,
          }}
        >
          <div
            onMouseDown={startDraggingSyncLog}
            className={`flex select-none items-center justify-between border-b border-border bg-muted/70 px-3 py-1.5 ${
              isDraggingSyncLog ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <p className="font-semibold text-foreground">{syncLogTitle}</p>

            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={closeSyncLog}
              className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Cerrar resumen de sincronizacion"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <table className="w-full table-fixed">
            <thead className="bg-background text-[11px] text-muted-foreground">
              <tr>
                <th className="w-20 border-r border-border px-2 py-1 text-left font-medium">
                  Tiempo
                </th>
                <th className="px-2 py-1 text-left font-medium">Mensaje</th>
              </tr>
            </thead>

            <tbody>
              {syncLogRows.map((row, index) => (
                <tr
                  key={`${row.time}-${index}`}
                  className="border-t border-border"
                  style={{ animation: "timecoreRowIn 220ms ease-out both" }}
                >
                  <td className="border-r border-border px-2 py-1 font-mono text-muted-foreground">
                    {row.time}
                  </td>
                  <td className="truncate px-2 py-1 text-foreground">
                    {row.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader title={title} subtitle={subtitle} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}