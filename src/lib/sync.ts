// Motor de sincronización con la nube.
//
// Cada cambio se guarda como una función (d) => d. Para escribir, se aplica sobre la última
// versión confirmada del servidor y se guarda solo si nadie más escribió entremedio
// (compara la versión). Si otro dispositivo se adelantó, se trae lo último y se vuelven a
// aplicar los cambios pendientes encima: así nunca se pisa lo que guardó el otro.

export type EstadoSync = "ok" | "guardando" | "error";

export type Instantanea<T> = { data: T; version: string };

export type Backend<T> = {
  leer: () => Promise<Instantanea<T>>;
  /** Escribe solo si la versión actual es `base`. Devuelve la nueva versión, o null si hubo conflicto. */
  escribir: (data: T, base: string, nueva: string) => Promise<string | null>;
};

type Cambio<T> = { aplicar: (d: T) => T; ids: string[] };

// Al reaplicar un cambio, uid() devuelve los mismos ids que la primera vez
let cinta: { ids: string[]; i: number } | null = null;

const idAleatorio = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const uid = () => {
  if (!cinta) return idAleatorio();
  const id = cinta.ids[cinta.i] ?? idAleatorio();
  if (cinta.i === cinta.ids.length) cinta.ids.push(id);
  cinta.i++;
  return id;
};

const siguienteVersion = (base: string) => {
  const anterior = Date.parse(base);
  return new Date(Math.max(Date.now(), Number.isFinite(anterior) ? anterior + 1 : 0)).toISOString();
};

export class Sincronizador<T> {
  private confirmado: Instantanea<T> | null = null;
  private pendientes: Cambio<T>[] = [];
  private local: T;
  private corriendo = false;
  private quiereRefrescar = false;
  // Escritura que falló sin respuesta (mala señal): puede que sí haya llegado al servidor
  private dudosa: { version: string; cambios: number } | null = null;
  // Con sesión iniciada: se aceptan cambios aunque la nube aún no cargue
  private activo = false;
  private backend: Backend<T>;
  private vacio: T;
  private alCambiar: (data: T) => void;
  private alEstado: (estado: EstadoSync) => void;

  constructor(
    backend: Backend<T>,
    vacio: T,
    alCambiar: (data: T) => void,
    alEstado: (estado: EstadoSync) => void,
  ) {
    this.backend = backend;
    this.vacio = vacio;
    this.alCambiar = alCambiar;
    this.alEstado = alEstado;
    this.local = vacio;
  }

  get listo() {
    return this.confirmado !== null;
  }

  get hayPendientes() {
    return this.pendientes.length > 0;
  }

  get versionConfirmada() {
    return this.confirmado?.version ?? null;
  }

  /** Muestra una copia local mientras carga la nube y empieza a aceptar cambios. */
  mostrarCopia(data: T) {
    this.activo = true;
    if (this.confirmado) return;
    this.local = data;
    this.alCambiar(data);
  }

  /**
   * Aplica un cambio al instante y lo encola para guardarlo. Si la nube aún no carga (mala señal
   * al abrir), el cambio espera y se aplica sobre los datos de la nube apenas lleguen.
   * Devuelve false solo si no hay sesión.
   */
  cambiar(aplicar: (d: T) => T) {
    if (!this.activo) return false;
    const cambio: Cambio<T> = { aplicar, ids: [] };
    this.local = this.ejecutar(cambio, this.local);
    this.pendientes.push(cambio);
    this.alCambiar(this.local);
    void this.correr();
    return true;
  }

  /** Trae la última versión de la nube y guarda lo pendiente. */
  refrescar() {
    this.quiereRefrescar = true;
    return this.correr();
  }

  reiniciar() {
    this.confirmado = null;
    this.pendientes = [];
    this.quiereRefrescar = false;
    this.dudosa = null;
    this.activo = false;
    this.local = this.vacio;
    this.alCambiar(this.vacio);
    this.alEstado("ok");
  }

  private ejecutar(cambio: Cambio<T>, d: T) {
    cinta = { ids: cambio.ids, i: 0 };
    try {
      return cambio.aplicar(d);
    } finally {
      cinta = null;
    }
  }

  private recalcular() {
    if (!this.confirmado) return;
    this.local = this.pendientes.reduce((d, c) => this.ejecutar(c, d), this.confirmado.data);
    this.alCambiar(this.local);
  }

  // Un solo ciclo a la vez, para que lecturas y escrituras nunca se crucen
  private async correr() {
    if (this.corriendo) return;
    this.corriendo = true;
    try {
      while (this.quiereRefrescar || !this.confirmado || this.pendientes.length > 0) {
        if (this.quiereRefrescar || !this.confirmado) {
          this.quiereRefrescar = false;
          this.confirmado = await this.backend.leer();
          // Si la escritura dudosa sí llegó, la nube ya tiene esos cambios: no aplicarlos dos veces
          // (antes esto duplicaba pedidos y cierres, inflando las ventas)
          if (
            this.dudosa &&
            Date.parse(this.dudosa.version) === Date.parse(this.confirmado.version)
          ) {
            this.pendientes = this.pendientes.slice(this.dudosa.cambios);
          }
          this.dudosa = null;
          this.recalcular();
          continue;
        }
        this.alEstado("guardando");
        const lote = this.pendientes.slice();
        const base = this.confirmado;
        const nuevo = lote.reduce((d, c) => this.ejecutar(c, d), base.data);
        const nueva = siguienteVersion(base.version);
        this.dudosa = { version: nueva, cambios: lote.length };
        const version = await this.backend.escribir(nuevo, base.version, nueva);
        this.dudosa = null;
        if (version === null) {
          // Otro dispositivo guardó antes: traer lo suyo y reaplicar lo nuestro encima
          this.quiereRefrescar = true;
          continue;
        }
        this.confirmado = { data: nuevo, version };
        this.pendientes = this.pendientes.slice(lote.length);
      }
      this.alEstado("ok");
    } catch {
      // Antes de reintentar hay que releer la nube (y ver si la escritura dudosa llegó)
      this.quiereRefrescar = true;
      this.alEstado(this.pendientes.length > 0 || !this.confirmado ? "error" : "ok");
    } finally {
      this.corriendo = false;
    }
  }
}
