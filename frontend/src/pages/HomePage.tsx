import { useCursos } from "../hooks/useCursos";
import { useTareas } from "../hooks/useTareas";

function diasRestantes(fechaLimite: string): number {
  const hoy = new Date();
  const limite = new Date(fechaLimite);
  const diff = limite.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ResumenTareas({ tareas }: { tareas: { estado: string }[] }) {
  const total = tareas.length;
  const pendientes = tareas.filter((t) => t.estado === "pendiente").length;
  const enProgreso = tareas.filter((t) => t.estado === "en_progreso").length;
  const completadas = tareas.filter((t) => t.estado === "completada").length;

  return (
    <div className="relative rounded-lg border border-outline-variant bg-surface-container-lowest p-sm opacity-50">
      <span className="absolute -top-2 right-2 rounded-full bg-surface-variant px-xs py-0.5 text-label-md text-on-surface-variant">
        Próximamente
      </span>
      <h2 className="mb-sm font-display text-headline-sm text-on-surface">Resumen de tareas</h2>
      <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
        {[
          { label: "Total", value: total, color: "text-on-surface" },
          { label: "Pendientes", value: pendientes, color: "text-tertiary" },
          { label: "En progreso", value: enProgreso, color: "text-primary" },
          { label: "Completadas", value: completadas, color: "text-secondary" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center rounded-md bg-surface-container p-xs">
            <span className={`text-headline-lg ${color}`}>{value}</span>
            <span className="text-body-sm text-on-surface-variant">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProximosVencimientos({
  tareas,
  cursos,
}: {
  tareas: { id: string; titulo: string; curso_id: string; fecha_limite: string; estado: string }[];
  cursos: { id: string; nombre: string; color: string }[];
}) {
  const pendientes = tareas
    .filter((t) => t.estado !== "completada")
    .sort((a, b) => new Date(a.fecha_limite).getTime() - new Date(b.fecha_limite).getTime())
    .slice(0, 5);
  const cursoMap = new Map(cursos.map((c) => [c.id, c]));

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-sm">
      <h2 className="mb-sm font-display text-headline-sm text-on-surface">Próximos vencimientos</h2>
      {pendientes.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">No hay tareas pendientes.</p>
      ) : (
        <ul className="flex flex-col gap-xs">
          {pendientes.map((t) => {
            const curso = cursoMap.get(t.curso_id);
            const dias = diasRestantes(t.fecha_limite);
            const urgente = dias <= 2;
            return (
              <li key={t.id} className="flex items-center justify-between rounded-md bg-surface-container px-xs py-1">
                <div className="flex items-center gap-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: curso?.color || "var(--color-outline)" }} />
                  <span className="text-body-sm text-on-surface">{t.titulo}</span>
                  {curso && <span className="text-label-md text-on-surface-variant">{curso.nombre}</span>}
                </div>
                <span className={`text-label-md ${urgente ? "text-tertiary font-bold" : "text-on-surface-variant"}`}>
                  {dias <= 0 ? "Hoy" : dias === 1 ? "Mañana" : `${dias} días`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ResumenPorTipo({ tareas, cursos }: { tareas: { tipo: string }[]; cursos: unknown[] }) {
  const tarea = tareas.filter((t) => t.tipo === "tarea").length;
  const examen = tareas.filter((t) => t.tipo === "examen").length;
  const proyecto = tareas.filter((t) => t.tipo === "proyecto").length;

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-sm">
      <h2 className="mb-sm font-display text-headline-sm text-on-surface">Tareas por tipo</h2>
      <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
        {[
          { label: "Cursos", value: cursos.length, color: "text-on-surface" },
          { label: "Tareas", value: tarea, color: "text-on-surface" },
          { label: "Exámenes", value: examen, color: "text-on-surface" },
          { label: "Proyectos", value: proyecto, color: "text-on-surface" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center rounded-md bg-surface-container p-xs">
            <span className={`text-headline-lg ${color}`}>{value}</span>
            <span className="text-body-sm text-on-surface-variant">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CursosAtencion({
  tareas,
  cursos,
}: {
  tareas: { curso_id: string; estado: string }[];
  cursos: { id: string; nombre: string; dificultad: number; color: string }[];
}) {
  const pendientesPorCurso = new Map<string, number>();
  for (const t of tareas) {
    if (t.estado !== "completada") {
      pendientesPorCurso.set(t.curso_id, (pendientesPorCurso.get(t.curso_id) || 0) + 1);
    }
  }

  const ranking = cursos
    .map((c) => ({
      ...c,
      pendientes: pendientesPorCurso.get(c.id) || 0,
      puntuacion: c.dificultad + (pendientesPorCurso.get(c.id) || 0),
    }))
    .filter((c) => c.pendientes > 0)
    .sort((a, b) => b.puntuacion - a.puntuacion)
    .slice(0, 3);

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-sm">
      <h2 className="mb-sm font-display text-headline-sm text-on-surface">Cursos que requieren atención</h2>
      {ranking.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Todos los cursos están al día.</p>
      ) : (
        <ul className="flex flex-col gap-xs">
          {ranking.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-md bg-surface-container px-xs py-1">
              <div className="flex items-center gap-xs">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-body-sm text-on-surface">{c.nombre}</span>
              </div>
              <div className="flex items-center gap-sm">
                <span className="text-label-md text-on-surface-variant">Dificultad: {c.dificultad}/5</span>
                <span className="text-label-md text-tertiary">{c.pendientes} pendientes</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HomePage() {
  const { data: cursos, loading: loadingCursos } = useCursos();
  const { data: tareas, loading: loadingTareas } = useTareas();

  const cargando = loadingCursos || loadingTareas;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-gutter pb-xl">
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-sm">
        <h1 className="font-display text-headline-md text-on-surface">Bienvenido a StudyFlow</h1>
      </div>
      {cargando ? (
        <p className="text-body-sm text-on-surface-variant">Cargando resumen…</p>
      ) : (
        <>
          <ResumenTareas tareas={tareas} />
          <ResumenPorTipo tareas={tareas} cursos={cursos} />
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
            <ProximosVencimientos tareas={tareas} cursos={cursos} />
            <CursosAtencion tareas={tareas} cursos={cursos} />
          </div>
        </>
      )}
    </div>
  );
}
