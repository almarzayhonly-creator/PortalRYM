export interface PortalApiContext {
  profile: { id?: string; nombre?: string; email?: string; rol?: string; galera?: string } | null
  modules: string[]
}

type PortalApi = {
  context: () => PortalApiContext
  hasModule: (code: string) => boolean
  call: <T = Record<string, unknown>>(name: string, body?: Record<string, unknown>) => Promise<T>
  rpc: <T = unknown>(name: string, body?: Record<string, unknown>) => Promise<T>
  viewContext: () => { today: string | null; isAdmin: boolean }
}

function hostApi(): PortalApi {
  const api = window.__RYM_VUE_NEXT_API as PortalApi | undefined
  if (!api) throw new Error('La sesión del portal no está conectada con Vue. Recarga e inténtalo de nuevo.')
  return api
}

export const portalContext = (): PortalApiContext => hostApi().context()
export const hasPortalModule = (code: string): boolean => hostApi().hasModule(code)
export const callPortalFunction = <T = Record<string, unknown>>(name: string, body: Record<string, unknown> = {}): Promise<T> => hostApi().call<T>(name, body)
export const callPortalRpc = <T = unknown>(name: string, body: Record<string, unknown> = {}): Promise<T> => hostApi().rpc<T>(name, body)
export const portalViewContext = (): { today: string | null; isAdmin: boolean } => hostApi().viewContext()
