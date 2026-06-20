export interface Estudio {
  grupo: string;
  casos_actuales: number;
  total_monto: number;
  casos_asignados_mes: number;
}

export interface Cartera {
  empresa: string;
  estudios: Estudio[];
}

export interface DashboardResponse {
  mes: number;
  anio: number;
  carteras: Cartera[];
}

export interface Movimiento {
  id: number;
  id_empresa: string;
  nombre_empresa: string;
  grupo_origen: string;
  grupo_destino: string;
  cantidad_movimiento: number;
  mueve_cgmsv: boolean;
  mueve_mercurius: boolean;
  reparte_varios: boolean;
  estado_rotacion: string;
  fecha_rotacion: string | null;
  fecha_creacion: string;
}

export interface MovimientosResponse {
  total: number;
  movimientos: Movimiento[];
}

export interface HistorialItem {
  id: number;
  id_empresa: number;
  nombre_empresa: string;
  grupo_origen: string;
  grupo_destino: string;
  cantidad_movida: number;
  fecha_ejecucion: string;
  mes: number;
  anio: number;
}

export interface HistoricoResponse {
  total: number;
  historico: HistorialItem[];
}

export interface MovimientosMesDetalle {
  nombre_empresa: string;
  grupo_origen: string;
  grupo_destino: string;
  total_movidos: number;
  cantidad_ejecuciones: number;
}

export interface MovimientosMesResponse {
  mes: number;
  anio: number;
  totales: {
    total_casos_movidos: number;
    empresas_procesadas: number;
    total_ejecuciones: number;
  };
  detalle: MovimientosMesDetalle[];
}
