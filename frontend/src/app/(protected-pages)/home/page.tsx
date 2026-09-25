'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type DatabaseInfo = { name: string; size_bytes: number }
type TableInfo = { name: string; kind: string; sql?: string | null }
type ColumnInfo = {
    cid: number
    name: string
    decl_type: string
    notnull: boolean
    default_value?: string | null
    pk: boolean
}

const TOKEN_KEY = 'octor_sqlite_admin_token'

function apiBase(): string {
    if (typeof window === 'undefined') return ''
    return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || ''
}

async function api<T>(
    path: string,
    options: RequestInit & { token?: string | null } = {},
): Promise<T> {
    const { token, ...init } = options
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const res = await fetch(`${apiBase()}${path}`, { ...init, headers })
    if (
        res.headers.get('content-type')?.includes('application/sql') ||
        path.endsWith('.sql')
    ) {
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(
                (data as { message?: string }).message || `HTTP ${res.status}`,
            )
        }
        return (await res.text()) as T
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(
            (data as { message?: string }).message || `HTTP ${res.status}`,
        )
    }
    return data as T
}

function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function cellDisplay(value: unknown): string {
    if (value === null || value === undefined) return 'NULL'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
}

const Page = () => {
    const [token, setToken] = useState<string | null>(null)
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const [databases, setDatabases] = useState<DatabaseInfo[]>([])
    const [selectedDb, setSelectedDb] = useState<string | null>(null)
    const [tables, setTables] = useState<TableInfo[]>([])
    const [selectedTable, setSelectedTable] = useState<string | null>(null)
    const [columns, setColumns] = useState<ColumnInfo[]>([])
    const [rows, setRows] = useState<Record<string, unknown>[]>([])
    const [total, setTotal] = useState(0)
    const [offset, setOffset] = useState(0)
    const [sql, setSql] = useState('SELECT name FROM sqlite_master LIMIT 20;')
    const [sqlResult, setSqlResult] = useState<string>('')

    const [draft, setDraft] = useState<Record<string, string>>({})
    const [editingRowid, setEditingRowid] = useState<number | null>(null)
    const [newTableName, setNewTableName] = useState('')
    const [newTableCols, setNewTableCols] = useState('id INTEGER PRIMARY KEY, name TEXT')
    const [newColName, setNewColName] = useState('')
    const [newColType, setNewColType] = useState('TEXT')

    const limit = 50

    useEffect(() => {
        const saved = window.localStorage.getItem(TOKEN_KEY)
        if (saved) setToken(saved)
    }, [])

    const loadDatabases = useCallback(async (auth: string) => {
        const data = await api<{ databases: DatabaseInfo[] }>('/v1/databases', {
            token: auth,
        })
        setDatabases(data.databases)
    }, [])

    useEffect(() => {
        if (!token) return
        setBusy(true)
        setError(null)
        loadDatabases(token)
            .catch((e: Error) => {
                setError(e.message)
                setToken(null)
                window.localStorage.removeItem(TOKEN_KEY)
            })
            .finally(() => setBusy(false))
    }, [token, loadDatabases])

    const editableColumns = useMemo(
        () => columns.filter((c) => c.name !== '__rowid__'),
        [columns],
    )

    const login = async (e: React.FormEvent) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
            const data = await api<{ token: string }>('/v1/auth/login', {
                method: 'POST',
                body: JSON.stringify({ password }),
            })
            window.localStorage.setItem(TOKEN_KEY, data.token)
            setToken(data.token)
            setPassword('')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha no login')
        } finally {
            setBusy(false)
        }
    }

    const openDb = async (name: string) => {
        if (!token) return
        setBusy(true)
        setError(null)
        setSelectedDb(name)
        setSelectedTable(null)
        setRows([])
        setColumns([])
        setEditingRowid(null)
        try {
            const data = await api<{ tables: TableInfo[] }>(
                `/v1/databases/${encodeURIComponent(name)}/tables`,
                { token },
            )
            setTables(data.tables)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao abrir base')
        } finally {
            setBusy(false)
        }
    }

    const openTable = async (table: string, nextOffset = 0) => {
        if (!token || !selectedDb) return
        setBusy(true)
        setError(null)
        setSelectedTable(table)
        setOffset(nextOffset)
        setEditingRowid(null)
        try {
            const data = await api<{
                columns: ColumnInfo[]
                rows: Record<string, unknown>[]
                total: number
            }>(
                `/v1/databases/${encodeURIComponent(selectedDb)}/tables/${encodeURIComponent(table)}/rows?limit=${limit}&offset=${nextOffset}`,
                { token },
            )
            setColumns(data.columns)
            setRows(data.rows)
            setTotal(data.total)
            const empty: Record<string, string> = {}
            for (const c of data.columns) {
                if (c.name !== '__rowid__') empty[c.name] = ''
            }
            setDraft(empty)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao ler tabela')
        } finally {
            setBusy(false)
        }
    }

    const refreshTable = async () => {
        if (selectedTable) await openTable(selectedTable, offset)
    }

    const runSql = async () => {
        if (!token || !selectedDb) return
        setBusy(true)
        setError(null)
        try {
            const data = await api<{ result: unknown }>(
                `/v1/databases/${encodeURIComponent(selectedDb)}/sql`,
                {
                    method: 'POST',
                    token,
                    body: JSON.stringify({ sql }),
                },
            )
            setSqlResult(JSON.stringify(data.result, null, 2))
            if (selectedTable) await openTable(selectedTable, offset)
            else await openDb(selectedDb)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro no SQL')
        } finally {
            setBusy(false)
        }
    }

    const parseDraftValues = () => {
        const values: Record<string, unknown> = {}
        for (const [k, raw] of Object.entries(draft)) {
            if (raw === '') {
                values[k] = null
                continue
            }
            if (/^-?\d+$/.test(raw)) values[k] = Number(raw)
            else if (/^-?\d+\.\d+$/.test(raw)) values[k] = Number(raw)
            else values[k] = raw
        }
        return values
    }

    const insertRow = async () => {
        if (!token || !selectedDb || !selectedTable) return
        setBusy(true)
        setError(null)
        try {
            await api(
                `/v1/databases/${encodeURIComponent(selectedDb)}/tables/${encodeURIComponent(selectedTable)}/rows`,
                {
                    method: 'POST',
                    token,
                    body: JSON.stringify({ values: parseDraftValues() }),
                },
            )
            await refreshTable()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao inserir')
        } finally {
            setBusy(false)
        }
    }

    const startEdit = (row: Record<string, unknown>) => {
        const rowid = Number(row.__rowid__)
        setEditingRowid(rowid)
        const next: Record<string, string> = {}
        for (const c of editableColumns) {
            const v = row[c.name]
            next[c.name] = v === null || v === undefined ? '' : String(v)
        }
        setDraft(next)
    }

    const saveEdit = async () => {
        if (!token || !selectedDb || !selectedTable || editingRowid == null)
            return
        setBusy(true)
        setError(null)
        try {
            await api(
                `/v1/databases/${encodeURIComponent(selectedDb)}/tables/${encodeURIComponent(selectedTable)}/rows`,
                {
                    method: 'PATCH',
                    token,
                    body: JSON.stringify({
                        rowid: editingRowid,
                        values: parseDraftValues(),
                    }),
                },
            )
            setEditingRowid(null)
            await refreshTable()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao atualizar')
        } finally {
            setBusy(false)
        }
    }

    const deleteRow = async (rowid: number) => {
        if (!token || !selectedDb || !selectedTable) return
        if (!window.confirm(`Apagar rowid ${rowid}?`)) return
        setBusy(true)
        setError(null)
        try {
            await api(
                `/v1/databases/${encodeURIComponent(selectedDb)}/tables/${encodeURIComponent(selectedTable)}/rows`,
                {
                    method: 'DELETE',
                    token,
                    body: JSON.stringify({ rowid }),
                },
            )
            await refreshTable()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao apagar')
        } finally {
            setBusy(false)
        }
    }

    const createTable = async () => {
        if (!token || !selectedDb || !newTableName.trim()) return
        const columns = newTableCols.split(',').map((part) => {
            const bits = part.trim().split(/\s+/)
            const name = bits[0] || 'col'
            const decl_type = bits[1] || 'TEXT'
            const upper = part.toUpperCase()
            return {
                name,
                decl_type,
                primary_key: upper.includes('PRIMARY'),
                notnull: upper.includes('NOT NULL'),
                unique: upper.includes('UNIQUE'),
            }
        })
        setBusy(true)
        setError(null)
        try {
            await api(
                `/v1/databases/${encodeURIComponent(selectedDb)}/schema/tables`,
                {
                    method: 'POST',
                    token,
                    body: JSON.stringify({ table: newTableName.trim(), columns }),
                },
            )
            setNewTableName('')
            await openDb(selectedDb)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao criar tabela')
        } finally {
            setBusy(false)
        }
    }

    const dropTable = async (table: string) => {
        if (!token || !selectedDb) return
        if (!window.confirm(`DROP TABLE "${table}"?`)) return
        setBusy(true)
        setError(null)
        try {
            await api(
                `/v1/databases/${encodeURIComponent(selectedDb)}/schema/tables`,
                {
                    method: 'DELETE',
                    token,
                    body: JSON.stringify({ table }),
                },
            )
            if (selectedTable === table) {
                setSelectedTable(null)
                setRows([])
            }
            await openDb(selectedDb)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao dropar')
        } finally {
            setBusy(false)
        }
    }

    const addColumn = async () => {
        if (!token || !selectedDb || !selectedTable || !newColName.trim()) return
        setBusy(true)
        setError(null)
        try {
            await api(
                `/v1/databases/${encodeURIComponent(selectedDb)}/schema/columns`,
                {
                    method: 'POST',
                    token,
                    body: JSON.stringify({
                        table: selectedTable,
                        column: {
                            name: newColName.trim(),
                            decl_type: newColType.trim() || 'TEXT',
                        },
                    }),
                },
            )
            setNewColName('')
            await openTable(selectedTable, offset)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao adicionar coluna')
        } finally {
            setBusy(false)
        }
    }

    const exportSql = async () => {
        if (!token || !selectedDb) return
        setBusy(true)
        setError(null)
        try {
            const text = await api<string>(
                `/v1/databases/${encodeURIComponent(selectedDb)}/export.sql`,
                { token },
            )
            const blob = new Blob([text], { type: 'application/sql' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${selectedDb.replace(/\.[^.]+$/, '')}-dump.sql`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro no export')
        } finally {
            setBusy(false)
        }
    }

    const columnNames = useMemo(() => {
        if (rows[0]) return Object.keys(rows[0])
        return columns.map((c) => c.name)
    }, [rows, columns])

    if (!token) {
        return (
            <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 px-4">
                <div>
                    <h1 className="text-2xl font-semibold">SQLite Admin</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Painel Octor — substitui o phpLiteAdmin
                    </p>
                </div>
                <form onSubmit={login} className="flex flex-col gap-3">
                    <label className="text-sm font-medium">
                        Senha
                        <input
                            type="password"
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </label>
                    {error && (
                        <p className="text-sm text-red-600" role="alert">
                            {error}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={busy}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                        {busy ? 'Entrando…' : 'Entrar'}
                    </button>
                </form>
            </div>
        )
    }

    return (
        <div className="flex min-h-[80vh] flex-col gap-4 p-4 lg:flex-row">
            <aside className="w-full shrink-0 space-y-4 lg:w-72">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold">SQLite Admin</h1>
                    <button
                        type="button"
                        className="text-xs text-gray-500 underline"
                        onClick={() => {
                            window.localStorage.removeItem(TOKEN_KEY)
                            setToken(null)
                        }}
                    >
                        Sair
                    </button>
                </div>
                {error && (
                    <p className="text-sm text-red-600" role="alert">
                        {error}
                    </p>
                )}
                <section>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Bases
                    </h2>
                    <ul className="space-y-1">
                        {databases.map((db) => (
                            <li key={db.name}>
                                <button
                                    type="button"
                                    onClick={() => openDb(db.name)}
                                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                                        selectedDb === db.name
                                            ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <span className="block truncate font-medium">
                                        {db.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {formatBytes(db.size_bytes)}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
                {selectedDb && (
                    <>
                        <button
                            type="button"
                            onClick={exportSql}
                            disabled={busy}
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-left text-sm hover:bg-gray-50 dark:border-gray-600"
                        >
                            Exportar .sql
                        </button>
                        <section className="space-y-2 rounded-md border border-gray-200 p-2 dark:border-gray-700">
                            <h2 className="text-xs font-semibold uppercase text-gray-500">
                                Nova tabela
                            </h2>
                            <input
                                className="w-full rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                                placeholder="nome"
                                value={newTableName}
                                onChange={(e) => setNewTableName(e.target.value)}
                            />
                            <input
                                className="w-full rounded border px-2 py-1 font-mono text-xs dark:border-gray-600 dark:bg-gray-900"
                                value={newTableCols}
                                onChange={(e) => setNewTableCols(e.target.value)}
                            />
                            <button
                                type="button"
                                disabled={busy}
                                onClick={createTable}
                                className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                            >
                                Criar
                            </button>
                        </section>
                        <section>
                            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Tabelas
                            </h2>
                            <ul className="max-h-80 space-y-1 overflow-auto">
                                {tables.map((t) => (
                                    <li
                                        key={t.name}
                                        className="flex items-center gap-1"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => openTable(t.name)}
                                            className={`min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm ${
                                                selectedTable === t.name
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            {t.name}
                                        </button>
                                        {t.kind === 'table' && (
                                            <button
                                                type="button"
                                                className="text-xs text-red-500"
                                                onClick={() => dropTable(t.name)}
                                                title="DROP"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </>
                )}
            </aside>

            <main className="min-w-0 flex-1 space-y-4">
                {selectedDb && (
                    <section className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <h2 className="mb-2 text-sm font-semibold">SQL</h2>
                        <textarea
                            className="h-28 w-full rounded-md border border-gray-300 bg-white p-2 font-mono text-xs dark:border-gray-600 dark:bg-gray-900"
                            value={sql}
                            onChange={(e) => setSql(e.target.value)}
                        />
                        <button
                            type="button"
                            disabled={busy}
                            onClick={runSql}
                            className="mt-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
                        >
                            Executar
                        </button>
                        {sqlResult && (
                            <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-gray-950 p-3 text-xs text-gray-100">
                                {sqlResult}
                            </pre>
                        )}
                    </section>
                )}

                {selectedTable && (
                    <>
                        <section className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                            <h2 className="mb-2 text-sm font-semibold">
                                {editingRowid == null
                                    ? 'Inserir linha'
                                    : `Editar rowid ${editingRowid}`}
                            </h2>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {editableColumns.map((c) => (
                                    <label key={c.name} className="text-xs">
                                        <span className="font-medium">
                                            {c.name}
                                        </span>
                                        <span className="ml-1 text-gray-400">
                                            {c.decl_type}
                                        </span>
                                        <input
                                            className="mt-0.5 w-full rounded border px-2 py-1 font-mono text-xs dark:border-gray-600 dark:bg-gray-900"
                                            value={draft[c.name] ?? ''}
                                            onChange={(e) =>
                                                setDraft((d) => ({
                                                    ...d,
                                                    [c.name]: e.target.value,
                                                }))
                                            }
                                        />
                                    </label>
                                ))}
                            </div>
                            <div className="mt-2 flex gap-2">
                                {editingRowid == null ? (
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={insertRow}
                                        className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white"
                                    >
                                        Inserir
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={saveEdit}
                                            className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white"
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingRowid(null)}
                                            className="rounded border px-3 py-1.5 text-sm"
                                        >
                                            Cancelar
                                        </button>
                                    </>
                                )}
                            </div>
                            <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                                <label className="text-xs">
                                    Nova coluna
                                    <input
                                        className="mt-0.5 block rounded border px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900"
                                        value={newColName}
                                        onChange={(e) =>
                                            setNewColName(e.target.value)
                                        }
                                        placeholder="nome"
                                    />
                                </label>
                                <label className="text-xs">
                                    Tipo
                                    <input
                                        className="mt-0.5 block rounded border px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900"
                                        value={newColType}
                                        onChange={(e) =>
                                            setNewColType(e.target.value)
                                        }
                                    />
                                </label>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={addColumn}
                                    className="rounded border px-2 py-1 text-xs"
                                >
                                    ALTER ADD
                                </button>
                            </div>
                        </section>

                        <section className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h2 className="text-sm font-semibold">
                                    {selectedTable}{' '}
                                    <span className="font-normal text-gray-500">
                                        ({total} linhas)
                                    </span>
                                </h2>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="text-xs underline disabled:opacity-40"
                                        disabled={offset <= 0 || busy}
                                        onClick={() =>
                                            openTable(
                                                selectedTable,
                                                Math.max(0, offset - limit),
                                            )
                                        }
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        type="button"
                                        className="text-xs underline disabled:opacity-40"
                                        disabled={
                                            offset + limit >= total || busy
                                        }
                                        onClick={() =>
                                            openTable(
                                                selectedTable,
                                                offset + limit,
                                            )
                                        }
                                    >
                                        Próxima
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-auto">
                                <table className="min-w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="px-2 py-1"> </th>
                                            {columnNames.map((c) => (
                                                <th
                                                    key={c}
                                                    className="whitespace-nowrap px-2 py-1 font-semibold"
                                                >
                                                    {c}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, i) => {
                                            const rowid = Number(row.__rowid__)
                                            return (
                                                <tr
                                                    key={i}
                                                    className="border-b border-gray-100 dark:border-gray-800"
                                                >
                                                    <td className="whitespace-nowrap px-2 py-1">
                                                        <button
                                                            type="button"
                                                            className="mr-2 text-emerald-700 underline"
                                                            onClick={() =>
                                                                startEdit(row)
                                                            }
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="text-red-600 underline"
                                                            onClick={() =>
                                                                deleteRow(rowid)
                                                            }
                                                        >
                                                            Apagar
                                                        </button>
                                                    </td>
                                                    {columnNames.map((c) => (
                                                        <td
                                                            key={c}
                                                            className="max-w-xs truncate px-2 py-1 font-mono"
                                                            title={cellDisplay(
                                                                row[c],
                                                            )}
                                                        >
                                                            {cellDisplay(
                                                                row[c],
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                                {!rows.length && (
                                    <p className="py-6 text-center text-sm text-gray-500">
                                        Sem linhas
                                    </p>
                                )}
                            </div>
                        </section>
                    </>
                )}

                {!selectedDb && (
                    <p className="text-sm text-gray-500">
                        Selecione uma base SQLite à esquerda.
                    </p>
                )}
            </main>
        </div>
    )
}

export default Page
