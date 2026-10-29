import { dataSourceKind, type DataSource } from "./source";
import { mockSource } from "./mock/source";
import { apiSource } from "./api/source";
export { DataSourceProvider, useDataSource, dataSourceKind, NotImplementedError } from "./source";
export type { DataSource } from "./source";
/* VITE_DATA_SOURCE=mock|api. 기본은 mock */
export function createDataSource(kind = dataSourceKind()): DataSource { return kind === "api" ? apiSource : mockSource; }
