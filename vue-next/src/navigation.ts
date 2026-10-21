import type { PortalProfile } from './types'
/**
 * Helper para transicionar desde la experiencia Vue hacia cualquier vista legacy.
 * Desmonta instancias Vue activas, sincroniza el estado de navegación en index.html
 * y delega al renderizador legacy nativo (window.render()).
 */
export interface NavigationDisposers {
  disposeHome?: () => void
  disposePanapass?: () => void
  disposeValidatorApp?: () => void
  disposeWorkspace?: () => void
}

export async function navigateToLegacyView(
  moduleId: string,
  callbacks?: NavigationDisposers,
  profile?: PortalProfile | null
): Promise<void> {
  const win = typeof window !== 'undefined' ? (window as any) : (globalThis as any)

  // Salvaguarda: si no hay un perfil autenticado, redirigir limpiamente a login sin lanzar excepción
  const currentProfile = profile || win.state?.profile || win.__RYM_VUE_NEXT_API?.context?.()?.profile
  if (!currentProfile || (!currentProfile.nombre && !currentProfile.email)) {
    callbacks?.disposeHome?.()
    callbacks?.disposePanapass?.()
    callbacks?.disposeValidatorApp?.()
    callbacks?.disposeWorkspace?.()
    if (typeof win.loginView === 'function') {
      win.loginView()
    } else if (typeof win.clearSession === 'function') {
      win.clearSession()
    }
    return
  }

  callbacks?.disposeHome?.()
  callbacks?.disposePanapass?.()
  callbacks?.disposeValidatorApp?.()
  callbacks?.disposeWorkspace?.()

  // Sincroniza state.profile y state.active hacia el closure legacy de index.html
  win.__RYM_VUE_NEXT_API?.setSession?.(currentProfile, moduleId)

  // Respaldo directo en win.state si está expuesto
  if (win.state) {
    win.state.profile = currentProfile
    win.state.active = moduleId
  }

  // Restablece el shell legacy invocando el renderizador nativo
  const shellFn = win.shell
  if (typeof shellFn === 'function') {
    shellFn()

    // Respaldo por evento DOM si el botón está presente en el documento
    if (typeof document !== 'undefined') {
      const button = document.querySelector(`[data-m="${moduleId}"]`) as any
      if (button && typeof button.onclick === 'function') {
        const event = typeof MouseEvent !== 'undefined' ? new MouseEvent('click') : { type: 'click' }
        await button.onclick(event)
        return
      }
    }

    const renderFn = win.render
    if (typeof renderFn === 'function') {
      try {
        await renderFn()
      } catch (err: unknown) {
        if (typeof document !== 'undefined') {
          const v = document.querySelector('#view')
          const msg = err instanceof Error ? err.message : String(err || '')
          if (v) v.innerHTML = `<div class="alert">${msg}</div>`
        }
      }
    }
  }
}
