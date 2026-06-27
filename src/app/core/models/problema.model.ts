export interface Problema {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  categoriaId: number;
  categoriaNombre?: string;
  empresaId?: number;
  empresaNombre?: string;
}

export interface ProblemaRequest {
  nombre: string;
  descripcion?: string;
  categoriaId: number;
}

export interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
